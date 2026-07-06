# Accounting export

## Journal CSV format

Columns: `Date, Account, Description, Debit, Credit, Reference`

Per invoice (issue date):

1. **Debit** `Accounts Receivable` for invoice subtotal
2. **Credit** `Service Revenue` for time line amounts (`InvoiceLine.timeEntryId` set)
3. **Credit** `Expense Revenue` for expense line amounts (`InvoiceLine.expenseEntryId` set)

Debits equal credits per invoice.

## Export surfaces

- Invoice detail: **Download PDF** (server-generated file)
- Invoice detail: **Preview Invoice** (HTML preview; use Download PDF to print safely)
- Invoice detail: **Export Lines CSV** and **Export Journal CSV**
- Invoices list: **Export Journal CSV** batch for all `SENT` and `PAID` invoices

## PDF generation

Server-side PDF via `pdf-lib` at `GET /api/invoices/[id]/pdf`. Avoid `window.print()` in the embedded IDE browser — it can crash Cursor.

## Import notes

Account names are generic labels suitable for manual mapping in QuickBooks, Xero, or a GL import template. Customize account names in a future settings screen if needed.
