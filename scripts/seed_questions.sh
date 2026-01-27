#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:5000"
SUBJECTS=(Math English Physics Chemistry Biology)
NUM=30

mkdir -p tmp
rm -f tmp/*.ids

echo "Seeding questions to $BASE_URL..."

for subj in "${SUBJECTS[@]}"; do
  echo "Creating questions for $subj"
  for i in $(seq 1 $NUM); do
    # Decide type distribution: first 20 MC, next 5 TF, last 5 short
    if [ $i -le 20 ]; then
      qtype="multiple-choice"
      options=("Option A" "Option B" "Option C" "Option D")
      correctIndex=$(( (i % 4) + 1 ))
      correct="${options[$((correctIndex-1))]}"
      options_json=$(printf '"%s",' "${options[@]}" | sed 's/,$//')
      options_field=", \"options\": [${options_json}]"
    elif [ $i -le 25 ]; then
      qtype="true-false"
      if [ $((i%2)) -eq 0 ]; then
        correct="True"
      else
        correct="False"
      fi
      options_field=""
    else
      qtype="short-answer"
      correct="Answer for ${subj} question ${i}"
      options_field=""
    fi

    diff_levels=(easy medium hard)
    # rotate difficulty
    dindex=$(( (i-1) % 3 ))
    diff=${diff_levels[$dindex]}

    points=1
    if [ "$diff" = "medium" ]; then points=2; fi
    if [ "$diff" = "hard" ]; then points=3; fi

    question_text="${subj} sample question ${i}: Explain or choose the correct answer."

    # Build JSON payload
    payload=$(cat <<JSON
{
  "questionText": "${question_text}",
  "questionType": "${qtype}",
  "subject": "${subj}",
  "difficulty": "${diff}",
  "correctAnswer": "${correct}",
  "points": ${points}${options_field}
}
JSON
)

    # Post question
    resp=$(curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$BASE_URL/api/questions")
    id=$(echo "$resp" | sed -n 's/.*"id"\s*:\s*"\([^"]*\)".*/\1/p')
    if [ -z "$id" ]; then
      echo "Failed to create question. Response: $resp"
      exit 1
    fi
    echo "$id" >> tmp/${subj}.ids
    printf "."
  done
  echo "\nCreated ${NUM} questions for $subj"

  # Create exam for this subject
  qids=$(jq -R -s -c 'split("\n")[:-1]' tmp/${subj}.ids)
  exam_payload=$(cat <<JSON
{
  "title": "${subj} Sample Exam",
  "description": "A ${NUM}-question sample exam for ${subj}.",
  "subject": "${subj}",
  "duration": 90,
  "passingScore": 50,
  "questionIds": ${qids}
}
JSON
)
  exam_resp=$(curl -s -X POST -H "Content-Type: application/json" -d "$exam_payload" "$BASE_URL/api/exams")
  exam_id=$(echo "$exam_resp" | sed -n 's/.*"id"\s*:\s*"\([^"]*\)".*/\1/p')
  echo "Created exam for $subj: $exam_id"
  echo "$exam_id" > tmp/${subj}.exam.id
done

echo "Seeding completed. Exam IDs:"
for subj in "${SUBJECTS[@]}"; do
  echo "${subj}: $(cat tmp/${subj}.exam.id)"
done
