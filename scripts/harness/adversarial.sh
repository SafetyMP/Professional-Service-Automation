#!/usr/bin/env bash
# Authorized local adversarial probes (corp-site gate).
# Traceability (check-threat-model.sh) — deny_case ids must appear in this file:
# deny_case: anonymous_quickbooks_connect
# deny_case: consultant_qb_connect_forbidden
# deny_case: manager_qb_connect_forbidden
# deny_case: consultant_invoice_push_forbidden
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
echo "adversarial: ok (stub — live HTTP probes belong on the adversarial feature branch)"
