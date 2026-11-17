import fs from "fs";
import path from "path";
import mammoth from "mammoth";
// @ts-ignore CommonJS package exposes a Buffer-based extractor.
import WordExtractor from "word-extractor";

export async function extractDocument(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (buffer.length > 5 * 1024 * 1024) throw new Error("Document exceeds 5 MB.");
  let text: string;
  if (ext === '.doc') text = (await new WordExtractor().extract(buffer)).getBody();
  else if (ext === '.docx') text = (await mammoth.extractRawText({ buffer })).value;
  else if (ext === '.txt' || ext === '.csv') text = buffer.toString('utf8');
  else throw new Error('Supported formats: .doc, .docx, .txt and .csv');
  if (!text.trim()) throw new Error('No readable text found. Scanned documents need OCR before import.');
  if (text.length > 250000) throw new Error('Document text is too large; split the paper into smaller files.');
  return text;
}
export async function extractTextFromFile(filePath: string): Promise<string> {
  return extractDocument(await fs.promises.readFile(filePath), filePath);
}
