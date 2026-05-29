import fs from 'fs';
import mammoth from 'mammoth';

// -------------------------------------------------------------
// ORIGINAL PARSER LOGIC
// -------------------------------------------------------------
function extractSameLineOptionsOriginal(text) {
  let matches = Array.from(text.matchAll(/\(([a-eA-E])\)\s*([^\s].*?)(?=\s+\(([a-eA-E])\)|$)/g));
  if (matches.length > 0) {
    return matches.map(m => ({ letter: m[1], val: m[2], full: m[0] }));
  }

  matches = Array.from(text.matchAll(/(?:\s|^)([a-eA-E])\)\s*([^\s].*?)(?=\s+[a-eA-E]\)|$)/g));
  if (matches.length > 0) {
    return matches.map(m => ({ letter: m[1], val: m[2], full: m[0].trim() }));
  }

  matches = Array.from(text.matchAll(/(?:\s|^)([a-eA-E])\.\s+([^\s].*?)(?=\s+[a-eA-E]\.|$)/g));
  if (matches.length > 0) {
    return matches.map(m => ({ letter: m[1], val: m[2], full: m[0].trim() }));
  }

  return [];
}

function parseTextToQuestionsOriginal(text) {
  const lines = text.split(/\r?\n/);
  const questionsList = [];
  let currentQuestion = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const questionMatch = trimmed.match(/^(?:question\s*(\d+)[:.]?|(\d+)[\s.)\]:-]+)\s*(.+)/i);
    if (questionMatch) {
      if (currentQuestion) {
        questionsList.push(currentQuestion);
      }
      
      const restOfText = questionMatch[3].trim();
      currentQuestion = {
        questionText: restOfText,
        options: [],
        correctAnswer: "",
        questionType: "multiple-choice",
        difficulty: "medium",
        points: 1,
      };

      const optMatches = extractSameLineOptionsOriginal(restOfText);
      if (optMatches.length > 0) {
        const firstOptIndex = restOfText.indexOf(optMatches[0].full);
        currentQuestion.questionText = restOfText.substring(0, firstOptIndex).trim();
        for (const m of optMatches) {
          currentQuestion.options.push(`(${m.letter.toLowerCase()}) ${m.val.trim()}`);
        }
      }
      continue;
    }

    if (!currentQuestion) continue;

    const answerMatch = trimmed.match(/^\s*(?:correct\s*|key\s*|correct\s*option\s*)?ans(?:wer)?\s*[:.-]+\s*(.+)/i);
    if (answerMatch) {
      currentQuestion.correctAnswer = answerMatch[1].trim();
      continue;
    }

    const optMatches = Array.from(trimmed.matchAll(/(?:\(?([a-eA-E])\)?[\s.)\]:-]+)\s*([^\s].*?)(?=\s+(?:\(?([a-eA-E])\)?[\s.)\]:-]+)|$)/g));
    if (optMatches.length > 0) {
      for (const m of optMatches) {
        const letter = m[1].toUpperCase();
        const optionVal = m[2].trim();
        currentQuestion.options.push(`(${letter.toLowerCase()}) ${optionVal}`);
      }
      continue;
    }

    if (currentQuestion.options.length === 0 && !currentQuestion.correctAnswer) {
      currentQuestion.questionText += "\n" + trimmed;
    }
  }

  if (currentQuestion) {
    questionsList.push(currentQuestion);
  }

  return questionsList.map(q => {
    const lowerOpts = q.options.map(o => o.toLowerCase());
    const isTrueFalse = q.options.length === 2 &&
      lowerOpts.some(o => o.includes("true")) &&
      lowerOpts.some(o => o.includes("false"));

    if (isTrueFalse) {
      q.questionType = "true-false";
      q.options = undefined;
    } else if (q.options.length === 0) {
      q.questionType = "theory";
      q.options = undefined;
      if (!q.correctAnswer) q.correctAnswer = "Theory Question";
    }

    return q;
  });
}

// -------------------------------------------------------------
// NEW PARSER LOGIC
// -------------------------------------------------------------
function extractSameLineOptionsNew(text) {
  let matches = Array.from(text.matchAll(/\(([a-eA-E])\)\s*([^\s].*?)(?=\s+\(([a-eA-E])\)|$)/g));
  if (matches.length > 0) {
    return matches.map(m => ({ letter: m[1], val: m[2], full: m[0] }));
  }

  matches = Array.from(text.matchAll(/(?:\s|^)([a-eA-E])\)\s*([^\s].*?)(?=\s+[a-eA-E]\)|$)/g));
  if (matches.length > 0) {
    return matches.map(m => ({ letter: m[1], val: m[2], full: m[0].trim() }));
  }

  // Resilient: \.\s* instead of \.\s+
  matches = Array.from(text.matchAll(/(?:\s|^)([a-eA-E])\.\s*([^\s].*?)(?=\s+[a-eA-E]\.|$)/g));
  if (matches.length > 0) {
    return matches.map(m => ({ letter: m[1], val: m[2], full: m[0].trim() }));
  }

  return [];
}

function parseTextToQuestionsNew(text) {
  const lines = text.split(/\r?\n/);
  const questionsList = [];
  let currentQuestion = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const questionMatch = trimmed.match(/^(?:question\s*(\d+)[:.]?|(\d+)[\s.)\]:-]+)\s*(.+)/i);
    if (questionMatch) {
      if (currentQuestion) {
        questionsList.push(currentQuestion);
      }
      
      const restOfText = questionMatch[3].trim();
      currentQuestion = {
        questionText: restOfText,
        options: [],
        correctAnswer: "",
        questionType: "multiple-choice",
        difficulty: "medium",
        points: 1,
      };

      const optMatches = extractSameLineOptionsNew(restOfText);
      if (optMatches.length > 0) {
        const firstOptIndex = restOfText.indexOf(optMatches[0].full);
        currentQuestion.questionText = restOfText.substring(0, firstOptIndex).trim();
        for (const m of optMatches) {
          currentQuestion.options.push(`(${m.letter.toLowerCase()}) ${m.val.trim()}`);
        }
      }
      continue;
    }

    if (!currentQuestion) continue;

    // Resilient answer match: allow = and make separator optional
    const answerMatch = trimmed.match(/^\s*(?:correct\s*|key\s*|correct\s*option\s*)?ans(?:wer)?\s*[:.=-]*\s*(.+)/i);
    if (answerMatch) {
      currentQuestion.correctAnswer = answerMatch[1].trim();
      continue;
    }

    // Extremely robust check: only parse option if it actually starts with a valid option prefix
    const isOptionStart = /^\s*(?:\(([a-eA-E])\)|([a-eA-E])[.)\]:-]+)/i.test(trimmed);
    if (isOptionStart) {
      const optMatches = Array.from(trimmed.matchAll(/(?:\(?([a-eA-E])\)?[\s.)\]:-]+)\s*([^\s].*?)(?=\s+(?:\(?([a-eA-E])\)?[\s.)\]:-]+)|$)/g));
      if (optMatches.length > 0) {
        for (const m of optMatches) {
          const letter = m[1].toUpperCase();
          const optionVal = m[2].trim();
          currentQuestion.options.push(`(${letter.toLowerCase()}) ${optionVal}`);
        }
        continue;
      }
    }

    if (currentQuestion.options.length === 0 && !currentQuestion.correctAnswer) {
      currentQuestion.questionText += "\n" + trimmed;
    }
  }

  if (currentQuestion) {
    questionsList.push(currentQuestion);
  }

  return questionsList.map(q => {
    const lowerOpts = q.options.map(o => o.toLowerCase());
    const isTrueFalse = q.options.length === 2 &&
      lowerOpts.some(o => o.includes("true")) &&
      lowerOpts.some(o => o.includes("false"));

    if (isTrueFalse) {
      q.questionType = "true-false";
      q.options = undefined;
    } else if (q.options.length === 0) {
      q.questionType = "theory";
      q.options = undefined;
      if (!q.correctAnswer) q.correctAnswer = "Theory Question";
    }

    return q;
  });
}

// Run test on a real document!
const docxPath = 'c:\\Users\\PC\\Fia-Cbt-main\\fgsigbohocbtv1\\Exam Question\\Economics SS1.docx';

async function run() {
  try {
    const result = await mammoth.extractRawText({ path: docxPath });
    const text = result.value;

    console.log('Total extracted text length:', text.length);
    console.log('--- Extracted Text Sample (First 350 chars) ---');
    console.log(text.substring(0, 350).replace(/\n/g, ' [NL] '));
    console.log('-----------------------------------------------\n');

    console.time('Original Parser');
    const originalQuestions = parseTextToQuestionsOriginal(text);
    console.timeEnd('Original Parser');
    console.log('Original Parser parsed:', originalQuestions.length, 'questions.');

    console.time('New Parser');
    const newQuestions = parseTextToQuestionsNew(text);
    console.timeEnd('New Parser');
    console.log('New Parser parsed:', newQuestions.length, 'questions.');

    console.log('\n--- Comparing a parsed question between both ---');
    const targetIndex = Math.min(2, newQuestions.length - 1);
    if (targetIndex >= 0) {
      console.log('=== Original Parser Output ===');
      console.log(JSON.stringify(originalQuestions[targetIndex], null, 2));
      console.log('=== New Parser Output ===');
      console.log(JSON.stringify(newQuestions[targetIndex], null, 2));
    }

  } catch (error) {
    console.error('Error running test:', error);
  }
}

run();
