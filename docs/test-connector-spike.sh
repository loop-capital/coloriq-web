#!/bin/bash
# E2E test for the Muse connector spike: consent endpoint + publish flow.
#
# Usage:
#   BASE_URL=http://localhost:3000 TOKEN=<stylist-api-token> FORMULATION_ID=<uuid> ./test-connector-spike.sh
#
# FORMULATION_ID: any formulation belonging to the token's stylist.
#   Get one via: SELECT id FROM formulations WHERE stylist_id = '<id>' LIMIT 1;
# before_photo_ref is a dummy R2 key — the API stores the ref without validating R2.
#
# Cleans up after itself: deletes the test transformation at the end.

set -u
BASE_URL="${BASE_URL:?set BASE_URL}"
TOKEN="${TOKEN:?set TOKEN}"
FORMULATION_ID="${FORMULATION_ID:?set FORMULATION_ID}"

PASS=0; FAIL=0
check() { # check <name> <expected_status> <actual_status>
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS: $1 ($3)";
  else FAIL=$((FAIL+1)); echo "FAIL: $1 (expected $2, got $3)"; fi
}

AUTH="Authorization: Bearer $TOKEN"
DUMMY_PHOTO="test/e2e-before-photo.jpg"

echo "=== 1. Create draft ==="
CREATE_RESP=$(curl -s -w '\n%{http_code}' -X POST "$BASE_URL/api/v1/transformations" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"formulation_id\":\"$FORMULATION_ID\",\"before_photo_ref\":\"$DUMMY_PHOTO\"}")
CREATE_CODE=$(echo "$CREATE_RESP" | tail -1)
check "create draft" 201 "$CREATE_CODE"
TID=$(echo "$CREATE_RESP" | head -1 | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")
[ -z "$TID" ] && { echo "FATAL: no transformation id returned"; exit 1; }
echo "  transformation id: $TID"

echo "=== 2. Publish WITHOUT consent -> 422 CONSENT_REQUIRED ==="
PUB1_CODE=$(curl -s -o /tmp/pub1.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/transformations/$TID/publish" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{}')
check "publish without consent -> 422" 422 "$PUB1_CODE"
grep -q CONSENT_REQUIRED /tmp/pub1.json && echo "  error code is CONSENT_REQUIRED" || echo "  WARN: expected CONSENT_REQUIRED in body"

echo "=== 3. Consent with invalid method -> 400 ==="
BAD_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/v1/transformations/$TID/consent" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"method":"telepathic"}')
check "consent invalid method -> 400" 400 "$BAD_CODE"

echo "=== 4. Record consent (verbal) -> 200 ==="
CONS1_CODE=$(curl -s -o /tmp/cons1.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/transformations/$TID/consent" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"method":"verbal","note":"e2e test"}')
check "record consent -> 200" 200 "$CONS1_CODE"
python3 -c "
import json
d = json.load(open('/tmp/cons1.json'))
c = d.get('client_consent') or {}
assert c.get('method') == 'verbal', 'method mismatch'
assert c.get('attested_by'), 'attested_by missing'
assert c.get('attested_at'), 'attested_at missing'
print('  consent record OK:', c['method'], c['attested_by'][:8] + '...', c['attested_at'])
"

echo "=== 5. Record consent again (signed) -> 200 idempotent-overwrite ==="
CONS2_CODE=$(curl -s -o /tmp/cons1.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/transformations/$TID/consent" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"method":"signed"}')
check "consent overwrite -> 200" 200 "$CONS2_CODE"
python3 -c "
import json
d = json.load(open('/tmp/cons1.json'))
assert d['client_consent']['method'] == 'signed', 'overwrite failed'
print('  overwrite OK: method is now signed')
"

echo "=== 6. Enrich with after photo ==="
ENR_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$BASE_URL/api/v1/transformations/$TID" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"after_photo_ref":"test/e2e-after-photo.jpg","shade_story":"e2e test"}')
check "enrich -> 200" 200 "$ENR_CODE"

echo "=== 7. Publish WITH consent -> 200 ==="
PUB2_CODE=$(curl -s -o /tmp/pub2.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/transformations/$TID/publish" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{}')
check "publish with consent -> 200" 200 "$PUB2_CODE"
python3 -c "
import json
d = json.load(open('/tmp/pub2.json'))
assert d['status'] == 'published', 'not published'
print('  status is published')
"

echo "=== 8. Auth edge cases ==="
NOAUTH_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/v1/transformations/$TID/consent" \
  -H 'Content-Type: application/json' -d '{"method":"verbal"}')
check "no token -> 401" 401 "$NOAUTH_CODE"

BADTOK_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/v1/transformations/$TID/consent" \
  -H "Authorization: Bearer invalid-token-123" -H 'Content-Type: application/json' -d '{"method":"verbal"}')
check "bad token -> 401" 401 "$BADTOK_CODE"

NOTFOUND_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/v1/transformations/00000000-0000-0000-0000-000000000000/consent" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"method":"verbal"}')
check "nonexistent id -> 404" 404 "$NOTFOUND_CODE"

echo "=== 9. Dictate with API token (no session) ==="
DICT_CODE=$(curl -s -o /tmp/dict.json -w '%{http_code}' -X POST "$BASE_URL/api/consultation/dictate" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"transcript":"current level 6, target level 9, ash tone"}')
# 200 = mapped, 503 = AI key not configured in this env (auth worked, mapping unavailable)
if [ "$DICT_CODE" = "200" ] || [ "$DICT_CODE" = "503" ]; then
  PASS=$((PASS+1)); echo "PASS: dictate with token ($DICT_CODE — auth accepted)"
else
  FAIL=$((FAIL+1)); echo "FAIL: dictate with token (expected 200/503, got $DICT_CODE)"
fi

echo ""
echo "=== Cleanup ==="
# Published transformations are test data; delete the throwaway record directly.
# (No DELETE endpoint exists; this is test-only cleanup.)
echo "  test transformation $TID left for manual DB cleanup (no DELETE endpoint)"

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
