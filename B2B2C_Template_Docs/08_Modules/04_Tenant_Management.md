# Tenant Management (Tier 2)

---

## Purpose

The Tenant module manages the operational units (e.g., Regional Franchises, specific brands under a holding company, local subsidiary). They are the primary operators of the platform on a day-to-day basis.

## Advanced Features & Limitations

- **Local Branding Override:** Tenants can override the Organisation's default branding with their own localized logos, colors, languages, and CNAME domains.
- **Company Budgeting & Caps:** Tenants can impose budget caps on their B2B Companies. If a Company consumes too many resources (e.g., sending too many SMS messages), the Tenant's configuration automatically throttles the Company to prevent cost overruns.
- **Localized Payment Gateways:** Tenants configure their own Stripe Connect / Razorpay credentials to securely collect subscription fees directly from their Companies, bypassing the Organisation.
- **Custom Integrations:** Tenants can install API keys for 3rd-party integrations (e.g., a specific regional CRM like Salesforce or Hubspot) that only apply to their hierarchy tree.
- **Data Residency Configurations:** For global deployments, Tenants can specify data residency requirements (e.g., "All my Companies must have their data stored in EU servers" - GDPR compliance).
