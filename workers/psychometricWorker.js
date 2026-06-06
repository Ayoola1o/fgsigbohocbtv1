function calculatePsychometrics(workerData) {
  const {
    selectedExamId,
    termFilter,
    classFilter,
    subjectFilter,
    studentFilter,
    allResults,
    allQuestions,
    allExams,
    allStudents,
    allExamSessions
  } = workerData;

  // 1. Setup Maps for lookup speed
  const examMap = new Map(allExams.map(e => [e.id, e]));
  const studentMap = new Map();
  allStudents.forEach(s => {
    if (s.studentId) {
      studentMap.set(s.studentId.toLowerCase().trim(), s);
    }
  });
  const questionMap = new Map(allQuestions.map(q => [q.id, q]));
  const sessionMap = new Map((allExamSessions || []).map(s => [s.id, s]));

  // 2. Filter Results & Questions based on dynamic dashboard filters
  const filteredResults = allResults.filter(r => {
    const exam = examMap.get(r.examId);
    const student = studentMap.get(r.studentId?.toLowerCase().trim());
    
    // Student ID Filter
    if (studentFilter && studentFilter !== "__all__") {
      const sId = student?.studentId || r.studentId || "";
      if (sId.toLowerCase().trim() !== studentFilter.toLowerCase().trim()) {
        return false;
      }
    }

    // Exam ID Filter
    if (selectedExamId && selectedExamId !== "__all__" && r.examId !== selectedExamId) {
      return false;
    }
    // Term Filter
    if (termFilter && termFilter !== "__all__") {
      const examTerm = exam?.term || "First Term";
      if (examTerm !== termFilter) return false;
    }
    // Class Filter
    if (classFilter && classFilter !== "__all__") {
      const studentClass = student?.classLevel || exam?.classLevel;
      if (studentClass !== classFilter) return false;
    }
    // Subject Filter
    if (subjectFilter && subjectFilter !== "__all__") {
      const examSubject = exam?.subject || "";
      if (!examSubject.includes(subjectFilter)) return false;
    }
    return true;
  });

  const activeQuestions = selectedExamId === "__all__"
    ? allQuestions.filter(q => {
        if (classFilter && classFilter !== "__all__" && q.classLevel !== classFilter) return false;
        if (subjectFilter && subjectFilter !== "__all__" && !q.subject.includes(subjectFilter)) return false;
        if (termFilter && termFilter !== "__all__" && q.term !== termFilter) return false;
        return true;
      })
    : allQuestions.filter(q => {
        const activeExam = examMap.get(selectedExamId);
        return activeExam?.questionIds?.includes(q.id);
      });

  const totalCandidates = filteredResults.length;

  // ─── 1. STUDENT PASS PROBABILITY PREDICTOR ───
  const studentPredictions = [];
  let atRiskCount = 0;
  let warningCount = 0;
  let safeCount = 0;

  // Group all results by studentId for historical tracking
  const resultsByStudent = new Map();
  allResults.forEach(r => {
    if (!r.studentId) return;
    const key = r.studentId.toLowerCase().trim();
    const list = resultsByStudent.get(key) || [];
    list.push(r);
    resultsByStudent.set(key, list);
  });

  // Calculate probability for each unique student in the dataset
  allStudents.forEach(student => {
    const sKey = student.studentId.toLowerCase().trim();
    const sResults = resultsByStudent.get(sKey) || [];
    
    // Filter student results matching class if filtered
    const classFilteredResults = classFilter && classFilter !== "__all__"
      ? sResults.filter(r => {
          const ex = examMap.get(r.examId);
          return (student.classLevel === classFilter || ex?.classLevel === classFilter);
        })
      : sResults;

    let historicalAvg = 50;
    let recentAvg = 50;
    let focusFactor = 100;

    if (classFilteredResults.length > 0) {
      // Historical Average
      const sum = classFilteredResults.reduce((acc, r) => acc + (Number(r.percentage) || 0), 0);
      historicalAvg = Math.round(sum / classFilteredResults.length);

      // Recent Trajectory (Last 3 exams)
      const sorted = [...classFilteredResults].sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });
      const recent = sorted.slice(0, 3);
      const recentSum = recent.reduce((acc, r) => acc + (Number(r.percentage) || 0), 0);
      recentAvg = Math.round(recentSum / recent.length);

      // Focus Index
      let totalSwitches = 0;
      let telemetryCount = 0;
      classFilteredResults.forEach(r => {
        if (r.telemetry && typeof r.telemetry.tabSwitches === 'number') {
          totalSwitches += r.telemetry.tabSwitches;
          telemetryCount++;
        }
      });
      const avgSwitches = telemetryCount > 0 ? (totalSwitches / telemetryCount) : 0;
      focusFactor = Math.max(0, 100 - Math.round(avgSwitches * 10));
    }

    const passProbability = Math.round(historicalAvg * 0.6 + recentAvg * 0.3 + focusFactor * 0.1);
    
    let status = "Safe";
    if (passProbability < 50) {
      status = "Critical";
      atRiskCount++;
    } else if (passProbability < 70) {
      status = "Warning";
      warningCount++;
    } else {
      safeCount++;
    }

    studentPredictions.push({
      name: student.name,
      studentId: student.studentId,
      classLevel: student.classLevel,
      department: student.department || "General",
      passProbability,
      status,
      historicalAvg,
      recentAvg,
      focusFactor
    });
  });

  const cohortPassProbability = studentPredictions.length > 0
    ? Math.round(((safeCount + warningCount) / studentPredictions.length) * 100)
    : 0;


  // ─── 2. COGNITIVE FATIGUE & PACING TRAJECTORY ───
  let fatiguedCount = 0;
  const pacingRecords = [];

  filteredResults.forEach(r => {
    const session = sessionMap.get(r.sessionId);
    const exam = examMap.get(r.examId);
    const qIds = session?.sessionQuestionIds || exam?.questionIds || [];
    
    if (qIds.length < 4) return; // Need at least 4 questions to compare first vs last 25%

    const segmentCount = Math.max(1, Math.floor(qIds.length * 0.25));
    const firstQIds = qIds.slice(0, segmentCount);
    const lastQIds = qIds.slice(-segmentCount);

    const checkStats = (targetIds) => {
      let correct = 0;
      let totalTime = 0;
      targetIds.forEach(qId => {
        if (r.correctAnswers && r.correctAnswers[qId] === true) correct++;
        const t = r.telemetry?.timeSpentPerQuestion?.[qId] || 0;
        totalTime += Number(t);
      });
      return {
        accuracy: Math.round((correct / targetIds.length) * 100),
        speed: Math.round((totalTime / targetIds.length) * 10) / 10 // avg seconds per question
      };
    };

    const firstStats = checkStats(firstQIds);
    const lastStats = checkStats(lastQIds);

    // Fatigued if accuracy dropped AND they rushed (less time spent per question)
    const isFatigued = lastStats.accuracy < firstStats.accuracy && lastStats.speed < firstStats.speed;
    if (isFatigued) fatiguedCount++;

    pacingRecords.push({
      studentName: r.studentName,
      studentId: r.studentId,
      examTitle: exam?.title || "Exam",
      classLevel: studentMap.get(r.studentId?.toLowerCase().trim())?.classLevel || exam?.classLevel || "SS3",
      subject: exam?.subject || "General",
      firstAccuracy: firstStats.accuracy,
      firstSpeed: firstStats.speed,
      lastAccuracy: lastStats.accuracy,
      lastSpeed: lastStats.speed,
      isFatigued
    });
  });

  const cognitiveFatigueRate = pacingRecords.length > 0
    ? Math.round((fatiguedCount / pacingRecords.length) * 100)
    : 0;


  // ─── 3. EXAM CHEATING & COLLUSION SIMILARITY INDEX ───
  const collusionPairs = [];
  const studentMaxCollusion = new Map();

  // O(N^2) collusion checks within exams
  const resultsByExamId = new Map();
  filteredResults.forEach(r => {
    const list = resultsByExamId.get(r.examId) || [];
    list.push(r);
    resultsByExamId.set(r.examId, list);
  });

  resultsByExamId.forEach((resultsList, eId) => {
    const examObj = examMap.get(eId);
    if (resultsList.length < 2) return;

    for (let i = 0; i < resultsList.length; i++) {
      for (let j = i + 1; j < resultsList.length; j++) {
        const A = resultsList[i];
        const B = resultsList[j];

        // Find incorrect questions they both answered
        const commonMissed = [];
        if (A.correctAnswers && B.correctAnswers) {
          Object.keys(A.answers || {}).forEach(qId => {
            if (A.correctAnswers[qId] === false && B.correctAnswers[qId] === false) {
              commonMissed.push(qId);
            }
          });
        }

        if (commonMissed.length >= 3) {
          let identicalMisses = 0;
          commonMissed.forEach(qId => {
            if (A.answers[qId] === B.answers[qId]) {
              identicalMisses++;
            }
          });
          
          const collusionIndex = Math.round((identicalMisses / commonMissed.length) * 100) / 100;
          
          if (collusionIndex >= 0.6) {
            collusionPairs.push({
              studentA: A.studentName,
              studentIdA: A.studentId,
              studentB: B.studentName,
              studentIdB: B.studentId,
              examTitle: examObj?.title || "Exam",
              commonMissedCount: commonMissed.length,
              identicalMisses,
              index: collusionIndex
            });

            // Update student max collusion index
            const maxA = studentMaxCollusion.get(A.studentId) || 0;
            if (collusionIndex > maxA) studentMaxCollusion.set(A.studentId, collusionIndex);

            const maxB = studentMaxCollusion.get(B.studentId) || 0;
            if (collusionIndex > maxB) studentMaxCollusion.set(B.studentId, collusionIndex);
          }
        }
      }
    }
  });

  // Score integrity bands
  let integrityCriticalCount = 0;
  let integritySuspiciousCount = 0;
  let integritySecureCount = 0;
  const integrityStudentsLog = [];

  filteredResults.forEach(r => {
    const maxColl = studentMaxCollusion.get(r.studentId) || 0;
    const tabSwitches = r.telemetry?.tabSwitches || 0;
    
    // Calculate rapid guessing (<2.5s) on correct answers
    let rapidGuessCount = 0;
    if (r.telemetry?.timeSpentPerQuestion) {
      Object.entries(r.telemetry.timeSpentPerQuestion).forEach(([qId, timeSec]) => {
        if (r.correctAnswers?.[qId] === true && Number(timeSec) < 2.5) {
          rapidGuessCount++;
        }
      });
    }

    let integrityStatus = "Secure";
    if (maxColl >= 0.75 || tabSwitches >= 6 || rapidGuessCount >= 5) {
      integrityStatus = "Critical";
      integrityCriticalCount++;
    } else if (maxColl >= 0.60 || tabSwitches >= 3 || rapidGuessCount >= 2) {
      integrityStatus = "Suspicious";
      integritySuspiciousCount++;
    } else {
      integritySecureCount++;
    }

    // Build timeline details dynamically
    const timeline = [];
    timeline.push({ time: "0:00", event: "Session initialized successfully", type: "info" });
    
    if (tabSwitches > 0) {
      for (let i = 1; i <= tabSwitches; i++) {
        timeline.push({
          time: `${Math.min(i * 3, 20)}:15`,
          event: `Screen blur / Window tab switch detected (Flag #${i})`,
          type: "warning"
        });
      }
    }

    if (rapidGuessCount > 0) {
      timeline.push({
        time: "15:40",
        event: `${rapidGuessCount} question(s) answered in <2.5s (Rapid Guessing Flag)`,
        type: "danger"
      });
    }

    if (maxColl >= 0.60) {
      timeline.push({
        time: "Post-Submission",
        event: `Answer collusion flagged (Index: ${Math.round(maxColl * 100)}% choice similarity)`,
        type: "danger"
      });
    }

    timeline.push({ time: "Graded", event: `Exam completed. Score: ${r.percentage}%`, type: "success" });

    integrityStudentsLog.push({
      studentName: r.studentName,
      studentId: r.studentId,
      examId: r.examId,
      examTitle: examMap.get(r.examId)?.title || "Exam",
      tabSwitches,
      rapidGuesses: rapidGuessCount,
      maxCollusion: maxColl,
      status: integrityStatus,
      timeline
    });
  });


  // ─── 4. CLASS & SUBJECT GRADE DISTRIBUTION (BELL CURVE) ───
  let mean = 0;
  let stdDev = 0;
  let skewness = 0;
  const bellCurvePoints = [];
  const histogramBuckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${(i + 1) * 10}%`,
    count: 0
  }));

  if (totalCandidates > 0) {
    const percentages = filteredResults.map(r => Number(r.percentage) || 0);
    const sum = percentages.reduce((acc, p) => acc + p, 0);
    mean = sum / totalCandidates;

    // Standard Deviation
    const sqDiffSum = percentages.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0);
    stdDev = Math.sqrt(sqDiffSum / totalCandidates);

    // Skewness
    let cubedDiffSum = percentages.reduce((acc, p) => acc + Math.pow(p - mean, 3), 0);
    skewness = stdDev > 0 ? (cubedDiffSum / totalCandidates) / Math.pow(stdDev, 3) : 0;

    // Populate Histogram
    percentages.forEach(p => {
      const bucketIdx = Math.min(Math.floor(p / 10), 9);
      histogramBuckets[bucketIdx].count++;
    });

    // Bell Curve coordinates (Normal distribution density)
    for (let x = 0; x <= 100; x += 5) {
      let density = 0;
      if (stdDev > 0) {
        density = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
      } else if (Math.round(mean) === x) {
        density = 1; // absolute peak
      }
      bellCurvePoints.push({ score: x, density: Math.round(density * 100000) / 100000 });
    }
  }


  // ─── 5. QUESTION ITEM ANALYSIS (PSYCHOMETRICS LEDGER) ───
  const answersByQuestion = new Map();
  const correctByQuestion = new Map();
  
  filteredResults.forEach(r => {
    if (r.answers) {
      Object.entries(r.answers).forEach(([qId, choice]) => {
        const list = answersByQuestion.get(qId) || [];
        list.push(choice);
        answersByQuestion.set(qId, list);
      });
    }
    if (r.correctAnswers) {
      Object.entries(r.correctAnswers).forEach(([qId, isCorrect]) => {
        const list = correctByQuestion.get(qId) || [];
        list.push(isCorrect === true);
        correctByQuestion.set(qId, list);
      });
    }
  });

  // Calculate Cronbach's Alpha for internal consistency of the exam context
  let cronbachAlpha = 0.7; // fallback
  if (activeQuestions.length > 1 && totalCandidates > 2) {
    let sumQuestionVariances = 0;
    activeQuestions.forEach(q => {
      const corrects = correctByQuestion.get(q.id) || [];
      const correctCount = corrects.filter(c => c === true).length;
      const p = corrects.length > 0 ? (correctCount / corrects.length) : 0.5;
      const qVar = p * (1 - p); // binary score variance
      sumQuestionVariances += qVar;
    });

    const studentTotalScores = filteredResults.map(r => {
      let score = 0;
      activeQuestions.forEach(q => {
        if (r.correctAnswers && r.correctAnswers[q.id] === true) {
          score += Number(q.points) || 1;
        }
      });
      return score;
    });

    const sumTotalScores = studentTotalScores.reduce((a, b) => a + b, 0);
    const scoreMean = sumTotalScores / totalCandidates;
    const totalScoreVar = studentTotalScores.reduce((acc, s) => acc + Math.pow(s - scoreMean, 2), 0) / totalCandidates;

    if (totalScoreVar > 0) {
      const k = activeQuestions.length;
      cronbachAlpha = (k / (k - 1)) * (1 - (sumQuestionVariances / totalScoreVar));
      cronbachAlpha = Math.max(-1, Math.min(1, cronbachAlpha)); // clamp
    }
  }

  const itemAnalysisSpreadsheet = activeQuestions.map(q => {
    const corrects = correctByQuestion.get(q.id) || [];
    const totalCount = corrects.length;
    const correctCount = corrects.filter(c => c === true).length;

    // 1. Difficulty Index (p-value)
    const pIndex = totalCount > 0 ? (correctCount / totalCount) : 0.5;
    let difficultyStatus = "Sweet Spot";
    if (pIndex > 0.85) difficultyStatus = "Easy";
    else if (pIndex < 0.20) difficultyStatus = "Hard";

    // 2. Discrimination Index (D-Index: Top 27% vs Bottom 27% of filtered scorers)
    const sortedScorers = [...filteredResults].sort((a, b) => b.percentage - a.percentage);
    const sliceCount = Math.max(1, Math.floor(sortedScorers.length * 0.27));
    const topScorers = sortedScorers.slice(0, sliceCount);
    const bottomScorers = sortedScorers.slice(-sliceCount);

    const getCorrectRate = (group) => {
      if (group.length === 0) return 0;
      const hits = group.filter(r => r.correctAnswers && r.correctAnswers[q.id] === true).length;
      return hits / group.length;
    };

    const dIndex = getCorrectRate(topScorers) - getCorrectRate(bottomScorers);
    let discriminationStatus = "Useless";
    if (dIndex > 0.35) discriminationStatus = "Excellent";
    else if (dIndex >= 0.20) discriminationStatus = "Good";
    else if (dIndex < 0) discriminationStatus = "Flawed (Negative)";

    // 3. Distractor selection rates
    const selections = answersByQuestion.get(q.id) || [];
    const selectionCounts = {};
    if (q.options && Array.isArray(q.options)) {
      q.options.forEach(opt => {
        selectionCounts[opt] = 0;
      });
    }
    selections.forEach(sel => {
      if (selectionCounts[sel] !== undefined) {
        selectionCounts[sel]++;
      } else {
        selectionCounts[sel] = 1;
      }
    });

    const choicesPercentage = {};
    Object.entries(selectionCounts).forEach(([choice, count]) => {
      choicesPercentage[choice] = selections.length > 0 ? Math.round((count / selections.length) * 100) : 0;
    });

    return {
      id: q.id,
      questionText: q.questionText,
      subject: q.subject,
      classLevel: q.classLevel,
      term: q.term,
      difficulty: q.difficulty,
      pIndex: Math.round(pIndex * 100) / 100,
      dIndex: Math.round(dIndex * 100) / 100,
      difficultyStatus,
      discriminationStatus,
      choicesPercentage,
      totalAttempts: totalCount
    };
  });
  return {
    cohortPassProbability,
    atRiskCount,
    safeCount,
    warningCount,
    studentPredictions,
    cognitiveFatigueRate,
    pacingRecords,
    collusionPairs,
    integrityCriticalCount,
    integritySuspiciousCount,
    integritySecureCount,
    integrityStudentsLog,
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    skewness: Math.round(skewness * 100) / 100,
    bellCurvePoints,
    histogramBuckets,
    cronbachAlpha: Math.round(cronbachAlpha * 100) / 100,
    itemAnalysis: itemAnalysisSpreadsheet,
    totalCandidates
  };
}

// Export for main thread/inline calculation fallback
module.exports = { calculatePsychometrics };

// Conditionally hook into worker thread if available
try {
  const wt = require("worker_threads");
  if (!wt.isMainThread && wt.parentPort) {
    try {
      const computed = calculatePsychometrics(wt.workerData);
      wt.parentPort.postMessage(computed);
    } catch (err) {
      wt.parentPort.postMessage({ error: err.message || String(err) });
    }
  }
} catch (e) {
  // worker_threads require fails (e.g. in Vercel/serverless/bundler environments), ignore
}
