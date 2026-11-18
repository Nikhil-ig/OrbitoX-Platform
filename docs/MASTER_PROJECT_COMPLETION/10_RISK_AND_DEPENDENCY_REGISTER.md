# 🪐 OrbitoX Platform OS — Master Project Completion Program
# Document 10: Risk & Dependency Register

**Repository:** `Nikhil-ig/OrbitoX-Platform`  
**Delivered HEAD:** `188680c27ce51ebb8ca6e998e504c51a24c34fa0`  
**Date:** November 18, 2026  
**Auditor / Role:** Principal Software Architect & Risk Officer

---

## 1. Risk Evaluation Framework

Risks are categorized across Technical, Architectural, Security/Compliance, and Operational domains. Severity is evaluated based on Impact (Catastrophic, Major, Moderate, Minor) and Likelihood (High, Medium, Low).

---

## 2. Active Risk Register

| Risk ID | Domain | Risk Description | Severity | Likelihood | Mitigation Strategy | Contingency Plan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Technical | Database connection pool exhaustion during sudden traffic spikes across multiple tenant apps. | **High** | Medium | Utilize PgBouncer connection pooling and Prisma client connection limits (`connection_limit=10`). | Auto-scale read replicas; enable temporary read-only database fallback. |
| **RSK-02** | Security | Cross-platform font rendering variations (macOS CoreText vs Ubuntu FreeType) causing visual regression false positives. | **Medium** | High | Calibrated `MAX_DIFF_RATIO = 0.05` threshold; committed authentic platform snapshots (`--linux.png` and `--darwin.png`). | Upload diff artifacts automatically in CI on failure for rapid visual triage. |
| **RSK-03** | Operational | Razorpay webhook delivery delays or out-of-order execution during bank downtime. | **High** | Medium | Implement idempotent transaction reconciliation (`PlatformIdempotencyRecord`) and polling fallback cron. | Reconcile missing payments automatically via Razorpay Orders API sync worker. |
| **RSK-04** | Compliance | Non-compliance with India DPDP Act or GDPR data localization regulations. | **High** | Low | Implemented Phase 6G Data Rights engine: structured ZIP exports, SHA-256 manifests, and cryptographic deletion certificates. | Host production databases strictly within Indian cloud regions (e.g. AWS Mumbai `ap-south-1`). |
| **RSK-05** | Architectural | Tight coupling between Control Plane and vertical SaaS runtimes eroding reusable OS boundaries. | **Critical** | Low | Enforce strict HTTP bridge contract with HMAC signing; keep `services/restaurant-api` in an independent database. | Maintain automated AST static import guards preventing direct cross-package imports. |
| **RSK-06** | Third-Party | Transactional email provider (Resend/SES) IP reputation damage leading to undelivered OTP/MFA emails. | **Medium** | Low | Implement automated email suppression list (`AccountEmailSuppression`) handling bounces/complaints; rate-limit OTP requests. | Support secondary email delivery gateway fallback (e.g. Postmark or SMTP). |
| **RSK-07** | Hardware | Diverse physical POS hardware (ESC/POS receipt printers) failing to connect in restaurant environments. | **Low** | High | Provide a lightweight local Node.js network bridge daemon instead of direct browser USB drivers. | Provide direct PDF receipt printing via standard browser print dialog. |

---

## 3. External Dependencies & SLA Matrix

| Dependency | Purpose | Type | Criticality | Fallback / Redundancy |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | Authoritative relational persistence & RLS | Database Infrastructure | **Critical** | Automated WAL archiving and daily S3 snapshots. |
| **Redis 7** | High-speed token bucket rate limiting & pub/sub | In-Memory Cache | **High** | In-memory token bucket fallback inside Node.js process. |
| **Razorpay** | India payment gateway & subscription billing | Third-Party Financial API | **Critical** | Manual offline invoice payment recording by admin. |
| **Resend / AWS SES**| Transactional email delivery (MFA, receipts) | Third-Party Email Gateway | **High** | Console operator manual verification fallback. |
| **MinIO / AWS S3** | Data export archives and brand asset storage | Object Storage | **Medium** | Local filesystem storage fallback in development. |
| **Let's Encrypt / Caddy**| Automated TLS certificate issuance for custom domains | Edge Ingress | **High** | Cloudflare SSL for SaaS wildcard proxy. |
