#!/bin/bash
# Verifies that two users cannot see each other's entries.
# Run with:  bash test-isolation.sh
set -e
API=http://localhost:3000

echo "my test document about cats" > /tmp/test.txt

signin() {
  curl -s -X POST "$API/auth/signin" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"password123\"}" |
    sed -E 's/.*"accessToken":"([^"]+)".*/\1/'
}

signup() {
  curl -s -o /dev/null -X POST "$API/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"password123\"}"
}

echo "--- creating users ---"
signup a@test.com
signup b@test.com

TOKEN_A=$(signin a@test.com)
TOKEN_B=$(signin b@test.com)
echo "A token: ${TOKEN_A:0:25}..."
echo "B token: ${TOKEN_B:0:25}..."

echo
echo "--- A uploads a file ---"
UPLOAD=$(curl -s -X POST "$API/entries/upload" \
  -H "Authorization: Bearer $TOKEN_A" \
  -F "file=@/tmp/test.txt")
echo "$UPLOAD"
ENTRY_A=$(echo "$UPLOAD" | sed -E 's/.*"id":"([^"]+)".*/\1/')

echo
echo "--- A lists entries (expect: A's entry) ---"
curl -s "$API/entries" -H "Authorization: Bearer $TOKEN_A"

echo
echo
echo "--- B lists entries (expect: []) ---"
curl -s "$API/entries" -H "Authorization: Bearer $TOKEN_B"

echo
echo
echo "--- B reads A's entry directly (expect: 404) ---"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  "$API/entries/$ENTRY_A" -H "Authorization: Bearer $TOKEN_B"

echo "--- B deletes A's entry (expect: 404) ---"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X DELETE "$API/entries/$ENTRY_A" -H "Authorization: Bearer $TOKEN_B"

echo "--- no token at all (expect: 401) ---"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$API/entries"
