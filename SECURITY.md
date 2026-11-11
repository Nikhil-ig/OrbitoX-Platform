# Security Policy

OrbitoX Platform implements zero-trust architecture, multi-tenant isolation, cryptographically signed plugin grants, and role-based / attribute-based access controls across all services.

---

## Supported Versions

| Version | Supported |
|---|---|
| `main` | Yes |
| `>= 1.0.0` | Yes |
| `< 1.0.0` | No |

---

## Reporting a Vulnerability

If you discover a security vulnerability within OrbitoX Platform, please do **NOT** open a public issue. Instead, report it privately to our security team:

- **Email**: `security@orbitox.io`
- **GPG Key**: Available upon request or via keybase.

Please include:
1. Description of the vulnerability and attack vector.
2. Steps to reproduce or proof-of-concept payload.
3. Impact assessment on multi-tenant isolation, cryptographic keys, or customer data rights.

We will acknowledge receipt within 24 hours, provide regular progress updates, and coordinate disclosure timelines.

---

## Core Security Invariants

All pull requests and code modifications must uphold these security invariants:
1. **Zero-Trust Multi-Tenancy**: Data queries must be explicitly scoped by `tenantId` (e.g. `session.scopeData(payload)` or PostgreSQL RLS).
2. **Cryptographic Anti-Tamper**: Plugins and packages must be signed via Ed25519/RSA digital signatures (`CryptoSigner`).
3. **Facade Immutability**: All facades and kernel internals must be deeply frozen using `SandboxGuard.freezeAllFacades`.
4. **Secret Management**:
   - Never commit `private.pem`, `.env`, or `.npmrc` files containing authentication tokens.
   - Run `gitleaks` locally before pushing (`.gitleaks.toml`).
