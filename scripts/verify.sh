#!/usr/bin/env bash
# Definition of Done — mirrors CI `verify` job steps before Postgres/build (no DB).
# Full e2e: CI runs ci-setup-db with SEED_DEMO then playwright (see .github/workflows/ci.yml).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  corepack prepare npm@10.9.2 --activate >/dev/null 2>&1 || true
fi

echo "==> npm ci (expect packageManager npm@10.9.2)"
npm ci

echo "==> lint + typecheck + test + boundaries + prisma"
npm run lint
npm run typecheck
npm run test
npm run check:boundaries
npx prisma validate

if [[ -z "${CURSOR_VERIFY_SKIP:-}" ]]; then
  HARNESS="${HARNESS:-$HOME/.cursor/bin/harness}"
  if [[ -x "$HARNESS" ]]; then
    echo "==> harness contract"
    "$HARNESS" check --contract
  fi
fi

echo "verify: ok (ci/web parity; CI adds Postgres + build + e2e)"
