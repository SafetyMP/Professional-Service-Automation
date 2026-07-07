# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- OSS community files: contributing guide, code of conduct, changelog, and GitHub templates
- Dependabot configuration for npm and GitHub Actions
- Node version pin (`.nvmrc`) and EditorConfig

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

[Unreleased]: https://github.com/SafetyMP/Professional-Service-Automation/compare/v0.1.0...main
[0.1.0]: https://github.com/SafetyMP/Professional-Service-Automation/releases/tag/v0.1.0
