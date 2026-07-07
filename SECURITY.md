# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `main` (latest) | Yes |
| Tagged releases | Security fixes backported at maintainer discretion |

Security fixes are applied to the default branch (`main`).

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Report security issues privately by opening a [GitHub Security Advisory](https://github.com/SafetyMP/Professional-Service-Automation/security/advisories/new) or contacting the repository maintainers directly.

Include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected versions or commits
- Suggested fix (if any)

We aim to acknowledge reports within a few business days and will coordinate disclosure before any public fix.

## Secure deployment

- Change all demo passwords before production use
- Set a strong, unique `AUTH_SECRET`
- Use TLS in production and restrict database network access
- Review PostgreSQL RLS policies in `prisma/rls.sql` for your deployment model
