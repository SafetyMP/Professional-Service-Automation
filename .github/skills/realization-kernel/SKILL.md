---
name: realization-kernel
description: "Change utilization, WIP, milestone billing, or partner profitability in the PSA realization kernel. Use when editing lib/billing, lib/resources, lib/projects, or RLS tenancy. Do not turn this repo into Kimai; do not delete lib/time."
---

# Realization kernel

Timesheets (`lib/time`) are an input. The product is utilization, WIP, contract/milestone billing, and partner-level profitability with Postgres RLS.

## Do

- Keep domain logic in `lib/<domain>/service.ts`.
- Update `specs/domain/billing-rules.md` or `profitability-rules.md` when behavior changes.
- Use `withOrgContext()` for tenant queries.

## Do not

- Delete `lib/time`.
- Import another domain's internals.
- Bypass PostgreSQL RLS.
- Merge this tree with HR-ERP.

Verify: `./scripts/verify.sh`.

