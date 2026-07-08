# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/SafetyMP/Professional-Service-Automation/compare/v0.1.3...main
[0.1.3]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.3
[0.1.2]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.2
[0.1.1]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.1
[0.1.0]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.0
