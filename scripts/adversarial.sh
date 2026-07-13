#!/usr/bin/env bash
# Tier-3 adversarial oracle — unauthenticated integration routes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${ADVERSARIAL_BASE_URL:-http://localhost:3000}"

log() { echo ""; echo "== adversarial: $* =="; }

if ! curl -fsS "$BASE" >/dev/null 2>&1; then
  echo "App not running at $BASE — start dev server or run integration-e2e first" >&2
  exit 1
fi

# deny_case: anonymous_quickbooks_connect
log "anonymous_quickbooks_connect (expect 401)"
code=$(curl -s -o /tmp/psa-adversarial.json -w "%{http_code}" \
  "$BASE/api/integrations/quickbooks/connect")
[[ "$code" == "401" ]]
grep -qi 'Unauthorized' /tmp/psa-adversarial.json
echo "  ${code} (as expected)"

echo ""
echo "adversarial: ok"
