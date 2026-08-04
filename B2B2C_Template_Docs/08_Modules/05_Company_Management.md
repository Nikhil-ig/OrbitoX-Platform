# Company Management (Tier 3)

---

## Purpose

The Company module manages the B2B clients who are purchasing the software service from the Tenant. The Company then uses the software to serve its own end Consumers.

## Advanced Features & Self-Service

- **Self-Service Onboarding:** Companies can self-sign-up via a Tenant-branded portal. The flow includes automated KYC (Know Your Customer) and KYB (Know Your Business) checks before the workspace is unlocked.
- **Consumer Management & CRM:** Companies manage their own End Users (Tier 5) with a built-in lightweight CRM.
- **API Key Provisioning:** Company Admins can generate scoped API keys to integrate their own internal tools (e.g., an ERP system) into the platform. These keys are heavily rate-limited by the Tenant.
- **Webhooks:** Companies can register webhooks to receive real-time events (e.g., `consumer.created`, `order.paid`) specific only to their data silo.
- **Staff Management:** Company Admins invite their own employees and assign them Company-scoped roles. The platform restricts a Company Admin from elevating privileges beyond the `Company_Admin` scope.
- **Resource Sandboxing:** Companies are provided with a "Sandbox Environment" to test API integrations and configurations before flipping to "Production Mode".
