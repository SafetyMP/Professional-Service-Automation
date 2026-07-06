# PSA Domain Entities

See `prisma/schema.prisma` for source of truth.

## Core entities

- **Organization** — tenant boundary
- **User** + **OrganizationMember** — workspace membership with role
- **Client** — customer account
- **Project** — engagement with billing model and budget
- **Task** — work breakdown
- **TimeEntry** — hours with approval and billing status
- **ResourceProfile** — capacity, cost rate, bill rate, skills
- **Allocation** — planned hours on project over date range
- **Invoice** + **InvoiceLine** — billing from approved time and expenses
- **ExpenseEntry** — reimbursable/billable project costs with approval and billing status
- **AuditLog** — billing-sensitive actions

## Derived metrics

- Utilization = actual / capacity
- Unbilled time WIP ($) = sum of `hours × bill rate` for approved billable time not invoiced (same rate precedence as invoicing)
- Unbilled expense WIP ($) = sum of approved billable expenses not invoiced
- Total unbilled WIP = unbilled time WIP + unbilled expense WIP
- Project revenue = approved billable time at bill rates + approved billable expenses
- Billed revenue = billable entries already on invoices; unbilled revenue = approved but not invoiced
- Project cost = approved time at cost rates + all approved expenses
- Project margin = revenue − cost; margin % = margin / revenue when revenue > 0
- Project burn = logged hours / budget hours
