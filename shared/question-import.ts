export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { if (quoted && input[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && c === ',') { row.push(field); field = ''; }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field); if (row.some(value => value.trim())) rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(field); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function questionCsv(rows: Record<string, any>[]): string {
  const columns = ['questionText','questionType','difficulty','options','correctAnswer','points','imageUrl','classLevel','term','examType','subject','department'];
  const quote = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  return [columns.join(','), ...rows.map(row => columns.map(key => quote(key === 'options' ? JSON.stringify(row.options || []) : row[key])).join(','))].join('\r\n');
}

export function importQuestionErrors(row: any): string[] {
  const errors: string[] = [];
  if (!row || typeof row !== 'object') return ['Invalid question'];
  if (typeof row.questionText !== 'string' || !row.questionText.trim()) errors.push('Question text is required');
  const answer = typeof row.correctAnswer === 'string' ? row.correctAnswer.trim() : '';
  const options: string[] = Array.isArray(row.options) ? row.options.filter((option: unknown): option is string => typeof option === 'string') : [];
  if (!['multiple-choice', 'true-false', 'short-answer', 'theory'].includes(row.questionType)) errors.push('Invalid question type');
  if (!Number.isInteger(Number(row.points)) || Number(row.points) <= 0) errors.push('Points must be a positive integer');
  if (row.questionType === 'multiple-choice') {
    if (options.length < 2 || options.length !== row.options?.length || options.some(option => !option.trim())) errors.push('At least two nonempty text options are required');
    if (!answer || !options.some(option => option.trim().toLowerCase() === answer.toLowerCase())) errors.push('Choose a correct answer from the options');
  } else if (row.questionType === 'true-false' && !['true','false'].includes(answer.toLowerCase())) errors.push('Correct answer must be true or false');
  else if (row.questionType === 'short-answer' && !answer) errors.push('Correct answer is required');
  return errors;
}
