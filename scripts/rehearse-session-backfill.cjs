require("dotenv/config");

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { Pool } = require("pg");
const { initializeApp } = require("firebase/app");
const { collection, getDocsFromServer, getFirestore, terminate } = require("firebase/firestore");

function firebaseEnv(key) {
  return process.env[`FIREBASE_${key}`] || process.env[`VITE_FIREBASE_${key}`];
}

function timestamp(value) {
  if (value == null) return null;
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return date.toISOString();
}

function toSession(id, data) {
  const startedAt = timestamp(data.startedAt);
  if (!startedAt || typeof data.studentName !== "string" ||
      typeof data.isCompleted !== "boolean" || !Number.isInteger(data.currentQuestionIndex) ||
      !data.answers || Array.isArray(data.answers) || typeof data.answers !== "object") {
    throw new Error("Invalid required session fields");
  }
  return {
    id,
    exam_id: data.examId,
    student_name: data.studentName,
    student_id: data.studentId,
    started_at: startedAt,
    ended_at: timestamp(data.endedAt),
    answers: data.answers,
    current_question_index: data.currentQuestionIndex,
    is_completed: data.isCompleted,
    time_remaining: data.timeRemaining,
    session_question_ids: data.sessionQuestionIds,
    last_seen_at: timestamp(data.lastSeenAt),
    tab_switches: data.tabSwitches,
    window_blurs: data.windowBlurs,
    extended_minutes: data.extendedMinutes,
    invigilator_message: data.invigilatorMessage,
    broadcast_message: data.broadcastMessage,
    is_flagged: data.isFlagged,
    is_test_attempt: data.isTestAttempt ?? false,
  };
}

async function main() {
  const { PGlite } = require(process.env.CBT_PGLITE_MODULE || "@electric-sql/pglite");
  const local = new PGlite();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
    options: "-c default_transaction_read_only=on",
  });
  const firestore = getFirestore(initializeApp({
    projectId: firebaseEnv("PROJECT_ID"),
    apiKey: firebaseEnv("API_KEY"),
    appId: firebaseEnv("APP_ID"),
  }));
  try {
    const [source, results] = await Promise.all([
      getDocsFromServer(collection(firestore, "exam_sessions")),
      pool.query(`SELECT r.session_id, r.exam_id, r.student_id
                  FROM public.results r
                  WHERE NOT EXISTS (SELECT 1 FROM public.exam_sessions s WHERE s.id = r.session_id)`),
    ]);
    const docs = new Map(source.docs.map(doc => [doc.id, doc]));
    const candidates = [];
    const summary = { resultsWithoutSession: results.rowCount, missing: 0, mismatched: 0, invalid: 0 };
    for (const result of results.rows) {
      const data = docs.get(result.session_id)?.data();
      if (!data) {
        summary.missing++;
      } else if (data.examId !== result.exam_id || data.studentId !== result.student_id) {
        summary.mismatched++;
      } else {
        try {
          candidates.push(toSession(result.session_id, data));
        } catch {
          summary.invalid++;
        }
      }
    }
    await local.exec(readFileSync(join(__dirname, "../migrations/0000_cbt_baseline.sql"), "utf8"));
    const insert = `INSERT INTO public.exam_sessions
                    SELECT * FROM jsonb_populate_recordset(NULL::public.exam_sessions, $1::jsonb)
                    ON CONFLICT (id) DO NOTHING RETURNING id`;
    const payload = JSON.stringify(candidates);
    const first = await local.query(insert, [payload]);
    const second = await local.query(insert, [payload]);
    if (first.rows.length !== candidates.length || second.rows.length !== 0) {
      throw new Error("Session backfill did not pass the repeat-run check");
    }
    console.log({ ...summary, sourceSessions: source.size, localInserts: first.rows.length, repeatInserts: second.rows.length });
  } finally {
    await Promise.all([pool.end(), terminate(firestore), local.close()]);
  }
}

main().catch(error => {
  console.error("Session rehearsal failed:", error.code || error.name);
  process.exitCode = 1;
});
