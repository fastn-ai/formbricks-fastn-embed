#!/usr/bin/env bash
# Send a Formbricks-shaped response.finished event to the fastn webhook trigger, the same way
# apps/web/modules/fastn/lib/events.ts does. Reads FASTN_API_KEY and FASTN_WEBHOOK_URL
# from .env. Covers the trigger test cases in fastn/PLAN.md:
#
#   fastn/send-test-event.sh <formbricks-org-id>        TC-T01: 2xx, then a message in the channel
#                                                         the customer picked (run twice for TC-T02:
#                                                         still one message)
#   fastn/send-test-event.sh not-a-customer             TC-T03: 400 "... is not a customer ..."
#   NO_KEY=1 fastn/send-test-event.sh <org-id>          TC-T04: 401
#
# RESPONSE_ID=<id> overrides the response id (default: a fresh one per run).
set -euo pipefail
cd "$(dirname "$0")/.."

org="${1:?usage: fastn/send-test-event.sh <formbricks-organization-id>}"
env_file=".env"
get() { grep -E "^$1=" "$env_file" | tail -1 | cut -d= -f2-; }
url="$(get FASTN_WEBHOOK_URL)"
key="$(get FASTN_API_KEY)"
[ -n "$url" ] || { echo "FASTN_WEBHOOK_URL is not set in $env_file" >&2; exit 1; }
if [ -z "${NO_KEY:-}" ] && [ -z "$key" ]; then echo "FASTN_API_KEY is not set in $env_file" >&2; exit 1; fi

rid="${RESPONSE_ID:-test-$(date +%s)}"
now="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
body=$(cat <<JSON
{"event":"response.finished","occurredAt":"$now",
 "customer":{"id":"$org","name":"Acme"},
 "survey":{"id":"test-survey","name":"Test: product feedback","type":"link"},
 "response":{"id":"$rid","createdAt":"$now","url":"http://localhost:3000",
   "answers":[{"question":"How likely are you to recommend us?","answer":"9"},
              {"question":"What should we improve?","answer":"Sent by fastn/send-test-event.sh"}],
   "contact":null}}
JSON
)

headers=(-H "content-type: application/json" -H "x-end-org-id: $org")
[ -n "${NO_KEY:-}" ] || headers+=(-H "x-api-key: $key")

echo "POST $url  (x-end-org-id: $org, response.id: $rid)"
curl -sS -w "\nHTTP %{http_code}\n" -X POST "$url" "${headers[@]}" --data "$body"
