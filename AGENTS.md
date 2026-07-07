# AGENTS.md

Professional Services Automation (PSA) platform — project management for professional services firms.

Harness profile: **fleet** (`specs/MANDATE.md` is DRAFT).

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL · Prisma 7 · Auth.js · Tailwind

## Commands

| Command | Purpose |
|---------|---------|
| `docker compose up -d` | Start Postgres (port 5440) |
| `npm install` | Install dependencies |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo firm |
| `npm run dev` | Dev server (default localhost:3000; use `-p 3005` if needed) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Vitest unit tests |
| `npm run check:boundaries` | Module import boundary lint |
| `./scripts/verify.sh` | Definition of Done (lint, typecheck, test, boundaries, prisma, harness) |
| `~/.cursor/bin/harness check` | Full harness contract + verify |
| GitHub Actions CI (`.github/workflows/ci.yml`) | Same `./scripts/verify.sh` with Postgres service |

## Demo login

- Organization: `demo-firm`
- Admin: `admin@demo.com` / `password123`

## Module boundaries

Domain logic lives in `lib/<domain>/`. Cross-domain imports must go through public service files only. See `scripts/check-boundaries.ts`.

| Domain | Path |
|--------|------|
| clients | `lib/clients/service.ts` |
| projects | `lib/projects/service.ts` |
| time | `lib/time/service.ts` |
| expenses | `lib/expenses/service.ts` |
| resources | `lib/resources/service.ts` |
| billing | `lib/billing/service.ts` |
| reporting | `lib/reporting/service.ts` |

## Definition of Done

```bash
./scripts/verify.sh
```

## Fleet

- `specs/MANDATE.md` — set `Status: ACTIVE` only after user commits executor signature.
- Run `docker compose up -d` from the **main repo root** only — not from agent worktrees.
- Do not run compose or integration scripts from `.worktrees/` paths.

## Review

Block on P0/P1: auth bypass, cross-tenant data leak, billing math errors, data loss.
