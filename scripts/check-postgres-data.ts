import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("No DATABASE_URL set in .env");
    process.exit(1);
}

const sql = neon(dbUrl);

async function checkPostgres() {
    console.log("=== CHECKING POSTGRESQL (NEON) TABLES ===");
    const tables = ["users", "students", "questions", "exams", "exam_sessions", "results"];
    
    for (const table of tables) {
        try {
            const rows = await sql(`SELECT COUNT(*) FROM "${table}"`);
            console.log(`Table '${table}': ${rows[0].count} rows`);
        } catch (err: any) {
            console.log(`Table '${table}': Error - ${err.message}`);
        }
    }
}

checkPostgres();
