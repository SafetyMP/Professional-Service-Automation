# Profitability rules

## Revenue (per project)

- Approved billable time: `hours × bill rate` (same rate precedence as invoicing)
- Approved billable expenses: face amount
- **Billed revenue**: billable entries with `billingStatus = INVOICED`
- **Unbilled revenue**: billable entries with `billingStatus = UNBILLED`
- **Total revenue** = billed + unbilled

## Cost (per project)

- Approved time (billable and non-billable): `hours × cost rate` from resource profile (0 if no profile)
- All approved expenses: face amount (billable and non-billable)

## Margin

- `margin = revenue − cost`
- `margin % = round(margin / revenue × 100)` when revenue > 0; otherwise null

## Scope

- Based on `APPROVED` entries only (invoiced and unbilled both count)
- Non-billable time contributes cost but not revenue

## Project drill-down

On `/projects/[id]`, show per-project summary plus:

- Time vs expense revenue (billed and unbilled)
- Per-person breakdown: hours, billed/unbilled revenue, cost, margin
