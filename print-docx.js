import mammoth from 'mammoth';

const docxPath = 'c:\\Users\\PC\\Fia-Cbt-main\\fgsigbohocbtv1\\Exam Question\\Economics SS1.docx';

async function run() {
  try {
    const result = await mammoth.extractRawText({ path: docxPath });
    const text = result.value;
    console.log('=== FULL DOCUMENT TEXT ===');
    console.log(text);
    console.log('=== END OF DOCUMENT TEXT ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
