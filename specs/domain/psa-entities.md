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
- **Invoice** + **InvoiceLine** — billing from approved time
- **ExpenseEntry** — reimbursable/billable project costs with approval status
- **AuditLog** — billing-sensitive actions

## Derived metrics

- Utilization = actual / capacity
- Unbilled WIP = approved billable time not invoiced
- Project burn = logged hours / budget hours
