# Organisation Management (Tier 1)

---

## Purpose

The Organisation module manages the top-level entities (e.g., Holding Companies, Master Resellers, Global Conglomerates) that lease the core SaaS platform from the Super Admin.

## Advanced Features & Capabilities

- **Strict SLA Management:** Organisations have Service Level Agreements (SLAs) encoded into their configuration. If the platform fails to meet uptime guarantees, billing adjustments are automatically calculated.
- **Global Branding & Cascading CSS:** Organisations set a default master brand (colors, logo, custom domain, CSS injection). This automatically themes all child Tenants unless explicitly overridden.
- **Tenant Provisioning Quotas:** Super Admins can restrict an Organisation via hard limits (e.g., `max_tenants = 50`, `max_api_calls_per_month = 10M`). Once a quota is hit, provisioning APIs throw `402 Payment Required`.
- **Aggregated Data Warehousing:** Organisation Admins have access to Snowflake/Redshift exports. The system aggregates metrics (revenue, active users, churn) across all their child Tenants and Companies in near real-time.
- **Master Billing Profiles:** Organisations maintain a master billing profile with the platform owner. They can opt for "Consolidated Billing" (Org pays for everything) or "Distributed Billing" (Tenants pay for themselves).
- **Compliance Enforcement:** Org Admins can force security policies down the chain (e.g., "Force MFA for all Tenants and Companies").
