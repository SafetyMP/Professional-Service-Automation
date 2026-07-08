# Billing Rules

## Invoice generation

### Time & Materials (default)

- Source time entries: `status = APPROVED`, `billingStatus = UNBILLED`, `billable = true`
- Source expense entries: `status = APPROVED`, `billingStatus = UNBILLED`, `billable = true`
- Filter both by project and date range (`entryDate` / `expenseDate`)
- Time line amount = `hours × unitRate` (rate precedence below)
- Expense line amount = face value (`quantity = 1`, `unitRate = amount`)
- Invoice requires at least one billable time or expense line in range
- After invoice creation: set source entry `billingStatus = INVOICED`

### Fixed Fee

- Project `billingModel = FIXED_FEE` with optional `contractAmount` (total contract value)
- Invoice by dollar amount or `% complete` (progress billing)
- Progress amount = `contractAmount × percentComplete / 100 − alreadyInvoiced`
- Single invoice line; does not mark time/expense entries as invoiced
- Validates invoice amount does not exceed remaining contract balance

### Retainer

- Project `billingModel = RETAINER` with `contractAmount` as the retainer period amount
- Invoice defaults to full retainer amount; optional override amount
- Single invoice line per billing period
- Tracks total invoiced against contract amount when set

### Milestone

- Project `billingModel = MILESTONE`
- Milestones belong to the project with `name`, `amount`, optional `dueDate`
- Status workflow: `PLANNED` → `READY` → `INVOICED`
- Only `READY` milestones can be invoiced
- Invoice creates one line linked to the milestone; milestone status becomes `INVOICED`
- Does not mark time/expense entries as invoiced

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

See `specs/domain/accounting-export.md` — journal CSV with configurable chart of accounts and Xero / QuickBooks formats.
