# MVP Scope — PSA Platform

## Phase 1 (shipped v0.1.x)

Core multi-tenant PSA: clients, projects, time/expense approval, resources, utilization, T&M invoicing, fixed-fee/retainer billing, profitability reporting, PDF + journal CSV export.

## Phase 2 (shipped v0.2.0 – v0.5.0)

### Billing & contracts

- Contract-aware profitability (fixed-fee, retainer, milestone revenue models)
- Milestone billing workflow (PLANNED → READY → INVOICED) with contract validation
- Progress invoicing for fixed-fee and retainer projects

### Expenses

- Expense categories with manager-managed defaults
- Receipt uploads (JPG, PNG, WebP, PDF)
- Bulk expense approval
- Category-aware invoice line descriptions
- Expense breakdown by category (Expenses page, profitability report, project detail)

### Accounting

- Configurable chart of accounts (Settings → Accounting)
- Journal CSV export (generic, Xero, QuickBooks formats)
- Xero OAuth connect + manual journal push from invoices
- QuickBooks OAuth connect + journal entry push from invoices

### Access & polish

- Manager access to accounting settings (admin-only for OAuth connect)
- Role-filtered sidebar navigation
- Milestone reorder and contract-total validation on project pages

## Demo credentials

- Org: `demo-firm`
- Admin: `admin@demo.com` / `password123`
- Manager: `manager@demo.com` / `password123`
- Consultant: `consultant1@demo.com` / `password123`

## Out of scope (Phase 3+)

- Tax / VAT on invoices
- Retainer period scheduling and auto-draft invoices
- Client portal
- Email notifications for approvals
- Public API / webhooks
- Mobile native app
