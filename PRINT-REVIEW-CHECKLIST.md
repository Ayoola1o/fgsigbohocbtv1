# Admin printout review

Calculation policy: latest completed attempt per student/exam; equal weighting across available terms; missing results displayed as N/A, never silently scored zero. Annual rankings compare annual student averages within the same class (and department when selected).

- [x] 1. Share assigned-question and weighted-point calculations across result slips and subject sheets.
- [x] 2. Use stable exam identities, consistent repeat-attempt selection, term aggregation and comparable rankings.
- [x] 3. Require explicit student/exam selection; guard loading/error states; distinguish missing and incomplete attempts.
- [x] 4. Use school settings for identity, academic session, signatures, score format and passing threshold.
- [x] 5. Render exam-paper content and share reliable print preparation; correct pagination and page margins.
- [ ] 6. Verify calculation edge cases, TypeScript and production build; record any remaining limitations.


Validation and limitations

- Calculation fixture passed: assigned questions only, weighted points, historical-score fallback, deterministic latest attempts, test-attempt exclusion, available-term averaging.
- Production build passed. Final TypeScript validation recorded separately in the task response.
- Browser/PDF visual inspection is still outstanding; page margins, repeated table headers and report boundaries are implemented but not visually certified.
- Historical question details are not snapshotted. If recorded points cannot be reconciled, print the saved overall score rather than a fabricated subject breakdown.
- Academic-year and branding snapshots do not exist on results. Headers use current school settings; annual reports aggregate recorded terms, and cannot distinguish multiple historical academic years without a schema/data migration.
- No production data or schema was changed.

Remaining verification: visual print preview for all report types. Automated calculation checks and production build have passed.
