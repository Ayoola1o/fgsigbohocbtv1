const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../server/data/students.json');

function main() {
  if (!fs.existsSync(dataPath)) {
    console.error('students.json not found at', dataPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, 'utf8');
  let students = [];
  try {
    students = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse students.json:', err.message);
    process.exit(1);
  }

  let changed = 0;
  students = students.map((s) => {
    if (!s.classLevel) {
      changed++;
      return { ...s, classLevel: 'Unknown' };
    }
    return s;
  });

  fs.writeFileSync(dataPath, JSON.stringify(students, null, 2));
  console.log(`Updated ${changed} student(s). Written to ${dataPath}`);
}

main();
