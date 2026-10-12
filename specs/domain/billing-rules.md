# Billing Rules

## Invoice generation

### Time & Materials (default)

- Source time entries: `status = APPROVED`, `billingStatus = UNBILLED`, `billable = true`
- Source expense entries: `status = APPROVED`, `billingStatus = UNBILLED`, `billable = true`
- Filter both by project and date range (`entryDate` / `expenseDate`)
- Time line amount = `hours × unitRate` (rate precedence below)
- Expense line amount = face value (`quantity = 1`, `unitRate = amount`)
- Invoice requires at least one billable time or expense line in range
- Skip entries already linked to an invoice line (a draft holds them)
- A draft invoice does not consume WIP: source entries stay `billingStatus = UNBILLED`
- When the invoice is issued (`SENT` or `PAID`), set source entry `billingStatus = INVOICED`
- Returning an invoice to `DRAFT` sets those source entries back to `UNBILLED`

### Fixed Fee

- Project `billingModel = FIXED_FEE` with optional `contractAmount` (total contract value)
- Invoice by dollar amount or `% complete` (progress billing)
- Progress amount = `contractAmount × percentComplete / 100 − already committed`
- Committed amount is issued invoices plus open drafts. Drafts hold capacity and do not count as realized revenue
- Single invoice line; does not mark time/expense entries as invoiced
- Validates invoice amount does not exceed remaining contract capacity

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
- Invoice creates one line linked to the milestone. The milestone stays `READY` until the invoice is issued, then becomes `INVOICED`
- Does not mark time/expense entries as invoiced

## Rate precedence (time only, highest wins)

1. Project `billRateOverride`
2. ResourceProfile `billRate` for the person who logged time

## Rounding

- Store amounts as Decimal(12,2)
- Display two decimal places in UI and CSV export

## Invoice lifecycle

`DRAFT` → `SENT` → `PAID`

A draft holds WIP and is not realization. `SENT` and `PAID` are issued: only then are linked time, expenses, and milestones realized. Voiding a draft deletes it and returns time and expenses to `UNBILLED` and milestones to `READY`. Issued invoices cannot be voided.

Each issue or payment transition writes an audit log entry.

## Accounting export

See `specs/domain/accounting-export.md` — journal CSV with configurable chart of accounts and Xero / QuickBooks formats.
