import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, setDoc, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";
import "dotenv/config";

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

if (!firebaseConfig.projectId) {
    console.error("❌ VITE_FIREBASE_PROJECT_ID missing!");
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helpers to normalize CSV fields
function normalizeClassLevel(raw: string): string {
    const val = raw.trim();
    if (/sss?\s*1/i.test(val)) return "SS1";
    if (/sss?\s*2/i.test(val)) return "SS2";
    if (/sss?\s*3/i.test(val)) return "SS3";
    if (/jss?\s*1/i.test(val)) return "JSS1";
    if (/jss?\s*2/i.test(val)) return "JSS2";
    if (/jss?\s*3/i.test(val)) return "JSS3";
    return val || "SS1";
}

function normalizeTerm(raw: string): string {
    const val = raw.trim().toLowerCase();
    if (val.includes("1st") || val.includes("first")) return "First Term";
    if (val.includes("2nd") || val.includes("second")) return "Second Term";
    if (val.includes("3rd") || val.includes("third")) return "Third Term";
    return "First Term";
}

function normalizeExamType(raw: string): string {
    const val = raw.trim().toLowerCase();
    if (val.includes("theory")) return "Theory";
    return "Objectives";
}

function normalizeQuestionType(raw: string): string {
    const val = raw.trim().toLowerCase();
    if (val.includes("multiple")) return "multiple-choice";
    if (val.includes("true")) return "true-false";
    if (val.includes("short")) return "short-answer";
    if (val.includes("theory")) return "theory";
    return "multiple-choice";
}

function parseOptions(rawOptions: string): string[] {
    if (!rawOptions) return ["(a) Option A", "(b) Option B", "(c) Option C", "(d) Option D"];
    // Check if options are string like "(a) Constitution (b) Manifesto (c) Hansard (d) Decree"
    const regex = /\([a-d]\)\s*[^()]*/gi;
    const matches = rawOptions.match(regex);
    if (matches && matches.length >= 2) {
        return matches.map(m => m.trim());
    }
    // Fallback split by comma
    return rawOptions.split(",").map(o => o.trim()).filter(Boolean);
}

async function seedData() {
    console.log("🌱 Starting Firebase Data Seeding...");

    // 1. Seed Default Admin User if missing
    const usersSnap = await getDocs(collection(db, "users"));
    if (usersSnap.empty) {
        console.log("👤 Creating Admin user...");
        await addDoc(collection(db, "users"), {
            username: "Admin",
            password: "admin123"
        });
        console.log("✅ Admin user created.");
    } else {
        console.log(`👤 Admin user already exists (${usersSnap.size} user(s)).`);
    }

    // 2. Seed Students if missing or empty
    const studentsSnap = await getDocs(collection(db, "students"));
    if (studentsSnap.empty) {
        console.log("🎓 Seeding Students...");
        const defaultStudents = [
            { name: "John Doe", studentId: "STU001", classLevel: "SS1", sex: "M", department: "Art" },
            { name: "Jane Smith", studentId: "STU002", classLevel: "SS1", sex: "F", department: "Science" },
            { name: "David Johnson", studentId: "STU003", classLevel: "SS1", sex: "M", department: "Commercial" },
            { name: "Mary Adams", studentId: "STU004", classLevel: "SS2", sex: "F", department: "Science" },
            { name: "Emmanuel Okon", studentId: "STU005", classLevel: "SS1", sex: "M", department: "Art" },
            { name: "Chioma Eze", studentId: "STU006", classLevel: "SS1", sex: "F", department: "Science" },
        ];
        const batch = writeBatch(db);
        defaultStudents.forEach(st => {
            const ref = doc(collection(db, "students"));
            batch.set(ref, st);
        });
        await batch.commit();
        console.log(`✅ Seeded ${defaultStudents.length} default students.`);
    } else {
        console.log(`🎓 Students collection already has ${studentsSnap.size} student(s).`);
    }

    // 3. Seed Questions from SS1 Gov.csv & Built-in Subjects
    const questionsSnap = await getDocs(collection(db, "questions"));
    const createdQuestionIds: Record<string, string[]> = {
        Government: [],
        Mathematics: [],
        English: [],
        Physics: [],
        Chemistry: [],
        Biology: []
    };

    if (questionsSnap.empty) {
        console.log("❓ Seeding Questions...");

        const csvPath = path.resolve(process.cwd(), "SS1 Gov.csv");
        if (fs.existsSync(csvPath)) {
            console.log(`📄 Found 'SS1 Gov.csv', parsing questions...`);
            const fileContent = fs.readFileSync(csvPath, "utf-8");
            const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

            if (lines.length > 1) {
                const batch = writeBatch(db);
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    // Basic CSV line parser preserving quotes
                    const parts: string[] = [];
                    let curr = '';
                    let inQuotes = false;
                    for (let c = 0; c < line.length; c++) {
                        const char = line[c];
                        if (char === '"') inQuotes = !inQuotes;
                        else if (char === ',' && !inQuotes) {
                            parts.push(curr.trim());
                            curr = '';
                        } else curr += char;
                    }
                    parts.push(curr.trim());

                    if (parts.length < 5) continue;

                    const classLevel = normalizeClassLevel(parts[0]);
                    const term = normalizeTerm(parts[1]);
                    const examType = normalizeExamType(parts[2]);
                    const subject = parts[3] ? parts[3].trim() : "Government";
                    const questionText = parts[4] ? parts[4].replace(/^"|"$/g, '').trim() : "";
                    const questionType = normalizeQuestionType(parts[5] || "");
                    const difficulty = (parts[6] || "medium").toLowerCase();
                    const points = parseInt(parts[7] || "1", 10) || 1;
                    const correctAnswer = parts[8] ? parts[8].trim() : "";
                    const rawOptions = parts[9] ? parts[9].replace(/^"|"$/g, '').trim() : "";

                    if (!questionText) continue;

                    const options = parseOptions(rawOptions);

                    const qData = {
                        questionText,
                        questionType,
                        subject,
                        difficulty,
                        options,
                        correctAnswer,
                        points,
                        classLevel,
                        term,
                        examType,
                        department: "Art"
                    };

                    const ref = doc(collection(db, "questions"));
                    batch.set(ref, qData);
                    if (!createdQuestionIds[subject]) createdQuestionIds[subject] = [];
                    createdQuestionIds[subject].push(ref.id);
                }
                await batch.commit();
                console.log(`✅ Seeded ${createdQuestionIds["Government"]?.length || 0} questions from SS1 Gov.csv.`);
            }
        }

        // Add extra sample questions for Math, English, Physics, Chemistry, Biology
        const otherSubjects = ["Mathematics", "English", "Physics", "Chemistry", "Biology"];
        for (const subj of otherSubjects) {
            console.log(`➕ Creating sample questions for ${subj}...`);
            const batch = writeBatch(db);
            const ids: string[] = [];
            for (let i = 1; i <= 10; i++) {
                const ref = doc(collection(db, "questions"));
                const qData = {
                    questionText: `${subj} Sample Question ${i}: What is the correct answer to problem #${i}?`,
                    questionType: "multiple-choice",
                    subject: subj,
                    difficulty: i % 2 === 0 ? "medium" : "easy",
                    options: ["(a) Option 1", "(b) Option 2", "(c) Option 3", "(d) Option 4"],
                    correctAnswer: "(a)",
                    points: 1,
                    classLevel: "SS1",
                    term: "First Term",
                    examType: "Objectives",
                    department: subj === "Mathematics" || subj === "Physics" || subj === "Chemistry" || subj === "Biology" ? "Science" : "Others"
                };
                batch.set(ref, qData);
                ids.push(ref.id);
            }
            await batch.commit();
            createdQuestionIds[subj] = ids;
            console.log(`✅ Created 10 sample questions for ${subj}.`);
        }
    } else {
        console.log(`❓ Questions collection already has ${questionsSnap.size} question(s).`);
        questionsSnap.forEach(docSnap => {
            const data = docSnap.data();
            const subj = data.subject || "Government";
            if (!createdQuestionIds[subj]) createdQuestionIds[subj] = [];
            createdQuestionIds[subj].push(docSnap.id);
        });
    }

    // 4. Seed Exams if missing or empty
    const examsSnap = await getDocs(collection(db, "exams"));
    if (examsSnap.empty) {
        console.log("📝 Seeding Exams...");
        const examsToCreate = [
            {
                title: "Government SS1 First Term Examination",
                description: "Comprehensive 1st Term Objective Examination for SS1 Government.",
                subject: "Government",
                duration: 60,
                totalPoints: createdQuestionIds["Government"]?.length || 50,
                passingScore: 50,
                questionIds: createdQuestionIds["Government"] || [],
                numberOfQuestionsToDisplay: createdQuestionIds["Government"]?.length || 50,
                classLevel: "SS1",
                term: "First Term",
                examType: "Objectives",
                department: "Art",
                isActive: true
            },
            {
                title: "Mathematics SS1 First Term Examination",
                description: "Standard 1st Term Mathematics Examination for SS1 Students.",
                subject: "Mathematics",
                duration: 60,
                totalPoints: createdQuestionIds["Mathematics"]?.length || 10,
                passingScore: 50,
                questionIds: createdQuestionIds["Mathematics"] || [],
                numberOfQuestionsToDisplay: createdQuestionIds["Mathematics"]?.length || 10,
                classLevel: "SS1",
                term: "First Term",
                examType: "Objectives",
                department: "Science",
                isActive: true
            },
            {
                title: "English Language SS1 First Term Examination",
                description: "General English Language Objective Examination.",
                subject: "English",
                duration: 60,
                totalPoints: createdQuestionIds["English"]?.length || 10,
                passingScore: 50,
                questionIds: createdQuestionIds["English"] || [],
                numberOfQuestionsToDisplay: createdQuestionIds["English"]?.length || 10,
                classLevel: "SS1",
                term: "First Term",
                examType: "Objectives",
                department: "Others",
                isActive: true
            }
        ];

        for (const examData of examsToCreate) {
            await addDoc(collection(db, "exams"), {
                ...examData,
                createdAt: new Date()
            });
            console.log(`✅ Exam created: '${examData.title}' (${examData.questionIds.length} questions)`);
        }
    } else {
        console.log(`📝 Exams collection already has ${examsSnap.size} exam(s).`);
    }

    console.log("\n🎉 DATA SEEDING COMPLETE!");
    console.log("You can now view exams, questions, and students in the app dashboard.");
}

seedData().catch(err => {
    console.error("❌ Seeding Error:", err);
    process.exit(1);
});
