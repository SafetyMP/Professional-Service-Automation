#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d node_modules ]]; then
  echo "Run npm install first" >&2
  exit 1
fi

echo "== lint =="
npm run lint

echo "== typecheck =="
npm run typecheck

echo "== test =="
npm run test

echo "== boundaries =="
npm run check:boundaries

echo "== prisma =="
npx prisma validate

if [[ -z "${CURSOR_VERIFY_SKIP:-}" ]]; then
  HARNESS="${HARNESS:-$HOME/.cursor/bin/harness}"
  if [[ -x "$HARNESS" ]]; then
    echo "== harness contract =="
    "$HARNESS" check --contract
  fi
fi

echo "verify: ok"
