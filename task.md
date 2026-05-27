CBT Application Upgrade Execution Checklist
[ ] Phase 1: Build the Foundation (Sidebar, Routes, & Local Settings)

[ ] Modify sidebar configuration in 
app-sidebar.tsx
 to add Analytics and Settings.
[ ] Register new routes /admin/analytics and /admin/settings in 
App.tsx
.
[ ] Implement 
admin-settings.tsx
 with HSL dark-mode themed toggles for score formats and exam titles.
[ ] Phase 2: Backend AI Question Importer API

[ ] Implement 
docx-reader.ts
 to read raw text from .txt/.docx files.
[ ] Register POST /api/questions/import-ai route in 
routes.ts
 using Gemini SDK structuring.
[ ] Phase 3: Frontend AI Question Importer UI

[ ] Implement standard metadata pre-selection dialog inside 
admin-questions.tsx
.
[ ] Implement full drag-and-drop file upload interactive flow.
[ ] Build the interactive spreadsheet Review Grid in the modal for inline modifications and final import checks.
[ ] Phase 4: Advanced Psychometrics Analytics

[ ] Implement the full master analytics dashboard 
admin-analytics.tsx
 with Difficulty index, Discrimination index, cognitive fatigue line charts, and concurrent socket monitors.
[ ] Add a personalized diagnostic panel in 
exam-result.tsx
 with performance recommendations.
[ ] Phase 5: Refine Reports, Toggles & Printed PDF Layouts

[ ] Connect print components in 
admin-results.tsx
 to Settings context for dynamic score representations and title header omissions.
[ ] Fix the Consolidated Report multi-select batch print flow.
[ ] Update Score Sheet (Broadsheet) class/department filtering.
[ ] Upgrade the Print Summary PDF document print in 
admin-student-profile.tsx
 to render trajectory forecasts.
[ ] Add a beautiful Print Result button on the student result page.
