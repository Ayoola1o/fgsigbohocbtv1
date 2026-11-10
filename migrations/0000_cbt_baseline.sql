CREATE TABLE "admin_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"role" text DEFAULT 'Super Admin' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"timezone" text DEFAULT 'Africa/Lagos' NOT NULL,
	"landing_page" text DEFAULT '/admin' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"notification_preferences" jsonb,
	"active_sessions" jsonb,
	"permissions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_admin_id" text,
	"category" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"deep_link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"batch_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" varchar NOT NULL,
	"student_name" text NOT NULL,
	"student_id" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_question_index" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"time_remaining" integer,
	"session_question_ids" jsonb,
	"last_seen_at" timestamp,
	"tab_switches" integer DEFAULT 0,
	"window_blurs" integer DEFAULT 0,
	"extended_minutes" integer DEFAULT 0,
	"invigilator_message" text,
	"broadcast_message" text,
	"is_flagged" boolean DEFAULT false,
	"is_test_attempt" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"duration" integer NOT NULL,
	"total_points" integer NOT NULL,
	"passing_score" integer NOT NULL,
	"question_ids" jsonb NOT NULL,
	"number_of_questions_to_display" integer,
	"class_level" text NOT NULL,
	"term" text DEFAULT 'First Term' NOT NULL,
	"theory_instructions" text,
	"exam_type" text DEFAULT 'Objectives' NOT NULL,
	"theory_config" jsonb,
	"subject_config" jsonb,
	"subject_slots" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"enable_calculator" boolean DEFAULT false NOT NULL,
	"enable_formula_sheet" boolean DEFAULT false NOT NULL,
	"department" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_text" text NOT NULL,
	"question_type" text NOT NULL,
	"subject" text NOT NULL,
	"difficulty" text NOT NULL,
	"options" jsonb,
	"correct_answer" text NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"class_level" text NOT NULL,
	"term" text DEFAULT 'First Term' NOT NULL,
	"exam_type" text DEFAULT 'Objectives' NOT NULL,
	"image_url" text,
	"department" text
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"exam_id" varchar NOT NULL,
	"student_name" text NOT NULL,
	"student_id" text NOT NULL,
	"score" integer NOT NULL,
	"total_points" integer NOT NULL,
	"percentage" integer NOT NULL,
	"passed" boolean NOT NULL,
	"submission_type" text,
	"answers" jsonb NOT NULL,
	"correct_answers" jsonb NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"is_test_attempt" boolean DEFAULT false NOT NULL,
	CONSTRAINT "results_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"student_id" text NOT NULL,
	"class_level" text NOT NULL,
	"sex" text,
	"department" text,
	"blocked_exams" jsonb,
	"average_score" integer,
	"academic_standing" text,
	"strengths" jsonb,
	"weaknesses" jsonb,
	"academic_trajectory" text,
	"diagnosis" text,
	"action_plan" jsonb,
	"last_analyzed" text,
	"is_test_user" boolean DEFAULT false NOT NULL,
	CONSTRAINT "students_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT 'global' NOT NULL,
	"school_name" text DEFAULT 'Faith Immaculate Academy' NOT NULL,
	"school_logo" text,
	"school_address" text,
	"school_contact" text,
	"current_session" text DEFAULT '2025/2026' NOT NULL,
	"term_start" text,
	"term_end" text,
	"default_duration" integer DEFAULT 60 NOT NULL,
	"default_grading_scale" jsonb,
	"default_negative_marking_enabled" boolean DEFAULT false NOT NULL,
	"default_negative_marking_value" integer DEFAULT 0 NOT NULL,
	"default_attempts" integer DEFAULT 1 NOT NULL,
	"default_randomization_enabled" boolean DEFAULT true NOT NULL,
	"result_approval_required" boolean DEFAULT false NOT NULL,
	"ranking_method" text DEFAULT 'class-wide' NOT NULL,
	"omit_exam_titles" boolean DEFAULT false NOT NULL,
	"score_format" text DEFAULT 'percentage' NOT NULL,
	"show_result_button" boolean DEFAULT true NOT NULL,
	"hide_completed" boolean DEFAULT false NOT NULL,
	"passing_threshold" integer DEFAULT 50 NOT NULL,
	"report_signature" boolean DEFAULT true NOT NULL,
	"school_motto" boolean DEFAULT true NOT NULL,
	"signature_principal" text,
	"signature_teacher" text,
	"signature_officer" text,
	"min_password_length" integer DEFAULT 6 NOT NULL,
	"password_complexity_required" boolean DEFAULT false NOT NULL,
	"session_timeout_admin" integer DEFAULT 30 NOT NULL,
	"session_timeout_student" integer DEFAULT 60 NOT NULL,
	"two_factor_admin_enabled" boolean DEFAULT false NOT NULL,
	"ip_whitelist" text,
	"email_notifications_enabled" boolean DEFAULT false NOT NULL,
	"sms_notifications_enabled" boolean DEFAULT false NOT NULL,
	"notification_templates" jsonb,
	"disconnect_grace_period" integer DEFAULT 30 NOT NULL,
	"heartbeat_interval" integer DEFAULT 10 NOT NULL,
	"tab_switch_detection_enabled" boolean DEFAULT true NOT NULL,
	"auto_submit_on_expiry_grace_period" integer DEFAULT 0 NOT NULL,
	"data_retention_period_days" integer DEFAULT 365 NOT NULL,
	"backup_frequency" text DEFAULT 'weekly' NOT NULL,
	"test_mode_enabled" boolean DEFAULT false NOT NULL,
	"audit_log_verbosity" text DEFAULT 'basic' NOT NULL,
	"audit_log_retention_days" integer DEFAULT 90 NOT NULL,
	"audit_log_roles" jsonb,
	"analysis_mode" text DEFAULT 'automatic' NOT NULL,
	"timer_warning" integer DEFAULT 5 NOT NULL,
	"concept_strength_threshold" integer DEFAULT 70 NOT NULL,
	"concept_focus_threshold" integer DEFAULT 50 NOT NULL,
	"term_weights" jsonb DEFAULT '{"term1":33.3,"term2":33.3,"term3":33.4}'::jsonb,
	"department_subject_mappings" jsonb DEFAULT '{"Science":["Physics","Chemistry","Biology","Further Mathematics","Mathematics","English Language","Agricultural Science","Civic Education"],"Commercial":["Financial Accounting","Commerce","Economics","Book Keeping","Office Practice","Mathematics","English Language","Civic Education"],"Art":["Government","Literature in English","Christian Religious Studies","Islamic Religious Studies","History","Yoruba","Hausa","Igbo","Mathematics","English Language","Civic Education"],"General":["Mathematics","English Language","Civic Education"]}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

-- Preserve the live Supabase row-level security posture on new databases.
--> statement-breakpoint
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app_notifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "exam_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
