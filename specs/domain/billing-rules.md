# Billing Rules

## Rate precedence (highest wins)

1. Project `billRateOverride`
2. ResourceProfile `billRate` for the person who logged time

## Invoice generation

- Source: time entries with `status = APPROVED`, `billingStatus = UNBILLED`, `billable = true`
- Filter by project and date range
- Line amount = `hours × unitRate`
- After invoice creation: set entry `billingStatus = INVOICED`

## Rounding

- Store amounts as Decimal(12,2)
- Display two decimal places in UI and CSV export

## Invoice lifecycle

`DRAFT` → `SENT` → `PAID`

Each transition writes an audit log entry.
