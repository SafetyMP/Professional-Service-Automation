# Profitability rules

## Revenue (per project)

### Time & Materials (default)

- Approved billable time: `hours × bill rate` (same rate precedence as invoicing)
- Approved billable expenses: face amount
- **Billed revenue**: billable entries with `billingStatus = INVOICED`
- **Unbilled revenue**: billable entries with `billingStatus = UNBILLED`
- **Total revenue** = billed + unbilled

### Fixed Fee and Retainer

Contract projects recognize **service revenue from invoices**, not from approved time entries.

- **Billed revenue**: sum of invoice `subtotal` for the project (all invoice statuses, consistent with contract billing status)
- **Unbilled revenue**: `max(0, contractAmount − invoicedTotal)` when `contractAmount` is set; otherwise `0`
- **Billable expenses** still contribute via entry `billingStatus` (reimbursables are separate from the contract line)
- **Total revenue** = contract billed + contract unbilled + expense billed + expense unbilled

### Milestone

Milestone projects use invoice totals for billed revenue.

- **Billed revenue**: sum of invoice `subtotal` for the project
- **Unbilled revenue**: sum of milestone `amount` where status is `PLANNED` or `READY`
- When no milestones exist, falls back to fixed-fee contract math using `contractAmount`
- Billable expenses still contribute via entry `billingStatus`

Billable time on invoice-based projects (fixed fee, retainer, milestone) contributes **cost only**, not service revenue.

## Cost (per project)

- Approved time (billable and non-billable): `hours × cost rate` from resource profile (0 if no profile)
- All approved expenses: face amount (billable and non-billable)

## Margin

- `margin = revenue − cost`
- `margin % = round(margin / revenue × 100)` when revenue > 0; otherwise null

## Scope

- Based on `APPROVED` entries only for cost and expense revenue
- Invoice-based service revenue uses invoice totals regardless of time entry approval state
- Non-billable time contributes cost but not revenue

## Project drill-down

On `/projects/[id]`, show per-project summary plus:

- Time vs expense revenue (billed and unbilled)
  - For invoice-based projects, time revenue reflects contract/milestone invoices and remaining balance
- Per-person breakdown: hours, billed/unbilled revenue, cost, margin
  - Invoice-based service revenue is shown at project level; per-person revenue covers expenses (and T&M time on T&M projects)
