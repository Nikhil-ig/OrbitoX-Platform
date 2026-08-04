# Security Architecture & Threat Model Specification

---

## Executive Summary

The platform is designed to meet **SOC2 Type II, ISO 27001, and GDPR compliance**. Security controls operate under a **Zero-Trust Security Posture** across all 5 tiers.

---

## 1. OWASP Top 10 Protections Matrix Table

| Threat Vector | Risk Level | Platform Security Mitigation | Enforcement Mechanism |
|---|---|---|---|
| **A01: Broken Access Control** | Critical | Row-Level Security (RLS) & NestJS `TierGuard` | PostgreSQL Middleware + JWT Claim Verification |
| **A02: Cryptographic Failures** | High | AES-256-GCM for PII data, RS256 for JWT tokens | AWS KMS Key Rotation + TLS 1.3 |
| **A03: Injection (SQL/NoSQL)** | Critical | Parameterized Prisma ORM & HTML Sanitization | Auto-escaped query parameters |
| **A04: Insecure Design** | High | Fail-Closed RBAC & Zero-Trust default policy | Default HTTP 403 response on missing rules |
| **A05: Security Misconfiguration**| Medium | AWS KMS / Vault secret management | Strict environment variable validation |
| **A07: Identification & Auth** | Critical | Forced TOTP MFA, bcrypt (cost factor 12) | Refresh Token Rotation & Session revocation |
| **A08: Software Integrity** | Medium | Automated CI/CD dependency vulnerability scanning | Snyk + Trivy container scanning |

---

## 2. Secrets & Encryption Key Hierarchy Table

| Key Level | Key Name | Key Storage Location | Rotation Interval | Usage Scope |
|---|---|---|---|---|
| **Master Key** | KMS Root Key | AWS KMS / HashiCorp Vault | 365 Days | Encrypts Key Encryption Keys (KEKs) |
| **KEK** | Key Encryption Key | KMS HSM | 180 Days | Encrypts Data Encryption Keys (DEKs) |
| **DEK** | Data Encryption Key | Memory Buffer (Vault Client) | 90 Days | Encrypts PII columns in PostgreSQL |
| **JWT Keypair** | RS256 Private/Public | Secrets Manager | 30 Days | Signs and verifies authentication JWTs |

---

## 3. Password & Session Security Parameters Table

| Parameter Name | Standard Value | Policy Description |
|---|---|---|
| `password.min_length` | `12 Characters` | Must include upper, lower, number, and symbol |
| `password.hash_algorithm` | `Bcrypt (Cost 12)` | Salted multi-pass password hashing |
| `session.jwt_access_ttl` | `15 Minutes` | Short-lived access token lifespan |
| `session.jwt_refresh_ttl` | `7 Days` | Refresh token lifespan with automatic rotation |
| `session.max_concurrent` | `5 Devices` | Maximum active login sessions per user |
| `mfa.enforcement_roles` | `SUPER_ADMIN, ORG_ADMIN, TENANT_ADMIN` | Forced TOTP multi-factor authentication |
