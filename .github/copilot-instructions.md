# Copilot / community agents

This repository is a **consulting realization kernel**, not a generic time tracker. Start at [AGENTS.md](../AGENTS.md). Factory/site overlay: [docs/factory-overlay.md](../docs/factory-overlay.md). Positioning: [docs/DESIGN-PIVOT.md](../docs/DESIGN-PIVOT.md).

## Domain contracts

- [lib/time/AGENTS.md](../lib/time/AGENTS.md)
- [lib/billing/AGENTS.md](../lib/billing/AGENTS.md)
- [lib/projects/AGENTS.md](../lib/projects/AGENTS.md)
- [lib/resources/AGENTS.md](../lib/resources/AGENTS.md)
- [lib/expenses/AGENTS.md](../lib/expenses/AGENTS.md)
- [lib/clients/AGENTS.md](../lib/clients/AGENTS.md)

## Verify

- `./scripts/verify.sh`
- `./scripts/harness/verify.sh` (same gate)

## Never

- Never delete timesheets or `lib/time` — they are input to realization, not dead code.
- Never treat this repo as Kimai, Akaunting, or a generic PSA clone.
- Never merge this tree with HR-ERP or move payroll/ESS here.
- Never bypass PostgreSQL RLS or `withOrgContext()` for convenience.
- Never import another domain’s internals; use that module’s `service.ts`.
- Never commit secrets, `.env` files, or treat demo credentials as production.
- Never self-approve, invent a gate PASS, or skip `./scripts/verify.sh`.
