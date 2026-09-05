# AGENTS.md — consulting realization kernel

Community contract for contributors and coding agents. Factory/site overlay (corporate handoff, digest-bound gates) lives in [`docs/factory-overlay.md`](docs/factory-overlay.md). Product positioning: [`docs/DESIGN-PIVOT.md`](docs/DESIGN-PIVOT.md).

This repo is a **realization kernel** (utilization, WIP, contract/milestone billing, partner-level profitability, Postgres RLS). Timesheets are an input — do not delete `lib/time`. Do not merge this tree with HR-ERP.

## Domain contracts

Nested `AGENTS.md` files own each public `service.ts`. Cross-domain imports go through those services only (`npm run check:boundaries`).

| Module | Contract |
|--------|----------|
| Time (input to realization) | [`lib/time/AGENTS.md`](lib/time/AGENTS.md) |
| Billing / WIP / invoices | [`lib/billing/AGENTS.md`](lib/billing/AGENTS.md) |
| Projects | [`lib/projects/AGENTS.md`](lib/projects/AGENTS.md) |
| Resources / utilization | [`lib/resources/AGENTS.md`](lib/resources/AGENTS.md) |
| Expenses | [`lib/expenses/AGENTS.md`](lib/expenses/AGENTS.md) |
| Clients | [`lib/clients/AGENTS.md`](lib/clients/AGENTS.md) |

Related specs: [`specs/domain/billing-rules.md`](specs/domain/billing-rules.md), [`specs/domain/profitability-rules.md`](specs/domain/profitability-rules.md). Tenancy: `withOrgContext()` + PostgreSQL RLS.

## Commands

Either path is valid. `scripts/verify.sh` execs the harness script.

| Command | Purpose |
|---------|---------|
| `./scripts/verify.sh` | Definition of Done (lint, typecheck, unit tests, boundaries, Prisma validate) |
| `./scripts/harness/verify.sh` | Same gate (digest-bound path; wrappers stay outside the digest) |

```bash
./scripts/verify.sh
```

## Definition of Done

- Domain logic stays in `lib/<domain>/service.ts`.
- Billing or profitability behavior updates the matching spec.
- `./scripts/verify.sh` (or `./scripts/harness/verify.sh`) passes before a PR.
- No secrets, `.env` values, or production use of demo credentials.
