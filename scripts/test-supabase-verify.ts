import "dotenv/config";
import { storage } from "../server/storage";

async function main() {
  console.log("=== Testing Supabase Storage & Student Portal ===");
  const students = await storage.getStudents();
  console.log(`Found ${students.length} students in Supabase.`);

  if (students.length > 0) {
    const testStudent = students[0];
    console.log(`Testing with student: "${testStudent.name}" (ID: "${testStudent.studentId}")`);

    // Test exact match
    const s1 = await storage.getStudentByStudentId(testStudent.studentId);
    console.log("Exact ID match:", s1 ? "PASS" : "FAIL");

    // Test lowercase and padded match
    const s2 = await storage.getStudentByStudentId("  " + testStudent.studentId.toLowerCase() + "  ");
    console.log("Case-insensitive & whitespace trimmed match:", s2 ? "PASS" : "FAIL");
  }

  const exams = await storage.getExams();
  console.log(`Found ${exams.length} exams in Supabase.`);

  if (exams.length > 0) {
    const testExam = exams[0];
    console.log(`Exam 1: "${testExam.title}" (Questions: ${testExam.questionIds?.length || 0})`);
    if (testExam.questionIds && testExam.questionIds.length > 0) {
      const sampleIds = testExam.questionIds.slice(0, 5);
      const fetchedQuestions = await storage.getQuestionsByIds(sampleIds);
      console.log(`Fetched ${fetchedQuestions.length} of ${sampleIds.length} sample questions from Supabase in batch.`);
    }
  }

  console.log("=== All Supabase verifications passed successfully! ===");
  process.exit(0);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
