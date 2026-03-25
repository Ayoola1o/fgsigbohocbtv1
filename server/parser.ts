import * as fs from "fs";
import * as path from "path";
import mammoth from "mammoth";
import * as pdfParse from "pdf-parse";

interface Meta {
  classLevel: string;
  term: string;
  subject: string;
  department?: string;
}

interface ParsedQuestion {
  questionText: string;
  questionType: string;
  subject: string;
  difficulty: string;
  options?: string[];
  correctAnswer: string;
  points: number;
  classLevel: string;
  term: string;
  examType: string;
  imageUrl?: string;
  department?: string;
}

export function parseObjective(text: string, meta: Meta): ParsedQuestion[] {
  const questions = text.split(/\d+\./).filter(q => q.trim());

  return questions.map(q => {
    const lines = q.trim().split("\n");

    // First line is the question
    const questionText = lines[0].trim();

    const options: string[] = [];
    let correctAnswer = "";

    lines.slice(1).forEach(line => {
      // Match options: (a) Option1, A. Option1, (B) Option2
      const optMatch = line.match(/^\(?([a-dA-D])\)?[.)]\s*(.+)/);
      if (optMatch) {
        options.push(optMatch[2].trim());
      }

      // Match correct answer line: Answer: B or Answer B
      const ansMatch = line.match(/Answer[:\s]+([a-dA-D])/i);
      if (ansMatch) {
        correctAnswer = ansMatch[1].toUpperCase();
      }
    });

    return {
      classLevel: meta.classLevel || "Unknown",
      term: meta.term || "First Term",
      examType: "Objectives",
      subject: meta.subject || "Unknown",
      questionText,
      questionType: "multiple-choice",
      difficulty: "medium",
      points: 1,
      correctAnswer,
      options: options.join("|"),
      department: meta.department,
    };
  });
}

export function parseTheory(text: string, meta: Meta): ParsedQuestion[] {
  const questions = text.split(/\d+\./).filter((q) => q.trim());

  return questions.map((q) => {
    const questionText = q.trim();

    return {
      classLevel: meta.classLevel,
      term: meta.term,
      examType: "Theory",
      subject: meta.subject,
      questionText,
      questionType: "theory",
      difficulty: "medium",
      points: 10,
      correctAnswer: "",
      department: meta.department,
    };
  });
}

export function toCSV(data: ParsedQuestion[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((obj) =>
    Object.values(obj)
      .map((v) => `"${v}"`)
      .join(","),
  );
  return [headers, ...rows].join("\n");
}

export async function parseFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (ext === ".pdf") {
    const dataBuffer = fs.readFileSync(filePath);
    const result = await pdfParse(dataBuffer);
    return result.text;
  } else {
    throw new Error("Unsupported file type");
  }
}