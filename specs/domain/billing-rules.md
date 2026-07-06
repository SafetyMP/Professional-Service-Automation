# Billing Rules

## Invoice generation

- Source time entries: `status = APPROVED`, `billingStatus = UNBILLED`, `billable = true`
- Source expense entries: `status = APPROVED`, `billingStatus = UNBILLED`, `billable = true`
- Filter both by project and date range (`entryDate` / `expenseDate`)
- Time line amount = `hours × unitRate` (rate precedence below)
- Expense line amount = face value (`quantity = 1`, `unitRate = amount`)
- Invoice requires at least one billable time or expense line in range
- After invoice creation: set source entry `billingStatus = INVOICED`

## Rate precedence (time only, highest wins)

1. Project `billRateOverride`
2. ResourceProfile `billRate` for the person who logged time

## Rounding

- Store amounts as Decimal(12,2)
- Display two decimal places in UI and CSV export

## Invoice lifecycle

`DRAFT` → `SENT` → `PAID`

Each transition writes an audit log entry.

## Accounting export

See `specs/domain/accounting-export.md` — journal CSV with AR debit and revenue credits (time vs expense).
