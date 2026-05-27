import fs from "fs";
import mammoth from "mammoth";

/**
 * Extracts raw text from a text file or docx file path.
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  if (filePath.endsWith(".txt")) {
    return fs.promises.readFile(filePath, "utf8");
  } else if (filePath.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else {
    throw new Error("Unsupported file format. Please upload .txt or .docx");
  }
}
