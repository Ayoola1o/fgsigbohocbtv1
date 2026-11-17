# Calendar and Word import rollout

The earlier print fixes were pushed as `f4e57f7`. This change adds calendar-based report scoping and Word import safeguards. It does not migrate or relabel production records automatically.

## Deployment order

1. Back up the database and approve the additive SQL in `migrations/0001_academic_calendar.sql`.
2. Apply that migration before deploying this application's new build. Existing data is retained; new result/exam fields are nullable.
3. In School Settings, enter the current academic session and calendar rows for each term, including historical sessions needed for reports. Dates are inclusive in Nigeria time. Duplicate terms and overlapping ranges are rejected.
4. Verify representative historic results against their completion dates. Unmatched results remain excluded from session reports with a warning; do not invent dates or assign them to the current year. New exams require a configured session/term and new attempts/results retain that assignment.
5. Deploy and verify one student result, session broadsheet, annual report and Word import preview. Historical branding and question content remain unsnapshotted; existing saved-score fallback remains in effect.

## Word to CBT workflow

- Upload `.doc` or `.docx` (maximum 5 MB), or paste text. Both manual and AI paths use server-side extraction compatible with memory uploads on Vercel.
- Manual parsing supports numbered questions, labelled options, inline answer lines and a separate `Answer key:`/`Answers` section with entries such as `1. B`. Review unusual layouts before import.
- AI accepts up to 50,000 text characters, processes two chunks at a time, shares answer-key context and has a 45-second request deadline. A configured Gemini key is required; errors leave the draft available for manual parsing.
- Review/edit text, options, question type, points and answer keys. Missing objective answers block import; neither parser intentionally supplies guessed keys. AI output still requires human review.
- Export CSV from the preview or import reviewed questions directly. CSV quoting preserves commas, quotes, newlines and JSON options. Server validation checks every row before bulk insertion begins.
- Extraction is text-only. Attach diagrams separately and check equations against the original document. Scans require OCR; encrypted/corrupt documents must be repaired or their text pasted.
- CSV export can contain unfinished draft rows; required-answer validation runs when importing them.

## Validation

`scripts/check-calendar-import.ts` covers date boundaries, immutable result assignment, calendar overlap rejection, CSV round trips, missing answers, separate answer keys, and invalid/oversized documents. Optional file arguments exercise real Word files. Binary `.doc` and `.docx` upstream fixtures were extracted successfully. Live Gemini calls and authenticated browser printing still require a deployment smoke test.
