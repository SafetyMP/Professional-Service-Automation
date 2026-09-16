---
applyTo: "**/*.{test,spec}.ts,**/*.{test,spec}.tsx,**/tests/**/*.ts,**/tests/**/*.tsx"
---

# Test standards (September 2026)

- Ship behavior with a test in the existing layout (co-located `*.test.ts` or `tests/`).
- Do not skip, delete, or weaken verify, lint, typecheck, or adversarial gates to land a change.
- Do not invent a passing gate from prose. Run the documented verify command.
- Fixtures are synthetic. Never commit real PII, PHI, payroll, or credentials.

## This repository

- Definition of Done: `./scripts/verify.sh` (same gate as `./scripts/harness/verify.sh`).
- Billing or profitability behavior updates the matching spec under `specs/domain/`.
