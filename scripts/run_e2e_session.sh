#!/usr/bin/env bash
set -euo pipefail

EXAM_ID="d654579b-c970-46cc-9183-32779e515f3c"
BASE="http://localhost:5000"

echo "1) Create exam session for exam $EXAM_ID"
session_resp=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"examId\":\"$EXAM_ID\",\"studentName\":\"Integration Tester\",\"studentId\":\"tester-1\"}" "$BASE/api/exam-sessions")
echo "$session_resp" | jq '.'
session_id=$(echo "$session_resp" | jq -r '.id')
if [ -z "$session_id" ] || [ "$session_id" = "null" ]; then
  echo "Failed to create session" >&2
  exit 1
fi

echo "Session ID: $session_id"

echo
 echo "2) Fetch exam questions and build answers mapping (using correct answers)"
questions=$(curl -s "$BASE/api/exams/$EXAM_ID/questions")
echo "Sample question:"
echo "$questions" | jq '.[0]'

answers_json=$(echo "$questions" | jq 'map({(.id): .correctAnswer}) | add')

echo "Answers JSON sample entry:"
echo "$answers_json" | jq 'to_entries[0]'

echo
echo "3) Submit answers to /api/exam-sessions/$session_id/submit"
submit_payload=$(jq -n --argjson a "$answers_json" '{answers: $a}')
echo "$submit_payload" | jq '.'
submit_resp=$(curl -s -X POST -H "Content-Type: application/json" -d "$submit_payload" "$BASE/api/exam-sessions/$session_id/submit")

echo "Submit response:"
echo "$submit_resp" | jq '.'

result_id=$(echo "$submit_resp" | jq -r '.id // empty')

if [ -n "$result_id" ]; then
  echo
  echo "4) Fetching result by id: $result_id"
  curl -s "$BASE/api/results/$result_id" | jq '.'
else
  echo
  echo "No result id returned separately; submission response contained the result above."
fi
