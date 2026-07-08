# Phase 2 Complete (v0.5.0)

Professional Services Automation Phase 2 is feature-complete for firm demos. The platform now supports contract-aware billing, full expense management, and accounting integrations alongside the Phase 1 PSA core.

## What's new since Phase 1

### Contract billing
- Fixed-fee, retainer, and **milestone** billing models
- Milestone workflow: plan → mark ready → invoice
- Contract validation and milestone reorder on project pages
- Profitability uses invoice totals for contract projects (not hours × rate)

### Expense management
- Org-scoped **categories** with optional codes
- **Receipt uploads** (JPG, PNG, WebP, PDF)
- Manager **bulk approval**
- Category-aware invoice lines
- Expense breakdown by category on Expenses, Profitability, and Project detail

### Accounting
- Configurable **chart of accounts**
- Journal CSV export (generic, Xero, QuickBooks)
- **Xero OAuth** — connect and push manual journals from invoices
- **QuickBooks OAuth** — connect and push journal entries from invoices
- Managers edit chart of accounts; admins manage OAuth connections

## Demo walkthrough

1. **Login** — `demo-firm` / `admin@demo.com` / `password123`
2. **Projects** — open *Mobile App Build* for milestones; *ERP Integration* for fixed-fee contract billing
3. **Expenses** — categories, receipts, manager bulk approve (`manager@demo.com`)
4. **Invoices** — generate from WIP or milestones; export PDF/CSV; push to Xero/QBO when configured
5. **Profitability** — contract columns, expense-by-category summary
6. **Accounting** — chart of accounts; optional Xero/QBO connect

## Optional integrations

Add to `.env` and restart the dev server:

```env
AUTH_URL="http://localhost:3005"
XERO_CLIENT_ID="..."
XERO_CLIENT_SECRET="..."
QUICKBOOKS_CLIENT_ID="..."
QUICKBOOKS_CLIENT_SECRET="..."
QUICKBOOKS_ENV="sandbox"
```

Register redirect URIs in each developer portal:
- `http://localhost:3005/api/integrations/xero/callback`
- `http://localhost:3005/api/integrations/quickbooks/callback`

## What's next (Phase 3)

See [`specs/product/mvp-scope.md`](../specs/product/mvp-scope.md) — tax/VAT, retainer periods, client portal, notifications, public API.
