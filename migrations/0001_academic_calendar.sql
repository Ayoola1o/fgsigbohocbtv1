-- Apply before deploying the calendar-enabled application. No historical records are relabelled.
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS academic_calendar jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_session text;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_term text;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS academic_session text;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS academic_term text;
ALTER TABLE results ADD COLUMN IF NOT EXISTS academic_session text;
ALTER TABLE results ADD COLUMN IF NOT EXISTS academic_term text;
