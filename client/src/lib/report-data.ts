import type { Result, Question, Exam } from '@shared/schema';

export const studentKey = (id: string) => id.trim().toLowerCase();
export function latestAttempts<T extends Result>(results: T[]): T[] {
  const latest = new Map<string, T>();
  for (const result of results) {
    if (result.isTestAttempt) continue;
    const key = JSON.stringify([studentKey(result.studentId), result.examId]);
    const previous = latest.get(key);
    if (!previous || new Date(result.completedAt).getTime() > new Date(previous.completedAt).getTime() ||
      (new Date(result.completedAt).getTime() === new Date(previous.completedAt).getTime() && result.id > previous.id)) latest.set(key, result);
  }
  return Array.from(latest.values());
}

// Only graded question IDs establish the assigned paper. Never substitute the exam pool.
export function resultBreakdown(result: Result, questions: Question[], exam?: Exam) {
  const ids = Object.keys(result.correctAnswers || {});
  const byId = new Map(questions.map(q => [q.id, q]));
  if (!ids.length || ids.some(id => !byId.has(id))) return [{
    subject: exam?.title || 'Recorded overall result', questions: result.totalPoints,
    correct: result.score, percentage: result.percentage,
  }];
  const groups = new Map<string, { subject: string; questions: number; correct: number; percentage: number }>();
  for (const id of ids) {
    const q = byId.get(id)!;
    const key = q.subject.trim().toLowerCase();
    const group = groups.get(key) || { subject: q.subject.trim(), questions: 0, correct: 0, percentage: 0 };
    group.questions += q.points;
    if (result.correctAnswers[id]) group.correct += q.points;
    groups.set(key, group);
  }
  const rows = Array.from(groups.values());
  // Changed question weights cannot rewrite historical grades.
  if (rows.reduce((n, r) => n + r.questions, 0) !== result.totalPoints || rows.reduce((n, r) => n + r.correct, 0) !== result.score)
    return [{ subject: exam?.title || 'Recorded overall result', questions: result.totalPoints, correct: result.score, percentage: result.percentage }];
  return rows.map(row => ({ ...row, percentage: row.questions ? row.correct / row.questions * 100 : 0 }));
}

export function termScores(results: Result[], exams: Exam[], questions: Question[]) {
  const groups = new Map<string, { subject: string; term: string; score: number; total: number; percentage: number }>();
  for (const result of latestAttempts(results)) {
    const exam = exams.find(e => e.id === result.examId);
    if (!exam) continue;
    for (const row of resultBreakdown(result, questions, exam)) {
      const key = JSON.stringify([row.subject.toLowerCase(), (result.academicTerm || exam.term)]);
      const group = groups.get(key) || { subject: row.subject, term: (result.academicTerm || exam.term), score: 0, total: 0, percentage: 0 };
      group.score += row.correct; group.total += row.questions;
      group.percentage = group.total ? group.score / group.total * 100 : 0;
      groups.set(key, group);
    }
  }
  return Array.from(groups.values());
}

export function annualScores(results: Result[], exams: Exam[], questions: Question[]) {
  const terms = termScores(results, exams, questions);
  return Array.from(new Set(terms.map(row => row.subject))).map(subject => {
    const rows = terms.filter(row => row.subject === subject && ['First Term', 'Second Term', 'Third Term'].includes(row.term));
    return { subject, rows, percentage: rows.length ? rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length : null };
  }).filter(row => row.percentage !== null);
}
