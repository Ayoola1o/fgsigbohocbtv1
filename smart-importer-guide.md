# FIA Smart Question Importer Guide

This guide outlines how to use the AI Smart Importer in the Faith Immaculate Academy CBT app, and the formatting rules for typing questions in Word (`.docx`) or Notepad (`.txt`) documents to guarantee a seamless import.

---

## 🚀 How to Use the Smart Importer

1. **Log in as Admin** and navigate to the **Question Bank** or **Questions** tab.
2. Select the **Import Options** and choose **AI Smart Importer**.
3. **Configure Global Metadata:**
   * Select the default **Class Level** (e.g., SS3, JSS1).
   * Select the **Academic Term** (e.g., First Term, Second Term).
   * Select the **Exam Type** (**Objectives** for multiple-choice, or **Theory** for essays).
   * Select the default **Subject** and **Department**.
   * *Note: These serve as fallbacks if the document itself does not contain explicit headings indicating these details.*
4. **Choose Import Method:**
   * **Paste Text:** Copy and paste the raw text from your question document directly into the text field.
   * **Upload File:** Select and upload your `.docx` (Microsoft Word) or `.txt` (plain text) file.
5. **Click "Import with AI"**:
   * The system will use Google Gemini AI to analyze, extract, and format your questions.
   * If running on `localhost`, the file uploads will automatically fall back to the local Express backend, bypassing external cloud storage limits.
6. **Review & Finalize:**
   * Once parsed, questions will load into the **Review Grid**.
   * Any missing fields (like a question missing options or a correct answer key) will be highlighted.
   * Make any necessary edits directly in the grid, then click **Upload All** to save them to the database.

---

## 📝 Document Formatting & Question Styles

The Google Gemini AI parser is extremely robust and can handle most unstructured text formats. However, adhering to the recommended patterns below ensures a **100% accurate parse** and maintains compatibility with the local regex fallback parser.

### A. Objectives (Multiple-Choice) Format

* **Questions:** Each question must start with a clear number on a new line (e.g., `1.`, `2)`, or `Q3:`).
* **Options:** Use clear letter prefixes such as `A) `, `B. `, `(C) `, or `[D] `. You can list options on separate lines or on the same line.
* **Correct Answer Keys:** You can specify the correct answer in one of two ways:
  1. Add an asterisk `*` or `(correct)` immediately next to the right choice.
  2. Or, add an `Answer` line directly beneath the options (e.g., `Answer: B`).

#### Example Format:
```text
1. Which of the following organelles is the powerhouse of the cell?
A) Nucleus
B) Mitochondrion
C) Ribosome
D) Lysosome
Answer: B

2. What is the basic unit of life?
A) Tissue
B) Organ
C) Cell *
D) Organism
```

---

### B. Theory / Essay Format

When importing theoretical, essay, or fill-in-the-blank questions:
* Ensure you select **Theory** as the **Exam Type** in the importer before processing.
* Write each question on a new line starting with a number.
* Do not include options or answers. The importer will automatically set their type to `theory` or `essay` and allocate a default points value (e.g., `5`).

#### Example Format:
```text
1. Explain the theory of relativity.
2. Write a short essay detailing the steps of photosynthesis.
3. Define osmotic pressure and its biological importance.
```
