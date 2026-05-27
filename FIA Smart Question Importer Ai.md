This is an incredibly smart product decision. One of the biggest friction points for teachers adopting a new CBT app is having to manually copy-paste hundreds of questions into a rigid CSV template. Teachers usually have their past questions saved in messy Microsoft Word (`.doc`/`.docx`) or Notepad (`.txt`) files.

Building a "Smart Importer" to bridge this gap will make your app highly requested. Since you want it to be "smart" (handling unstructured text gracefully), the best approach is to use an **LLM (Large Language Model) API** to parse the messy document and map it to your exact CSV headers: `classLevel, term, examType, subject, questionText, questionType, difficulty, points, correctAnswer, options`.

Here is the technical blueprint on how to build this feature for your backend.

### The 3-Step Architecture

#### 1. Text Extraction (Reading the File)

Before you can parse the questions, you need to extract the raw text from whatever file the teacher uploaded.

* **For `.txt` files:** This is trivial. You just read the file as a string.
* **For `.docx` files:** You cannot read these directly as text because they are compressed XML files. You will need a library. If you are using Node.js, use `mammoth` or `docx-parser`. If Python, use `python-docx`.

#### 2. The "Smart" Parsing Engine (LLM Integration)

Using Regular Expressions (Regex) to find "Question 1:", "A)", "B)" is a nightmare because teachers format documents inconsistently. Instead, pass the extracted text to an AI API (like OpenAI's GPT-4o-mini or Anthropic's Claude Haiku) and force it to return a structured JSON array.

You give the AI a "System Prompt" that tells it exactly what your CSV requires.

#### 3. CSV Generation

Once the AI returns a clean JSON object containing the questions, you use a standard CSV library to write that JSON into the exact template structure your CBT app expects, and offer it as a download (or push it straight to the database).

---

### Python Implementation Example

If your backend is in Python, here is exactly how you would write this script using the `openai` and `python-docx` libraries.

```python
import json
import csv
import docx # pip install python-docx
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

def extract_text_from_file(filepath):
    """Extracts raw text from .txt or .docx files."""
    if filepath.endswith('.txt'):
        with open(filepath, 'r', encoding='utf-8') as file:
            return file.read()
    elif filepath.endswith('.docx'):
        doc = docx.Document(filepath)
        return "\n".join([para.text for para in doc.paragraphs])
    else:
        raise ValueError("Unsupported file format")

def parse_questions_with_ai(raw_text, default_meta):
    """Uses LLM to convert messy text into structured JSON."""
    
    system_prompt = f"""
    You are an expert data parser for an educational CBT app. 
    The user will provide raw text containing test questions.
    Extract the questions, options, and correct answers.
    
    Return a JSON array of objects. Each object MUST have these exact keys:
    - classLevel (string, e.g., "{default_meta['classLevel']}")
    - term (string, e.g., "{default_meta['term']}")
    - examType (string, e.g., "{default_meta['examType']}")
    - subject (string, e.g., "{default_meta['subject']}")
    - questionText (string)
    - questionType (string, use "multiple_choice" or "fill_in_the_blank")
    - difficulty (string, use "Easy", "Medium", or "Hard")
    - points (integer, default to 1)
    - correctAnswer (string, the exact text of the correct option)
    - options (array of strings, e.g. ["Apple", "Banana", "Orange", "Grape"])
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": raw_text}
        ],
        response_format={ "type": "json_object" } # Forces strict JSON output
    )
    
    # Parse the JSON string returned by the AI into a Python dictionary
    return json.loads(response.choices[0].message.content)

def generate_cbt_csv(parsed_json, output_filename):
    """Converts the structured JSON into your exact CSV template."""
    headers = [
        "classLevel", "term", "examType", "subject", 
        "questionText", "questionType", "difficulty", 
        "points", "correctAnswer", "options"
    ]
    
    # Assuming the AI returns an object like {"questions": [...]}
    questions = parsed_json.get("questions", [])

    with open(output_filename, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=headers)
        writer.writeheader()
        
        for q in questions:
            # Convert the options array into a pipe-separated string or JSON string
            # depending on what your app expects. e.g., "A|B|C|D"
            q['options'] = "|".join(q['options']) 
            writer.writerow(q)

# ==========================================
# HOW TO USE IT
# ==========================================

# 1. The teacher uploads a messy file. You extract the text.
raw_text = extract_text_from_file("teacher_messy_questions.docx")

# 2. You ask the teacher for the "Global" settings for this file 
# so the AI doesn't have to guess the subject or class.
default_metadata = {
    "classLevel": "SS2",
    "term": "First Term",
    "examType": "Mid-Term",
    "subject": "Biology"
}

# 3. Send it to the Smart Parser
print("Analyzing document...")
structured_data = parse_questions_with_ai(raw_text, default_metadata)

# 4. Generate the exact CSV your app requires
generate_cbt_csv(structured_data, "ready_for_cbt_upload.csv")
print("Success! CSV generated.")

```

### Crucial UX Tips for this Feature

If you build this, you need to account for AI hallucinations or missing data in the teacher's original file (e.g., the teacher forgot to mark the correct answer in their Word doc).

1. **The "Review Screen" (Mandatory):** Never push the AI's output directly to the live database. Once the AI parses the document, show the teacher a "Preview Grid" on the frontend. Highlight any rows in **yellow** where the AI couldn't figure out the correct answer or the points, forcing the teacher to manually fix it before hitting "Finalize Import."
2. **Handling the `options` column:** In your CSV template, `options` is a single column. Decide *how* you want the options delimited inside that single cell. The safest bet is usually separating them with a pipe character `|` (e.g., `Lagos|Abuja|Kano|Ibadan`) or storing them as a stringified JSON array `["Lagos", "Abuja", "Kano", "Ibadan"]`.
3. **Prompt the user for Metadata:** A Word document full of questions usually doesn't state the `classLevel` or `term` next to every single question. Build a UI where the teacher selects the Subject, Term, and Class *before* they click upload. You then pass those global variables to the parser (as shown in the code above) so it can automatically fill those columns in the CSV.


use this one 

That makes perfect sense! Since you are building a web application, it is highly likely your backend is running on **Node.js (JavaScript/TypeScript)** or PHP.

If you are using **Node.js**, you can achieve the exact same "Smart Import" functionality using the official Google GenAI SDK for JavaScript.

Here is the complete Node.js blueprint to parse a messy Word document into your exact CSV template.

### 1. Install the Required Packages

You will need three packages: the Gemini SDK, `mammoth` (to read `.docx` files), and `csv-writer` (to easily generate the CSV).

Run this in your terminal:

```bash
npm install @google/genai mammoth csv-writer

```

### 2. The Node.js Implementation

Here is the complete, ready-to-run script. It uses Gemini's **Structured Outputs** (JSON Schema) to guarantee the API returns the exact columns your CBT app expects.

```javascript
import fs from 'fs';
import mammoth from 'mammoth';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// Initialize the Gemini Client
// Ensure you have set process.env.GEMINI_API_KEY in your environment
const ai = new GoogleGenAI({}); 

// 1. Define the exact JSON Schema for the output
const examBatchSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            description: "A list of exam questions extracted from the document.",
            items: {
                type: Type.OBJECT,
                properties: {
                    classLevel: { type: Type.STRING, description: "e.g., SS3, JSS1" },
                    term: { type: Type.STRING, description: "e.g., First Term" },
                    examType: { type: Type.STRING, description: "e.g., Mid-Term" },
                    subject: { type: Type.STRING, description: "e.g., Biology" },
                    questionText: { type: Type.STRING, description: "The actual question text" },
                    questionType: { type: Type.STRING, description: "Must be 'multiple_choice' or 'fill_in_the_blank'" },
                    difficulty: { type: Type.STRING, description: "Easy, Medium, or Hard" },
                    points: { type: Type.INTEGER, description: "Number of marks, default to 1" },
                    correctAnswer: { type: Type.STRING, description: "The exact text of the correct option" },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "An array of all available choices"
                    }
                },
                required: ["classLevel", "term", "examType", "subject", "questionText", "questionType", "difficulty", "points", "correctAnswer", "options"]
            }
        }
    },
    required: ["questions"]
};

// 2. Utility to extract text from a file
async function extractTextFromFile(filePath) {
    if (filePath.endsWith('.txt')) {
        return fs.promises.readFile(filePath, 'utf8');
    } else if (filePath.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    } else {
        throw new Error("Unsupported file format. Please upload .txt or .docx");
    }
}

// 3. Core Gemini Parsing Function
async function parseDocumentWithGemini(rawText, defaultMeta) {
    const prompt = `
    Analyze the following messy text from a teacher's exam paper document. 
    Extract all the questions, their options, and identify the correct answer.
    
    For fields like classLevel, term, examType, and subject, if they are not explicitly 
    stated in the text for an individual question, fallback to these default values:
    - classLevel: ${defaultMeta.classLevel}
    - term: ${defaultMeta.term}
    - examType: ${defaultMeta.examType}
    - subject: ${defaultMeta.subject}
    
    Document text to parse:
    ---
    ${rawText}
    ---
    `;

    console.log("Sending text to Gemini for analysis...");

    const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: examBatchSchema,
            temperature: 0.1 // Low temperature for strict, factual parsing
        }
    });

    // The response is guaranteed to be a JSON string matching our schema
    return JSON.parse(response.text());
}

// 4. Save to CSV matching your template
async function saveToCsv(parsedData, outputFilename) {
    const csvWriter = createCsvWriter({
        path: outputFilename,
        header: [
            { id: 'classLevel', title: 'classLevel' },
            { id: 'term', title: 'term' },
            { id: 'examType', title: 'examType' },
            { id: 'subject', title: 'subject' },
            { id: 'questionText', title: 'questionText' },
            { id: 'questionType', title: 'questionType' },
            { id: 'difficulty', title: 'difficulty' },
            { id: 'points', title: 'points' },
            { id: 'correctAnswer', title: 'correctAnswer' },
            { id: 'options', title: 'options' }
        ]
    });

    const records = parsedData.questions.map(q => {
        // Convert the options array into a pipe-separated string: "A|B|C|D"
        q.options = q.options.join('|');
        return q;
    });

    await csvWriter.writeRecords(records);
}

// ==========================================
// RUNNING THE PIPELINE
// ==========================================
async function main() {
    try {
        const filePath = "messy_exam_questions.docx"; // Path to the uploaded file
        const outputCsv = "ready_for_cbt_upload.csv";
        
        // Metadata provided by the teacher in your app's frontend
        const uiMetadata = {
            classLevel: "SS3",
            term: "Mock Exam",
            examType: "CBT Test",
            subject: "Fisheries" 
        };

        const rawText = await extractTextFromFile(filePath);
        const parsedJson = await parseDocumentWithGemini(rawText, uiMetadata);
        await saveToCsv(parsedJson, outputCsv);
        
        console.log(`Success! Converted unstructured file into '${outputCsv}'`);

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();

```

### How to integrate this into your App flow:

1. **The Upload Route:** When a teacher uploads a `.docx` file on the frontend, your Express/Node.js backend catches it (using `multer` or a similar middleware).
2. **The Processing Phase:** You pass the file path directly into the script above. Gemini parses it.
3. **The Response:** Instead of generating a physical CSV file and saving it to your server's disk (which can be messy), you can skip step 4 entirely! Just take the `parsedJson` array and `INSERT` those objects directly into your database.

If you are using a different language altogether (like PHP, C#, or Java), let me know! The logic remains exactly the same; you just swap out the SDK.