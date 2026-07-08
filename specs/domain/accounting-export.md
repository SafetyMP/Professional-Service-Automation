# Accounting export

## Chart of accounts

Each organization configures account names at **Settings → Accounting**:

| Field | Default |
|-------|---------|
| Accounts Receivable | `Accounts Receivable` |
| Service Revenue | `Service Revenue` |
| Expense / Reimbursable Revenue | `Expense Revenue` |

These names are used in all journal export formats.

## Export formats

### Generic journal CSV

Columns: `Date, Account, Description, Debit, Credit, Reference`

Per invoice (issue date):

1. **Debit** AR account for invoice subtotal
2. **Credit** Service Revenue for time, contract, and milestone line amounts
3. **Credit** Expense Revenue for expense line amounts (`InvoiceLine.expenseEntryId` set)

Debits equal credits per invoice.

### Xero manual journal CSV

Columns: `*Narration,*Date,*Description,*Account,*TaxType,Debit,Credit`

- One row per journal line with separate Debit and Credit columns
- Tax type defaults to `Tax Exempt`
- Dates use `DD/MM/YYYY`

### QuickBooks Online journal CSV

Columns: `Journal No,Journal Date,Account Name,Debits,Credits,Description,Name`

- Journal number = invoice number
- Dates use `MM/DD/YYYY`
- Customer name in the `Name` column

## Export surfaces

- Invoice detail: **Download PDF** (server-generated file)
- Invoice detail: **Preview Invoice** (HTML preview; use Download PDF to print safely)
- Invoice detail: **Export Lines CSV**, **Journal CSV**, **Xero CSV**, **QuickBooks CSV**
- Invoices list: batch export buttons for sent/paid invoices (all three journal formats)

## PDF generation

Server-side PDF via `pdf-lib` at `GET /api/invoices/[id]/pdf`. Avoid `window.print()` in the embedded IDE browser — it can crash Cursor.

## Import notes

Customize account names in **Settings → Accounting** to match your Xero or QuickBooks chart of accounts before exporting.
