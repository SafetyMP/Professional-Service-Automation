# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-07-08

Phase 2 complete — demo-ready for professional services firms.

### Added

- **QuickBooks OAuth**: connect/disconnect in Settings → Accounting, push journal entries from invoice detail
- Profitability report: billing model, contract/milestone totals, remaining balance columns
- Org-wide expense breakdown by category on profitability report
- Per-project expense breakdown by category on project profitability detail

### Changed

- Accounting settings: side-by-side Xero and QuickBooks integration cards
- README, MVP scope, and screenshots updated for Phase 2 feature set

## [0.4.1] - 2026-07-08

### Fixed

- Managers can access accounting settings; sidebar hides Accounting for consultants
- Xero connect/disconnect remains admin-only

## [0.4.0] - 2026-07-08

### Added

- Xero OAuth integration: connect/disconnect in Settings → Accounting, push manual journals from invoice detail
- Optional Xero account codes on chart of accounts for API journal pushes
- Milestone contract validation: warns when milestone totals exceed contract amount
- Milestone reorder controls (↑/↓) on project detail
- Expense summary by category table for managers on the Expenses page

### Changed

- Accounting settings page includes Xero connection status and account code fields
- Invoice detail shows Xero push status and journal ID after successful push

## [0.3.0] - 2026-07-07

### Added

- Expense categories per organization with manager-managed defaults
- Receipt uploads for expenses (JPG, PNG, WebP, PDF up to 5 MB) with secure download route
- Bulk expense approval for managers (approve selected or approve all pending)
- Category-aware invoice line descriptions for billable expenses

### Changed

- Expenses page redesigned with category picker, receipt column, and approval table

## [0.2.0] - 2026-07-07

### Added

- Contract-aware profitability: fixed-fee and retainer projects use invoice totals and remaining contract balance for revenue instead of hours × rate
- **Milestone billing**: `Milestone` model with PLANNED → READY → INVOICED workflow, project milestone UI, and milestone-based invoice generation
- **Accounting export v2**: configurable chart of accounts (Settings → Accounting), Xero manual journal CSV, and QuickBooks Online journal CSV formats

### Changed

- Profitability rules spec updated for contract vs T&M vs milestone revenue recognition
- Project detail shows "Contract revenue" label for fixed-fee, retainer, and milestone profitability breakdown
- Journal CSV exports use organization account names from settings

## [0.1.5] - 2026-07-07

### Added

- Multi-arch Docker images (`linux/amd64`, `linux/arm64`) published to GHCR on release
- Branch protection on `main` requiring CI verify, E2E, and CodeQL checks

### Changed

- Dependabot: ignore Node Docker bumps ≥25 (stay on Node 22 LTS base image)

## [0.1.4] - 2026-07-07

### Added

- CodeQL security scanning workflow (PR + weekly schedule)
- Release workflow publishing Docker images to GHCR on GitHub release
- E2E Playwright smoke tests in CI (login → dashboard, invoices)
- Shared `scripts/ci-setup-db.sh` for Actions database bootstrap
- Dependabot: Docker base image updates, PR labels, grouped GitHub Actions

## [0.1.3] - 2026-07-07

### Added

- Full UI design system: dark sidebar, teal accent, Inter typography, Lucide icons
- Shared components: `PageHeader`, `StatCard`, `Table`, `Badge`, `EmptyState`, `Alert`
- Mobile navigation drawer and fixed sidebar active-state logic
- Shared format utilities (`lib/utils/format.ts`) and navigation config

### Changed

- Redesigned login, dashboard, and all app pages with consistent layout patterns
- Regenerated README screenshots and demo GIF

## [0.1.2] - 2026-07-07

### Added

- Docker deployment: `Dockerfile`, `docker-compose.stack.yml`, and [`docs/deploy.md`](docs/deploy.md)
- README hero demo GIF and deploy quick-start section
- Screenshots CI workflow (release, monthly schedule, manual dispatch)
- GitHub Discussions with Q&A template
- Repository description and homepage metadata

## [0.1.1] - 2026-07-07

### Added

- Development guide (`docs/development.md`) and README screenshots
- Playwright-based screenshot capture script (`npm run screenshots`)
- OSS community files: contributing guide, code of conduct, changelog, and GitHub templates
- Dependabot configuration for npm and GitHub Actions
- Node version pin (`.nvmrc`) and EditorConfig

### Fixed

- CI: export Prisma env vars before `npm ci` so `postinstall` generate succeeds on GitHub Actions
- CI: add production build gate; use `.nvmrc` for Node version
- Dependabot: ignore ESLint 10 and pg ≥8.19 until upstream compatibility is resolved

## [0.1.0] - 2026-07-07

### Added

- Multi-tenant PSA platform with RBAC (Admin, Manager, Consultant)
- Clients, projects, tasks, and project members
- Time and expense entry with manager approval workflows
- Resource profiles, allocations, and utilization reporting
- Draft invoice generation from approved billable time and expenses
- Fixed-fee and retainer contract billing with progress invoicing
- Project profitability reporting (billed vs unbilled revenue)
- Invoice PDF download and accounting journal CSV export
- Dashboard KPIs: utilization, unbilled WIP, expense WIP, project burn
- PostgreSQL row-level security for organization isolation
- GitHub Actions CI running `./scripts/verify.sh`
- README, SECURITY policy, and developer documentation

[Unreleased]: https://github.com/SafetyMP/Professional-Service-Automation/compare/v0.1.5...main
[0.1.5]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.5
[0.1.4]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.4
[0.1.3]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.3
[0.1.2]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.2
[0.1.1]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.1
[0.1.0]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.0
