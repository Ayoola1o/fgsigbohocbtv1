Got it — that multi-subject exam printing requirement is domain-specific, so I've spelled it out carefully so the agent doesn't misinterpret it. Here's the updated full prompt:

---

**Prompt:**

"Act as a senior fullstack engineer. I want you to audit and fix the **Results page** in our React admin panel (handles exam results and related result types).

**Step 1 — Plan**
Before writing any code, explore the codebase and produce a task list covering:

**A. Bulk Operations**
1. Confirm there's no multi-select + bulk delete on the Results table. Add it.

**B. Printing / Export Operations**
2. **Print results by subject for a class** — generate a printable report of all students' scores in a specific subject, for a specific class.
3. **Print a single student's result** — full result sheet for one student, for a specific exam/term.
4. **Print subject-level results within a Multi-Subject Exam** — this is domain-specific, read carefully:
   - A "Multiple Exam" (e.g., "Multi Exam A") is a single exam entity that bundles several subjects together (e.g., Math, English, Physics, Chemistry) — students take all subjects under one exam record.
   - I need the ability to select **one subject** within that Multi-Exam (e.g., Math) and print the scores for **that subject only**, for **all students in a class** who took that Multi-Exam.
   - This means the print/export logic must be able to filter down from: `Multi-Exam → specific subject → specific class → all students`, not just export the whole multi-exam at once.
   - Verify the data model supports querying scores at the (multi-exam, subject, class) level. If subjects aren't currently queryable independently within a multi-exam record, flag this as a data-model gap before implementing.

**C. Sorting & Filtering**
5. Sorting: by student name, score (asc/desc), subject, class, exam, date.
6. Filtering: by class, subject, exam type (single vs. multi-exam), term/session, score range, pass/fail status.

**D. Data Lifecycle**
7. **Purging of old/test data** — admin needs a way to identify and delete stale results created during testing/development (e.g., filter by date range, "test" flag, or dummy student/class markers), with a preview step before permanent deletion.

**E. General Gap Review** — also check for:
   - Bulk export (CSV/PDF) as a separate concern from printing
   - Confirmation modals for destructive actions; soft-delete/undo instead of hard delete
   - Role-based permissions on print/export/delete/purge actions
   - Audit log for edits, deletions, and purges
   - Pagination for large result sets
   - Loading, error, and empty states
   - Responsive/mobile behavior
   - Accessibility (keyboard selection, ARIA labels)
   - Code quality: component reusability, state management, API error handling, TypeScript coverage
   - Any other admin-side result operations you'd expect in a school/exam management system that are currently missing (e.g., result approval/publishing workflow, grade/GPA computation, ranking/position-in-class, comment/remark fields, result locking after publishing)

Present all of this as a checklist/task list, grouped by category (Bulk Ops, Printing, Sorting/Filtering, Data Lifecycle, Other Gaps), so I can review and prioritize before you write code.

**Step 2 — Implement**
Once I approve the task list, implement fixes starting with highest priority. For printing features specifically:
- Build reusable print/export templates (don't duplicate logic per print type)
- Ensure the Multi-Exam subject-level print correctly scopes to (exam → subject → class) and doesn't leak other subjects' scores
- Wire everything to real backend endpoints; if an endpoint doesn't exist (e.g., for subject-level querying within a multi-exam), flag it and propose the API contract rather than guessing

Keep existing functionality working. Match existing design system and patterns already in the codebase.

**Step 3 — Verify**
- Screenshot/walkthrough proving: bulk delete works, each print type produces correct scoped output (especially the multi-exam subject filter), sorting/filtering work, purge preview works before deletion
- Confirm no existing functionality broke
- Note any data-model or API assumptions made

**Output**: task list first, wait for my go-ahead, then implement, then show verification artifacts."

---

One thing worth double-checking with the agent early: it should confirm whether your database already stores subject-level scores as separate rows/records under a multi-exam (which makes this easy), or if scores are stored as one blob per multi-exam per student (which would need a schema change first). That's the single biggest risk in this list — worth having it report back before it starts building.


----------------------------------------------------------------


Here's a review prompt tailored for the **Question Bank page** in your CBT app, following the same Antigravity-friendly structure:

---

**Prompt:**

"Act as a senior fullstack engineer. I want you to audit and fix the **Question Bank page** in our CBT (Computer-Based Testing) admin panel.

**Step 1 — Plan**
Before writing any code, explore the codebase and produce a task list covering:

**A. Bulk Operations**
1. Confirm if multi-select + bulk delete exists for questions. Add it if missing.
2. Bulk import questions (CSV/Excel/Word template) — with a preview/validation step before committing.
3. Bulk export questions (with or without answers, for backup or sharing).
4. Bulk tagging/categorization (assign subject, topic, difficulty to multiple questions at once).
5. Bulk move/copy questions between question banks or subjects.

**B. Question Data Model & Types**
6. Confirm support for multiple question types: MCQ (single/multi-answer), true/false, fill-in-the-blank, essay/theory, matching, ordering.
7. Media support: images, diagrams, audio, math formulas (LaTeX/MathML) — confirm rendering works in both the admin preview and the actual exam-taking view.
8. Answer key management: correct answer(s), partial credit/scoring rules, explanation/rationale field for review.
9. Difficulty level and mark/point value per question.
10. Duplicate detection — flag or prevent near-identical questions being added twice.

**C. Organization & Discoverability**
11. Filtering: by subject, topic, difficulty, question type, tag, date added, author/creator.
12. Sorting: by date, difficulty, usage frequency, subject.
13. Search: keyword search across question text and tags.
14. Pagination for large question banks.

**D. Question Lifecycle & Governance**
15. Approval/review workflow — draft → pending review → approved/published, especially if multiple staff can add questions.
16. Versioning — track edits to a question over time (important if a question is already used in a past exam; editing it shouldn't silently change historical results).
17. Usage tracking — show which exams/tests a question has been used in, and how many times, so admins know the impact before editing/deleting.
18. Locking — prevent edits/deletion of a question that's currently attached to an active/ongoing exam.
19. Randomization settings — if the app pulls random questions from the bank per student, confirm the pool size/rules are configurable and visible here.

**E. Data Lifecycle**
20. Purging old/test/dummy questions created during development or testing — with a preview step before permanent deletion (same as the Results page).
21. Archive vs. hard delete — should retired questions be archived instead of deleted outright?

**F. General Gap Review** — also check for:
- Confirmation modals for destructive actions (delete, bulk delete, purge)
- Role-based permissions (who can create/edit/approve/delete questions)
- Audit log (who added/edited/deleted which question, and when)
- Loading, error, and empty states
- Responsive/mobile behavior
- Accessibility (keyboard navigation, screen-reader labels for question editor)
- Code quality: component reusability (especially across question types), state management, API error handling, TypeScript coverage
- Analytics: question performance stats (e.g., % of students who got it right, discrimination index) if applicable to your app
- Preview mode — ability to preview a question exactly as a student would see it in the exam UI, before publishing

Present all of this as a checklist/task list, grouped by category (Bulk Ops, Data Model, Organization, Lifecycle/Governance, Data Purging, Other Gaps), so I can review and prioritize before you write code.

**Step 2 — Implement**
Once I approve the task list, implement fixes starting with highest priority. Pay special attention to:
- Not breaking the link between existing questions and past exam results when editing/versioning
- Ensuring bulk import validates question format/structure before committing to the database
- Wiring features to real backend endpoints; if an endpoint doesn't exist, flag it and propose the API contract rather than guessing

Keep existing functionality working. Match existing design system and patterns already in the codebase.

**Step 3 — Verify**
- Screenshot/walkthrough proving: bulk delete works, bulk import validates and reports errors correctly, filtering/sorting/search work, purge preview works before deletion, question preview renders correctly for each question type
- Confirm no existing functionality broke (especially exams that reference existing questions)
- Note any data-model or API assumptions made

**Output**: task list first, wait for my go-ahead, then implement, then show verification artifacts."

---

One thing worth flagging to the agent early, same as before: it should confirm whether questions are **directly embedded** in exam records or **referenced by ID** from a central bank. If they're embedded, editing a question in the bank won't retroactively fix/break past exams — but if they're referenced, editing a "live" question could silently alter historical exam integrity. That's the biggest risk point here.



----------------------------------------------------------------



Here's the review prompt for the **Exam Creation / Admin Exam page**, built around the features you've already added (multi-subject exams, question randomization, per-subject question count settings):

---

**Prompt:**

"Act as a senior fullstack engineer. I want you to audit and improve the **Exam Creation / Admin Exam page** in our CBT app.

**Existing features to review (confirm they work correctly, then look for gaps):**
1. **Multi-Subject Exam creation** — combining multiple subjects (e.g., Math, English, Physics, Chemistry) into a single exam entity.
2. **Randomize questions** — pulling random questions from the question bank per student.
3. **Per-subject question count** — setting how many questions to pull from each subject inside a multi-subject exam (e.g., 20 Math, 20 English, 15 Physics, 15 Chemistry).

**Step 1 — Plan**
Before writing any code, explore the codebase and produce a task list covering:

**A. Validate Existing Features**
1. Confirm randomization actually pulls a *different* random set per student (not the same shuffled set for everyone) — and that it respects the per-subject question count.
2. Confirm the question pool per subject is large enough relative to the requested count (e.g., don't let an admin ask for 20 questions from a subject that only has 12 in the bank) — add a validation/warning for this.
3. Confirm randomization is seeded/logged somehow, so if a dispute arises ("I got harder questions than my classmate"), you can trace which questions a specific student received.

**B. Exam Configuration Gaps** — check for and add if missing:
4. **Duration/timing**: overall exam time limit, and optionally per-subject time limit within a multi-subject exam.
5. **Scheduling**: start date/time, end date/time, and whether late entry is allowed.
6. **Scoring rules**: marks per question (uniform or per-question), negative marking for wrong answers, pass mark/grade boundaries.
7. **Attempt rules**: number of allowed attempts, whether to keep best/latest/average score.
8. **Question navigation rules**: can students skip/go back, or is it locked forward-only per subject/section.
9. **Shuffle answer options** (not just question order) — to reduce copying between adjacent students.
10. **Subject sequencing in multi-subject exams**: fixed order (Math must be done before English) vs. student's choice of order.
11. **Auto-submit on time expiry** and handling of network disconnects/browser refresh mid-exam (session recovery).

**C. Targeting & Access Control**
12. **Class/group assignment** — which classes/students are eligible to take this exam.
13. **Retake/exemption list** — ability to exclude specific students or add extra attempts for specific students.
14. **Exam access code/password**, if needed for controlled environments.
15. **Proctoring settings**, if applicable (webcam monitoring, tab-switch detection, fullscreen lock) — flag as a gap if not present and relevant to your use case.

**D. Question Bank Integration**
16. Preview of selected/randomized question pool before publishing the exam.
17. Warning if a question in the pool is later edited/deleted after the exam has been published (link to Question Bank's versioning/locking, if implemented).
18. Ability to manually override a few questions instead of pure randomization (hybrid mode).

**E. Exam Lifecycle**
19. **Draft → Published → Ongoing → Closed** status workflow, with restrictions on editing once an exam is live or has submissions.
20. **Duplicate/clone exam** — copy an existing exam's structure (subjects, question counts, duration) to quickly create a similar one next term.
21. **Archive old exams** vs. deleting them outright.

**F. Bulk & Data Operations**
22. Bulk actions on the exam list (multi-select delete, bulk publish/unpublish, bulk assign to classes).
23. Purging old/test exams from development/testing phase, with preview before deletion (same pattern as Results and Question Bank pages).

**G. General Gap Review** — also check for:
- Confirmation modals for destructive/high-impact actions (publish, delete, edit a live exam)
- Role-based permissions (who can create/edit/publish/delete exams)
- Audit log (who created/edited/published/deleted an exam, and when)
- Loading, error, and empty states
- Responsive/mobile behavior for exam setup forms
- Accessibility (keyboard navigation, ARIA labels on multi-step exam creation forms)
- Code quality: state management for the multi-step exam creation flow, form validation, API error handling, TypeScript coverage
- Notifications — alert students/teachers when an exam is published or about to start

Present all of this as a checklist/task list, grouped by category (Validate Existing, Configuration Gaps, Targeting/Access, Question Bank Integration, Lifecycle, Bulk/Data Ops, Other Gaps), so I can review and prioritize before you write code.

**Step 2 — Implement**
Once I approve the task list, implement fixes starting with highest priority. Pay special attention to:
- Not breaking the existing multi-subject exam + randomization + per-subject count logic while adding new features
- Making sure any new validation (e.g., question pool size checks) doesn't block existing valid exams
- Wiring features to real backend endpoints; if an endpoint doesn't exist, flag it and propose the API contract rather than guessing

Keep existing functionality working. Match existing design system and patterns already in the codebase.

**Step 3 — Verify**
- Screenshot/walkthrough proving: multi-subject exam creation still works, randomization produces different sets per student while respecting per-subject counts, new configuration options (duration, scheduling, scoring rules, etc.) save and apply correctly
- Confirm no existing functionality broke
- Note any data-model or API assumptions made

**Output**: task list first, wait for my go-ahead, then implement, then show verification artifacts."

---

Worth flagging to the agent early: it should check whether your **randomization logic runs at exam-start time (per student, live)** or **at publish time (pre-generated pool)** — this affects whether question-pool-size validation and audit tracing (point 3) are even feasible the way I've described them, and the agent should report back on which model your system currently uses before building on top of it.



---------------------------------------------------------------




Here's the review prompt for the **Invigilator/Proctor Hub**, with a strong focus on reliability under poor network conditions since that's clearly your core concern:

---

**Prompt:**

"Act as a senior fullstack engineer. I want you to audit and improve the **Invigilator/Proctor Hub** page in our CBT app — the page invigilators use to monitor students in real-time during an active exam.

**Core concern to prioritize**: The hub must reliably track student status even under low/unstable/intermittent network conditions, both on the student's side and the invigilator's side. Treat this as the #1 priority throughout the review.

**Step 1 — Plan**
Before writing any code, explore the codebase and produce a task list covering:

**A. Real-Time Tracking & Connection Reliability**
1. Confirm how student status is currently tracked — polling, WebSockets, or another method — and evaluate whether it degrades gracefully on poor connections.
2. **Heartbeat/ping mechanism**: student clients should send periodic "I'm alive" signals; if a heartbeat is missed, the invigilator should see a clear state (e.g., "Connection lost" vs. "Offline" vs. "Submitted") rather than the student silently disappearing from the list.
3. **Reconnection handling**: if a student's connection drops mid-exam, confirm their session/answers are preserved and they can resume without losing progress or being locked out.
4. **Distinguish failure states clearly** — the invigilator needs to tell apart:
   - Student closed/left the exam intentionally
   - Student's device/network dropped (temporary)
   - Student's browser crashed/refreshed
   - Student is idle/inactive but still connected
5. **Offline answer caching**: student's answers should save locally (localStorage/IndexedDB) and sync once connection restores, so a bad network doesn't cause lost answers.
6. **Auto-retry/backoff logic**: failed sync attempts should retry with backoff rather than failing silently or spamming the server.
7. **Last-seen timestamp** per student, visible to the invigilator, so they know exactly how stale a student's shown status is (e.g., "Last updated 45s ago") instead of assuming real-time accuracy.
8. **Low-bandwidth mode for the invigilator's own dashboard** — if the invigilator's own connection is poor, the hub itself shouldn't crash/freeze; consider reducing update frequency or payload size automatically.

**B. Student Monitoring Features**
9. Live status per student: In Progress / Submitted / Not Started / Disconnected / Flagged.
10. Time remaining per student (especially if extra time was granted individually).
11. Progress indicator — how many questions answered vs. total, per student.
12. Flagging/suspicious activity indicators: tab-switching, window blur/focus loss, copy-paste attempts, multiple login attempts, fullscreen exit (if proctoring features like this exist or are planned).
13. Ability for invigilator to message a specific student or broadcast a message to all students (e.g., "5 minutes remaining," "network issue detected, please stay on this page").
14. Ability for invigilator to manually extend time for a specific student (e.g., to compensate for a network outage they experienced).
15. Ability for invigilator to force-submit a student's exam (e.g., in cases of misconduct or unresponsive session past a grace period).

**C. Session & Data Integrity**
16. Confirm exactly what happens to a student's answers if they disconnect and never reconnect before exam end — are partial answers auto-submitted, or lost?
17. Grace period logic: how long should the system wait before marking a disconnected student's exam as submitted or flagging them, and is this configurable per exam?
18. Conflict resolution: if a student's answers exist both in local cache and server (e.g., after reconnecting), confirm the sync logic doesn't silently overwrite newer answers with older ones.
19. Server load handling: confirm the invigilator hub can handle many students' status updates simultaneously without lag, especially near submission deadlines.

**D. Invigilator Workflow & Usability**
20. Filtering/sorting the student list: by status (disconnected, flagged, submitted), by class/subject, by exam.
21. Search for a specific student in a large exam session.
22. Multi-invigilator support — if more than one invigilator monitors the same exam, confirm actions (like force-submit or messaging) are synced and don't conflict.
23. Exportable session log/report after the exam — showing disconnection events, flags, and timestamps per student, for record-keeping or dispute resolution.

**E. General Gap Review** — also check for:
- Confirmation modals for high-impact actions (force-submit, extending time, flagging)
- Role-based permissions (who can force-submit, message students, or view flagged activity)
- Audit log — every invigilator action (force-submit, time extension, message sent) should be logged with timestamp and invigilator ID
- Loading, error, and empty states (e.g., what does the hub show before an exam starts, or if no students have logged in yet)
- Responsive/mobile behavior — can an invigilator monitor from a tablet/phone if needed
- Accessibility (keyboard navigation, screen-reader support for status indicators — don't rely on color alone to indicate flagged/disconnected states)
- Notification/alert system — should the invigilator get an audible/visual alert when a student disconnects or gets flagged, rather than having to watch the list constantly

Present all of this as a checklist/task list, grouped by category (Connection Reliability, Monitoring Features, Session/Data Integrity, Invigilator Workflow, Other Gaps), so I can review and prioritize before you write code.

**Step 2 — Implement**
Once I approve the task list, implement fixes starting with the highest priority — connection reliability and data integrity first, since a lost exam answer due to bad network is the most damaging failure mode. Pay special attention to:
- Not breaking existing real-time tracking while adding reconnection/offline handling
- Testing behavior under simulated poor network conditions (throttled connection, intermittent drops) before considering a fix complete
- Wiring features to real backend endpoints; if an endpoint doesn't exist (e.g., for heartbeat tracking or offline answer sync), flag it and propose the API contract rather than guessing

Keep existing functionality working. Match existing design system and patterns already in the codebase.

**Step 3 — Verify**
- Screenshot/walkthrough proving: student status updates correctly reflect connection state, a simulated disconnect/reconnect preserves answers and updates the invigilator view correctly, force-submit and messaging work, session log export works
- Explicitly test under throttled/simulated bad network conditions, not just normal conditions
- Confirm no existing functionality broke
- Note any data-model, API, or infrastructure assumptions made (e.g., whether WebSockets are supported by your hosting/infra, or if you're limited to polling)

**Output**: task list first, wait for my go-ahead, then implement, then show verification artifacts."

---

Worth flagging to the agent up front: it should report back on **what tracking mechanism currently exists** (polling vs. WebSockets vs. nothing) and **whether answers are saved to the server after every question or only on submit** — those two facts determine how much of the "bad network" problem is solvable with frontend changes alone versus needing backend/infra changes (e.g., adding a local-first save strategy or a proper heartbeat system).


----------------------------------------------------------------



Here's the review prompt for the **Student Exam Portal (exam-taking session) page**, tying it directly into the Invigilator Hub work and your signal-packet idea:

---

**Prompt:**

"Act as a senior fullstack engineer. I want you to audit and improve the **Student Exam Portal page** — the page/session where students actually take the exam. This must work reliably under low/unstable network conditions, and must feed the Invigilator Hub with accurate status without slowing down the student's exam experience.

**My proposed approach (evaluate and refine, don't just implement blindly)**:
I want the student's client to send lightweight **"signal packets"** to the admin/invigilator side at regular intervals (e.g., every X seconds) instead of maintaining a heavy persistent connection — so the exam app itself doesn't get slowed down by constant syncing. Review whether this is the right approach, and if so, design it properly (packet size, frequency, what it should contain, fallback behavior).

**Step 1 — Plan**
Before writing any code, explore the codebase and produce a task list covering:

**A. Evaluate the Signal Packet Approach**
1. Confirm current mechanism (polling, WebSocket, none) for sending student status to the invigilator/admin side.
2. Design the signal packet payload — keep it minimal: student ID, exam ID, timestamp, connection status, current question index/progress, time remaining. Avoid sending full answer data in this packet — that should be a separate, less frequent sync.
3. Decide appropriate interval (e.g., every 10–15s) — balance "invigilator sees near-real-time status" against "don't flood the server or drain the student's bandwidth/battery."
4. Use `navigator.sendBeacon()` or a lightweight fetch with `keepalive: true` for the signal packet, so it doesn't block the UI thread or get cancelled on page transitions.
5. If a signal packet fails to send (bad network), queue it and retry with backoff — don't let failed signal sends pile up or block the exam UI.
6. Separate concerns clearly: signal packets (frequent, tiny, status-only) vs. answer sync (less frequent, saves actual answer data) vs. final submission (critical, must succeed) — confirm these three don't get conflated into one heavy request.

**B. Answer Saving & Data Integrity**
7. Confirm answers are saved **locally first** (localStorage/IndexedDB) on every question change, regardless of network state — this is the most important protection against bad network.
8. Auto-sync saved answers to the server periodically (not on every keystroke, but on question change/navigation) with retry-on-failure.
9. On final submission: confirm there's a robust flow — attempt submit, if it fails, queue and retry, show the student a clear "submission pending, do not close this page" state rather than a false success or silent failure.
10. On page reload/crash/browser close: confirm the student can resume the exam from local + last-synced server state without losing answered questions or getting extra time unfairly.
11. Conflict resolution: if local answers and server answers differ when reconnecting, always trust the most recently answered version — confirm this logic exists and is tested.

**C. Student-Side Network Awareness**
12. Show the student a clear, non-alarming network status indicator (e.g., "Connected" / "Reconnecting..." / "Working offline, your answers are saved") — students in bad network areas need reassurance they haven't lost progress.
13. Detect network state changes (`navigator.onLine`, connection events) and adjust behavior — e.g., pause non-critical syncs, prioritize answer-saving.
14. Prevent students from panicking/refreshing repeatedly during a network hiccup — clear messaging matters here as much as the technical fix.

**D. Student-to-Admin Communication**
15. Allow students to send a message/help-request to the invigilator/admin during the exam (e.g., "I'm having network issues," "question X isn't loading," "I need help") — this should use the same lightweight signal channel, not a heavy chat system.
16. Confirm this message request also queues/retries under bad network, same as signal packets.
17. Invigilator should see these messages prominently (tied into the Invigilator Hub's alert system from the previous review).

**E. Results & Data Delivery to Admin**
18. On exam submission, confirm what data is sent to the admin/results system: final answers, time taken, number of disconnects/reconnects during the session, flags (tab-switch, etc. if applicable), submission timestamp.
19. Confirm this final results payload is sent reliably — retry logic, and a fallback (e.g., "resume and re-submit" option) if it fails outright, so a student's exam is never lost even if final submission fails once.
20. Confirm large payloads (e.g., essay answers, embedded images if any) are chunked or compressed if bandwidth is a concern.

**F. Exam Session UX**
21. Timer behavior under bad network — confirm the timer runs client-side (not dependent on constant server ping) so it doesn't freeze/desync during connection issues, but is still validated server-side to prevent tampering.
22. Auto-submit on time expiry — confirm this works even if network is down at that exact moment (should queue and retry, not silently fail).
23. Navigation between questions/subjects (especially in multi-subject exams) — confirm this is fully client-side/local, not dependent on a server round-trip per question.

**G. General Gap Review** — also check for:
- Clear error states (network down, submission failed, session expired) that don't confuse or panic the student
- Accessibility (screen-reader support for timer, network status, and submission confirmations)
- Battery/data usage consideration for students on mobile data
- Logging on the backend of every signal packet/answer sync/submission attempt, so support staff can reconstruct what happened for a student who reports an issue

Present all of this as a checklist/task list, grouped by category (Signal Packet Design, Answer Integrity, Network Awareness, Student-Admin Comms, Results Delivery, Exam UX, Other Gaps), so I can review and prioritize before you write code.

**Step 2 — Implement**
Once I approve the task list, implement starting with highest priority — local-first answer saving and reliable final submission first, since losing a student's exam is the worst possible failure. Pay special attention to:
- Keeping the signal packet mechanism genuinely lightweight — test that it doesn't add noticeable lag to the exam-taking experience
- Testing under throttled/simulated bad network and intermittent disconnects, not just normal conditions
- Making sure this integrates correctly with the Invigilator Hub's status display from the previous review (same signal data should populate both)
- Wiring to real backend endpoints; if something doesn't exist (e.g., a lightweight signal endpoint separate from the answer-sync endpoint), flag it and propose the API contract rather than guessing

Keep existing functionality working. Match existing design system and patterns already in the codebase.

**Step 3 — Verify**
- Screenshot/walkthrough proving: answers save locally and sync correctly, signal packets reach the invigilator hub without lag on the student side, a simulated disconnect/reconnect preserves progress, final submission succeeds (or queues/retries) even under bad network, student help-request messages reach the invigilator
- Explicitly test under throttled/simulated bad network conditions
- Confirm no existing functionality broke
- Note any data-model, API, or infrastructure assumptions made

**Output**: task list first, wait for my go-ahead, then implement, then show verification artifacts."

---

One important note on your signal-packet idea: it's a solid instinct — essentially a lightweight heartbeat, which is the right pattern for this problem. The key refinement the agent should apply is **separating the three data streams by frequency and weight** (signal/status = frequent + tiny, answer sync = occasional + medium, final submission = rare + critical-must-succeed). If those get merged into one request, you'll end up right back at the "slows down the app" problem you're trying to avoid.

---------------------------------------------------------------


Here's the review prompt for the **Settings page**, with your reset-on-deploy bug flagged as the top priority investigation item:

---

**Prompt:**

"Act as a senior fullstack engineer. I want you to audit and fix the **Settings page** in our CBT app.

**Critical bug to investigate first**: Every time I push new changes/deploy, the settings revert to default values (and sometimes other unrelated things change too). This is a serious bug — find the root cause before anything else.

**Step 1 — Root Cause Investigation (Priority #1)**
1. Confirm **where settings are stored** — database, config file, environment variables, localStorage, or hardcoded defaults in code. This is the most important thing to identify.
2. If settings live in a **config/JSON file or environment variable committed to the repo or reset by the build process**, that's a likely culprit — deploys would overwrite it with defaults every time. Check for this specifically.
3. If settings are in the **database** but still resetting, check:
   - Are database migrations or seed scripts running on every deploy and re-inserting default settings (overwriting existing rows)?
   - Is there a "first-run setup" check that's incorrectly triggering on every deploy instead of only on first install?
   - Is the app reading settings from a stale cache instead of the database after deploy?
4. If using an ORM, check whether migrations use `INSERT` (which can duplicate/reset) vs. proper `upsert`/conditional seed logic (only insert if not already present).
5. Check deploy scripts/CI-CD pipeline — is there a step that resets the database, restores from a template, or runs a seed command on every deployment rather than only on initial setup?
6. Check for **environment differences** — are you testing on a staging/dev environment that uses a different (fresh) database than production, making it look like settings reset when actually you're viewing a different environment's data?
7. Document exact findings: what specifically resets, and why, before writing any fix.

**Step 2 — Settings Page Feature Review**
Once the reset bug is understood, review the full Settings page for completeness. A CBT admin settings page typically needs:

**A. General/School Info**
- School/institution name, logo, address, contact info (used on printed result sheets, letterheads)
- Academic session/term configuration (current session, term start/end dates)

**B. Exam Defaults**
- Default exam duration, default grading scale (A-F boundaries, pass mark)
- Default negative marking rule (on/off, and value)
- Default number of attempts allowed
- Default randomization behavior (on/off by default for new exams)

**C. Result & Grading Configuration**
- Grade boundaries/GPA scale (editable, not hardcoded)
- Result approval workflow toggle (auto-publish vs. requires admin approval before students see results)
- Ranking/position calculation method (class-wide vs. subject-wide)
- Result sheet template/branding settings (tied to printing feature from earlier review)

**D. Security & Access**
- Password policy (min length, complexity requirements)
- Session timeout duration for admin and student portals
- Two-factor authentication toggle for admin accounts
- IP restriction/whitelist for admin access, if applicable

**E. Notification Settings**
- Email/SMS notification toggles (exam published, results released, account created)
- Notification templates (editable text for common notifications)

**F. Exam Session Behavior (ties into Invigilator/Student Portal reviews)**
- Default grace period before marking a disconnected student as flagged
- Default signal packet/heartbeat interval (if you want this configurable rather than hardcoded)
- Tab-switch/fullscreen-exit detection toggle (on/off by default)
- Auto-submit behavior on time expiry (immediate vs. grace period)

**G. Data & Maintenance**
- Data retention policy settings (how long to keep old exam data before it's eligible for purge — ties into the purging feature from earlier reviews)
- Backup schedule/frequency, if managed from the app
- Test/demo mode toggle (if you want a clear "we're in testing" flag that separates test data from real data, rather than manually identifying test data later)

**H. Audit & Logging**
- Toggle for audit log verbosity/retention period
- Who can view audit logs (role-based)

**Step 3 — Fix Implementation**
1. Fix the root cause of settings resetting — likely involves moving settings to persistent database storage (if not already), fixing seed/migration logic to be idempotent (only seed defaults if no settings exist yet), and removing any deploy step that overwrites settings unintentionally.
2. Ensure settings changes are validated (e.g., can't set pass mark above 100%, can't set negative duration) before saving.
3. Add a **"Save" confirmation and change summary** — show what changed before committing, especially for high-impact settings like grading scale or security policy.
4. Add default values only as **fallbacks in code** (used only if no setting exists in DB), never as something that overwrites existing saved settings.

**Step 4 — Verify**
- Reproduce the original bug in a test/staging deploy, apply the fix, then **redeploy again** and confirm settings persist correctly this time — this is the real test, not just "it looks fine before deploying."
- Confirm migrations/seed scripts are idempotent (running them multiple times doesn't reset existing data).
- Confirm no existing functionality broke.
- Note any infrastructure or deploy-pipeline assumptions made, and flag if the CI/CD setup itself needs a change (not just the codebase) to fully fix this.

**Output**: First, report back the root cause finding from Step 1 clearly and in plain terms before doing anything else — I want to understand exactly why this has been happening. Then present the full settings checklist from Step 2, wait for my go-ahead, then implement fixes, then show verification artifacts including a real redeploy test."

---

The reset-on-deploy bug is almost certainly one of: **(a)** settings stored in a file/env var that gets overwritten by your deploy process, or **(b)** a seed script that runs unconditionally on every deploy instead of only on first install. I structured Step 1 so the agent reports back *before* touching anything — that diagnosis will tell you a lot about how deep the fix needs to go.


---------------------------------------------------------------



Here's the review prompt for the **Student Profile page**, focused squarely on the performance/freezing issue since that's the critical problem:

---

**Prompt:**

"Act as a senior fullstack engineer. I want you to audit and fix the **Student Profile page** in our app. This page displays a lot of data — class analytics, subject-level analytics, exam history, and other student records — and it's currently so heavy that the browser sometimes shows a 'Page Unresponsive' / 'Wait or Kill Page' dialog in Chrome. This is a critical performance bug. Prioritize diagnosing and fixing this above adding any new features.

**Step 1 — Root Cause Diagnosis (Priority #1)**
Before writing any code, profile and investigate:

1. **Where is the computation happening?** — Is heavy analytics (averages, rankings, trends, charts) being calculated **client-side in the browser** on page load, or is it precomputed on the backend and just fetched? Client-side heavy computation on large datasets is the most likely cause of a frozen tab.
2. **How much data is being fetched/rendered at once?** — Check if the page is pulling a student's *entire* history (every exam, every subject, every term, every year) in one request/render, instead of paginating or lazy-loading.
3. **Re-render behavior** — Check for unnecessary re-renders: are analytics/charts recalculating on every state change instead of being memoized (`useMemo`, `useCallback`, `React.memo`)?
4. **Chart/graph libraries** — If charts are used (performance trends, subject comparisons), check if they're rendering with too many data points at once, or re-mounting unnecessarily instead of updating.
5. **Main thread blocking** — Identify any synchronous, heavy JS computation (sorting/aggregating large arrays, computing rankings, GPA calculations) running directly on the main thread instead of being offloaded (e.g., to a Web Worker) or precomputed on the backend.
6. **Network waterfall** — Check if the page fires many sequential API calls instead of batching them, causing slow, staggered loading that compounds the perceived freeze.
7. **Memory leaks** — Check if repeated visits to this page (without full reload) cause increasing memory usage due to uncleaned event listeners, subscriptions, or chart instances.

Report back clearly: is this primarily a **backend problem** (heavy computation should move server-side and be cached), a **frontend problem** (too much rendered/recalculated in the browser), or **both**?

**Step 2 — Optimization Plan**
Based on the diagnosis, produce a checklist covering:

**A. Move Computation Off the Client**
8. Precompute analytics (subject averages, class rank, GPA, trend data) on the **backend**, store/cache the result, and have the frontend simply fetch and display — not calculate.
9. Cache computed analytics (e.g., in Redis or a materialized table) and only recompute when new results are added, not on every page visit.

**B. Reduce What's Loaded Upfront**
10. **Lazy-load sections** — load the core profile (name, class, photo) first; load analytics, charts, and historical records asynchronously/on-demand (e.g., when the user scrolls to that section or clicks a tab).
11. **Tab/accordion structure** — if the page currently shows everything at once (analytics + subjects + all exam history), consider splitting into tabs (Overview / Academic History / Analytics / Records) so only the active tab's data loads and renders.
12. **Pagination or "load more"** for exam history/records instead of rendering the student's entire multi-year history at once.
13. **Virtualization** for long lists (e.g., `react-window` or `react-virtualized`) if rendering many rows of historical results.

**C. Frontend Rendering Efficiency**
14. Memoize expensive calculations and components (`useMemo`, `React.memo`) so they don't recompute/re-render unnecessarily.
15. Debounce/throttle any interactive filters on this page (e.g., "view by term" toggle) so they don't trigger a full recompute on every click.
16. Review chart rendering — downsample data points for trend charts if showing many terms/exams, and ensure chart components aren't re-mounting on unrelated state changes.
17. Code-split this page (`React.lazy` + `Suspense`) so its JS bundle isn't loaded/parsed until needed.

**D. Network Efficiency**
18. Batch related API calls into a single endpoint where possible, instead of firing many small requests.
19. Add proper loading skeletons per section so the page feels responsive while data streams in progressively, instead of blocking render until everything is ready.

**E. General Gap Review** — also check for:
- Error boundaries per section (so one failed analytics widget doesn't crash/freeze the whole page)
- Empty/loading states for each section
- Responsive behavior — this is often worse on mobile with the same heavy payload
- Whether this same heavy-analytics pattern exists elsewhere in the app (e.g., a class-wide analytics page) and should be fixed using the same approach

Present this as a checklist/task list, grouped by category (Diagnosis findings, Backend Computation, Reduce Upfront Load, Frontend Rendering, Network Efficiency, Other Gaps), so I can review and prioritize before you write code.

**Step 3 — Implement**
Once I approve the plan, implement starting with whatever the diagnosis identified as the primary cause. Pay special attention to:
- Not losing any analytics/data currently shown — the goal is to load it efficiently, not remove functionality
- Testing with a student who has a large history (multiple years, many exams) as the worst-case scenario, not just a new student with little data
- Wiring to real backend endpoints; if precomputed analytics endpoints don't exist yet, flag it and propose the API contract rather than guessing

Keep existing functionality working. Match existing design system and patterns already in the codebase.

**Step 4 — Verify**
- Use browser DevTools Performance tab to measure before/after: page load time, main thread blocking time, memory usage.
- Confirm the 'Page Unresponsive' issue no longer occurs, specifically testing with a student that has the heaviest/largest data history.
- Confirm no existing functionality or data broke.
- Note any backend/infrastructure assumptions made (e.g., need for a caching layer or precomputed analytics table).

**Output**: First, report back the root cause diagnosis from Step 1 in plain terms. Then present the optimization checklist from Step 2, wait for my go-ahead, then implement, then show verification artifacts including before/after performance measurements."

---

My strong suspicion, based on what you've described: this is a **client-side computation problem** — analytics (rankings, averages, trends) being calculated in the browser from raw historical data instead of being precomputed server-side. That pattern gets away with it fine on a small dataset, but scales badly and freezes the tab exactly like you're describing once a student has several years of exam history. Worth having the agent confirm this specifically before you approve any fix plan.

------------------------------------------------------------------------------




Here's the prompt for a **Staff Test User / QA Exam Tester role** — essentially a special account type that can simulate the student exam experience without being bound by student-only restrictions:

---

**Prompt:**

"Act as a senior fullstack engineer. I want to add a **'Test User' / QA Staff role** to our CBT app. This is a special account type for staff to take exams exactly like a student would (to verify exams work correctly before/after publishing), but **without** the restrictions that apply to real students — such as single-attempt limits, exam re-take blocks, time-window locks, and other rules meant to preserve exam integrity for real students.

**Step 1 — Clarify Requirements & Data Model**
Before building anything, confirm/decide the following (report back before implementing):

1. **Role type**: Should this be a brand-new role (`test_user` / `qa_staff`) distinct from `admin`, `teacher`, and `student`, or a flag/permission added to an existing staff role (e.g., `is_test_user: true` on a staff account)? Recommend the cleaner approach given the current role/permission system.
2. **Identity separation**: A test user should NOT appear in real student lists, class rosters, results analytics, rankings, or reports — confirm how the system will exclude test users from all student-facing and reporting queries. This is critical: a test user's fake attempt must never pollute real data (class averages, rankings, pass rates, etc.).
3. **Where they take exams**: Do they use the exact same Student Exam Portal (Step-by-step review done earlier), or a near-identical sandboxed version? Recommend reusing the real student portal as much as possible — the whole point is testing the *real* experience, not a separate mock version. Testing a different UI defeats the purpose.

**Step 2 — Permissions & Restriction Overrides**
Define exactly which student restrictions a test user should bypass, and which should remain (some restrictions, like timer behavior, SHOULD still apply since that's part of what needs testing):

**Should be bypassed (test-only privileges):**
4. Single-attempt limit — allow unlimited retakes of the same exam.
5. Exam scheduling window — allow access before/after the official start/end time (so staff can test setup before students go live).
6. Department/class eligibility restrictions — allow a test user to attempt *any* exam regardless of assigned class/department (so they can test the department-elective feature from the earlier review, across all department mappings, without needing real student accounts per department).
7. Retake lockout after submission — allow re-entry into the same exam session for repeated testing.

**Should NOT be bypassed (needs to behave like a real student, since this is what's being tested):**
8. Timer/countdown behavior — should run exactly as a student would experience it.
9. Randomization logic — should get a genuinely random question set per attempt, same as a real student, to test that randomization works.
10. Network/signal packet behavior, offline answer caching, auto-submit on time expiry — should behave identically, since this is likely a major reason for creating this feature (to test the low-network handling from earlier reviews).
11. Question rendering, answer saving, multi-subject navigation — identical to real student experience.

**Step 3 — Data Isolation**
12. Test attempts must be clearly tagged (e.g., `is_test_attempt: true` on the result/session record) so they can be filtered out everywhere: Results page, analytics, rankings, Invigilator Hub's live student list (or shown but clearly separated, e.g., a 'Test Sessions' section) and reports/exports.
13. Test attempt data (answers, scores, session logs) should still be viewable by the staff member and admins — for QA purposes — just excluded from anything a real student, parent, or official report would see.
14. Add a way to bulk-purge test attempt data (ties into the purge feature from earlier reviews) so old test sessions don't pile up indefinitely.

**Step 4 — Admin Controls**
15. Admin should be able to create/designate test user accounts (separate from creating real staff accounts, or as a checkbox/toggle when creating a staff account).
16. Admin should be able to see a log of what test users have tested (which exams, how many attempts, when) — useful for confirming QA was actually done before an exam goes live to real students.
17. Consider limiting how many test user accounts can exist and who can create them (likely only super-admins) — this shouldn't be a loophole any staff member can self-grant.

**Step 5 — Implement**
Once I confirm the approach from Steps 1–2, implement:
- New role/flag for test users
- Bypass logic for attempt limits, scheduling windows, and eligibility restrictions — scoped ONLY to accounts flagged as test users
- Tagging of test attempts and exclusion from all student-facing/reporting/analytics queries
- Admin UI to create test users and view their test activity log
- Bulk purge for test session data

Keep all existing student and staff functionality completely unaffected — this is purely additive and must be tightly scoped so there's no way a real student account could accidentally get test-user privileges (that would be a serious integrity/cheating risk).

**Step 6 — Verify**
- Confirm a test user can retake the same exam multiple times, access it outside the scheduled window, and take any department's subject variant.
- Confirm a test user's attempts do NOT appear in real class rankings, analytics, or exported reports.
- Confirm a test user's attempts DO appear in a dedicated QA/test log for admin review.
- Confirm a real student account cannot be mistakenly flagged as a test user, and vice versa.
- Confirm timer, randomization, and network-resilience behavior for test users is identical to real students (since that's the point of this feature).

**Output**: First, report back your recommended approach for Step 1 (role structure and data isolation strategy) — wait for my confirmation before implementing, since getting the data isolation wrong could contaminate real exam analytics."

---

One risk worth flagging clearly to your agent (and to yourself): **this feature is a potential integrity backdoor if scoped loosely**. The two things that matter most are (1) making sure test-user privileges can only be granted by a super-admin, not self-assigned or accidentally inherited, and (2) making sure test attempts are *tagged and excluded everywhere* — results, rankings, invigilator hub, exports — with no gaps. I'd have the agent explicitly walk through every place student data currently surfaces and confirm test-user exclusion at each one, rather than assuming one central filter catches everything.