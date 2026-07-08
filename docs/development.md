# Development Guide

This guide covers day-to-day development on the PSA platform: architecture, workflows, testing, and common tasks.

## Architecture overview

```
src/app/          Next.js App Router (pages, server actions, API routes)
lib/<domain>/     Domain services (business logic, Prisma access)
prisma/           Schema, migrations, RLS policies
specs/domain/     Billing, profitability, and entity rules
tests/            Vitest unit tests
```

**Multi-tenancy:** All database access goes through `withOrgContext()` in `lib/tenancy/with-org-context.ts`, which sets PostgreSQL session variable `app.current_org_id` for row-level security.

**Module boundaries:** Domain modules must not import each other's internals. Cross-domain calls go through public `service.ts` files. Enforced by `scripts/check-boundaries.ts`.

| Domain | Service | Responsibility |
|--------|---------|----------------|
| clients | `lib/clients/service.ts` | Client CRUD |
| projects | `lib/projects/service.ts` | Projects, tasks, members |
| time | `lib/time/service.ts` | Time entries, approval |
| expenses | `lib/expenses/service.ts` | Expense entries, approval |
| resources | `lib/resources/service.ts` | Profiles, allocations, utilization |
| billing | `lib/billing/service.ts` | Invoices, contract billing, exports |
| reporting | `lib/reporting/service.ts` | Profitability |

## Local setup

See [README.md](../README.md) for the full quick start. Minimum path:

```bash
cp .env.example .env          # set AUTH_SECRET
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev -- -p 3005
```

After `db:seed`, sign in with `admin@demo.com` / `password123` (org: `demo-firm`).

**Note:** Reseeding wipes all data and invalidates existing sessions. Sign out and back in after reseed.

## Development workflow

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Make focused changes in the appropriate `lib/<domain>/` service
3. Update domain specs under `specs/domain/` when behavior changes
4. Add or update unit tests in `tests/`
5. Run `./scripts/verify.sh` before pushing
6. Open a PR using the template

## Billing models

| Model | Invoice generation |
|-------|-------------------|
| `TIME_AND_MATERIALS` | Approved unbilled time/expenses in a date range |
| `FIXED_FEE` | Dollar amount or % complete against contract |
| `RETAINER` | Contract/retainer amount (defaults to full contract) |
| `MILESTONE` | Currently routed as T&M (Phase 2) |

See [`specs/domain/billing-rules.md`](../specs/domain/billing-rules.md) for calculation details.

## Testing

```bash
npm run test              # all unit tests
npm run test:watch        # watch mode
npm run typecheck         # TypeScript
npm run lint              # ESLint
npm run check:boundaries  # import boundaries
```

Tests live in `tests/` and use Vitest. Billing and contract logic have dedicated test files (`billing.test.ts`, `contract-billing.test.ts`, `profitability.test.ts`).

## Database

```bash
npm run db:migrate   # apply migrations (dev)
npm run db:seed      # reset + seed demo data
npm run db:generate  # regenerate Prisma client
```

Prisma 7 uses `prisma.config.ts` for CLI configuration. The generated client lives in `generated/prisma/` (not committed — regenerated on `postinstall`).

Migrations use `DIRECT_URL` (postgres superuser). Runtime queries use `DATABASE_URL` (RLS role `psa_app`).

## Server actions

Server actions in `src/app/actions.ts` call domain services. They:

- Use `requireSession()` and `requireRole()` for auth
- Call `revalidatePath()` after mutations
- Redirect on invoice generation (with error query param on failure)

## Common tasks

### Add a new domain field

1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Update the domain service and UI
4. Update relevant specs and tests

### Change billing logic

1. Edit pure functions in `lib/billing/contract-billing.ts` or `lib/billing/service.ts`
2. Update `specs/domain/billing-rules.md`
3. Add tests in `tests/contract-billing.test.ts` or `tests/billing.test.ts`

### Debug Prisma / RLS

Ensure `DATABASE_URL` uses the `psa_app` role and `withOrgContext` is wrapping queries. Direct `prisma` calls without org context will fail RLS policies.

## CI parity

GitHub Actions runs the same gate as local `./scripts/verify.sh` plus `npm run build`. Environment variables are set at the job level — see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Related docs

- [CONTRIBUTING.md](../CONTRIBUTING.md) — PR process and review priorities
- [AGENTS.md](../AGENTS.md) — agent/developer contract
- [specs/product/mvp-scope.md](../specs/product/mvp-scope.md) — Phase 1 vs Phase 2 scope
