import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { schoolCalendarSchema, calendarAssignment, resultPeriod } from '../shared/school-calendar';
import { parseCsv, questionCsv, importQuestionErrors } from '../shared/question-import';
import { parseTextToQuestions } from '../shared/question-text-parser';
import { extractDocument } from '../server/docx-reader';

const calendar = schoolCalendarSchema.parse([{ session: '2026/2027', term: 'First Term', start: '2026-09-01', end: '2026-12-18' }]);
assert.equal(calendarAssignment('2026-08-31T23:00:00Z', calendar)?.session, '2026/2027');
assert.equal(calendarAssignment('2026-12-18T22:59:59Z', calendar)?.term, 'First Term');
assert.equal(calendarAssignment('2026-12-18T23:00:00Z', calendar), undefined);
assert.equal(resultPeriod({ completedAt: '2026-10-01', academicSession: '2025/2026', academicTerm: 'Third Term' }, calendar)?.session, '2025/2026');
assert.equal(schoolCalendarSchema.safeParse([...calendar, { ...calendar[0], term: 'Second Term' }]).success, false);
assert.equal(schoolCalendarSchema.safeParse([{ ...calendar[0], start: '2026-02-30' }]).success, false);
const question = { questionText: 'Read "this", then\nchoose.', questionType: 'multiple-choice', points: 2, options: ['(a) One, "two"\nthree', '(b) Four'], correctAnswer: '(b) Four' };
const csv = parseCsv(questionCsv([question]));
assert.equal(csv[1][0], question.questionText);
assert.deepEqual(JSON.parse(csv[1][3]), question.options);
assert.throws(() => parseCsv('"unclosed'));
assert.deepEqual(importQuestionErrors(question), []);
assert.ok(importQuestionErrors({ ...question, correctAnswer: '' }).length);
assert.ok(importQuestionErrors({ ...question, options: {} }).length);
const parsed = parseTextToQuestions('1. Pick one\nA. One\nB. Two\n2. The sky is blue\nA. True\nB. False\nAnswer key:\n1. B\n2. A');
assert.equal(parsed.length, 2);
assert.equal(parsed[0].correctAnswer, 'B');
assert.equal(parsed[1].correctAnswer, 'True');
assert.equal(parseTextToQuestions('1. Pick\nA. One\nB. Two')[0].correctAnswer, '');
await assert.rejects(extractDocument(Buffer.from('bad'), 'bad.docx'));
await assert.rejects(extractDocument(Buffer.alloc(5 * 1024 * 1024 + 1), 'large.doc'));
// Optional upstream fixtures: pass a .doc and a .docx path to exercise real binary files.
for (const file of process.argv.slice(2)) {
  const text = await extractDocument(await fs.readFile(file), file);
  assert.ok(text.trim().length > 0);
  console.log(`Extracted ${file}: ${text.length} characters`);
}
console.log('Calendar boundaries, snapshots, CSV round trips, answer keys and upload validation passed.');
