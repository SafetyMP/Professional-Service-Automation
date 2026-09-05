# Design pivot — realization kernel

This repository stops competing as a generic PSA or time tracker. Kimai (~4.7k stars), Akaunting, and Alga PSA already cover hours, invoicing, and “full PSA.” The unique slice here is a **realization kernel**: utilization, WIP, contract and milestone billing, partner-level profitability, and PostgreSQL row-level security.

## What this is

Consulting firms need to know whether booked work turns into recognized, collectable revenue — not only whether someone logged time. The kernel is:

- **Utilization** — resource allocations versus available capacity
- **WIP** — approved unbilled time and expenses waiting on a billing model
- **Contract / milestone billing** — T&M, fixed fee, retainer, and milestone invoices
- **Partner-level profitability** — realization after contract and milestone rules, not hours × list rate
- **Postgres RLS** — organization isolation enforced in the database

Timesheets stay. They are an **input to realization**, not the product. Do not delete time-entry, approval, or `lib/time` code in this pivot.

## What this is not

- A Kimai replacement (time is already a crowded, solved UX)
- A generic accounting suite (Akaunting / Xero / QuickBooks own the GL)
- A merge with [HR-ERP](https://github.com/SafetyMP/HR-ERP). Payroll, ESS, and HRIS stay in that repo. This PR documents positioning only.

## Next slice (not this PR)

1. Demote time-entry UX (keep the service; stop leading with timesheets).
2. Promote profitability and WIP reports as the default surfaces.
3. Document “why not Kimai” in the README (this PR) and keep repeating that contrast in product copy.

No application code ships with this document.
