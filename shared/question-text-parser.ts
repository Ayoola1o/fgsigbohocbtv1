export function splitAnswerKey(text: string) {
  const match = /^\s*(?:answer\s*key|answers|marking\s*scheme)\s*:?[ \t]*$/im.exec(text);
  const body = match ? text.slice(0, match.index) : text;
  const keyText = match ? text.slice(match.index + match[0].length) : '';
  const answerKey: Record<string, string> = {};
  for (const entry of Array.from(keyText.matchAll(/(?:^|[\s,;])(\d+)\s*[.):=\-]\s*([a-e]|true|false)(?=$|[\s,;])/gi))) answerKey[entry[1]] = entry[2];
  return { body, keyText, answerKey };
}

  const extractSameLineOptions = (text: string) => {
    // 1. Try parenthesized: (a) OptionText (b) OptionText...
    let matches = Array.from(text.matchAll(/\(([a-eA-E])\)\s*([^\s].*?)(?=\s+\(([a-eA-E])\)|$)/g));
    if (matches.length > 0) {
      return matches.map(m => ({
        letter: m[1],
        val: m[2],
        full: m[0]
      }));
    }

    // 2. Try bracketed: a) OptionText b) OptionText...
    matches = Array.from(text.matchAll(/(?:\s|^)([a-eA-E])\)\s*([^\s].*?)(?=\s+[a-eA-E]\)|$)/g));
    if (matches.length > 0) {
      return matches.map(m => ({
        letter: m[1],
        val: m[2],
        full: m[0].trim()
      }));
    }

    // 3. Try dotted: a. OptionText b. OptionText...
    // Resilient: \.\s* instead of \.\s+
    matches = Array.from(text.matchAll(/(?:\s|^)([a-eA-E])\.\s*([^\s].*?)(?=\s+[a-eA-E]\.|$)/g));
    if (matches.length > 0) {
      return matches.map(m => ({
        letter: m[1],
        val: m[2],
        full: m[0].trim()
      }));
    }

    return [];
  };

export const parseTextToQuestions = (text: string) => {
    const { body, answerKey } = splitAnswerKey(text);
    const lines = body.split(/\r?\n/);
    const questionsList: any[] = [];
    let currentQuestion: any = null;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for Question start: "1. ", "Question 1: ", "1) "
      const questionMatch = trimmed.match(/^(?:question\s*(\d+)[:.]?|(\d+)[\s.)\]:-]+)\s*(.+)/i);
      if (questionMatch) {
        if (currentQuestion) {
          questionsList.push(currentQuestion);
        }
        
        const restOfText = questionMatch[3].trim();
        currentQuestion = {
          questionText: restOfText,
          options: [] as string[],
          correctAnswer: answerKey[questionMatch[1] || questionMatch[2]] || "",
          questionType: "multiple-choice",
          difficulty: "medium",
          points: 1,
        };

        // Check for same-line options using sequential parser
        const optMatches = extractSameLineOptions(restOfText);
        if (optMatches.length > 0) {
          const firstOptIndex = restOfText.indexOf(optMatches[0].full);
          currentQuestion.questionText = restOfText.substring(0, firstOptIndex).trim();
          for (const m of optMatches) {
            currentQuestion.options.push(`(${m.letter.toLowerCase()}) ${m.val.trim()}`);
          }
        }
        continue;
      }

      if (!currentQuestion) continue;

      // Check for correct answer start: "Answer: ", "Correct: ", "Ans. "
      const answerMatch = trimmed.match(/^\s*(?:correct\s*|key\s*|correct\s*option\s*)?ans(?:wer)?\s*[:.=-]*\s*(.+)/i);
      if (answerMatch) {
        currentQuestion.correctAnswer = answerMatch[1].trim();
        continue;
      }

      // Check for options start: "A. OptionText" or "(A) OptionText" or "A) OptionText"
      // Extremely robust check to ensure it actually starts with a valid option prefix
      const isOptionStart = /^\s*(?:\(([a-eA-E])\)|([a-eA-E])[.)\]:-]+)/i.test(trimmed);
      if (isOptionStart) {
        const optMatches = Array.from(trimmed.matchAll(/(?:\(?([a-eA-E])\)?[\s.)\]:-]+)\s*([^\s].*?)(?=\s+(?:\(?([a-eA-E])\)?[\s.)\]:-]+)|$)/g));
        if (optMatches.length > 0) {
          for (const m of optMatches) {
            const letter = m[1].toUpperCase();
            const optionVal = m[2].trim();
            currentQuestion.options.push(`(${letter.toLowerCase()}) ${optionVal}`);
          }
          continue;
        }
      }

      if (currentQuestion.options.length && !currentQuestion.correctAnswer) {
        currentQuestion.options[currentQuestion.options.length - 1] += "\n" + trimmed;
        continue;
      }
      // Otherwise, treat as continuation of question text
      if (currentQuestion.options.length === 0 && !currentQuestion.correctAnswer) {
        currentQuestion.questionText += "\n" + trimmed;
      }
    }

    if (currentQuestion) {
      questionsList.push(currentQuestion);
    }

    // Normalize post-process
    return questionsList.map(q => {
      const lowerOpts = q.options.map((o: string) => o.replace(/^\([a-e]\)\s*/i, '').trim().toLowerCase());
      const isTrueFalse = q.options.length === 2 &&
        lowerOpts.some((o: string) => o === "true") &&
        lowerOpts.some((o: string) => o === "false");

      if (isTrueFalse) {
        const letter = q.correctAnswer.trim().match(/^\(?([a-b])\)?[.)]?$/i);
        if (letter) q.correctAnswer = q.options[letter[1].toLowerCase().charCodeAt(0) - 97].replace(/^\([a-b]\)\s*/i, '').trim();
        q.questionType = "true-false";
        q.options = undefined;
      } else if (q.options.length === 0) {
        q.questionType = "theory";
        q.options = undefined;
        if (!q.correctAnswer) q.correctAnswer = "";
      }

      return q;
    });
  };

