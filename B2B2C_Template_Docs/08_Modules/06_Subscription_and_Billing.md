# Subscription and Billing (Robust Enterprise Billing)

---

## Multi-Tier Billing Model

In a B2B2C platform, money flows upward while services flow downward. The billing engine must be highly fault-tolerant and idempotent.

### Complex Billing Workflows

1. **Super Admin -> Organisation Billing:** 
   - Annual licensing, high-tier SaaS subscriptions, or Usage-based billing (e.g., $0.001 per API call).
   - Invoices are generated at the end of the month via Stripe Billing.
2. **Organisation -> Tenant Billing (Franchise Model):**
   - The Organisation charges its internal Tenants a franchise fee, or allocates internal budget costs based on resource consumption.
3. **Tenant -> Company Billing (SaaS Model):**
   - The Tenant acts as a SaaS provider, charging the Company a monthly subscription fee via credit card (Stripe/Razorpay). Supports upgrades/downgrades with automated proration.
4. **Company -> Consumer Billing:**
   - The Company charges the end-user for services rendered.

### Automated Rev-Share and Transaction Routing

The platform's billing engine supports automated, synchronous rev-share splits using systems like **Stripe Connect** to avoid regulatory compliance issues (e.g., money transmitter licenses).

When a Consumer pays a Company $100:
- The payment gateway processes the transaction.
- The Billing Engine evaluates active Rev-Share rules.
- **Split Execution:** 
  - Company (Destination Account) keeps $85
  - Tenant (Platform/Application fee) takes 10% ($10)
  - Organisation (Master fee via webhook reconciliation) takes 3% ($3)
  - Super Admin (SaaS fee) takes 2% ($2)

### Fraud Prevention & Dunning

- **Velocity Checks:** The system blocks cards that fail more than 3 times in 10 minutes.
- **Refund Abuse:** Companies cannot process refunds exceeding their current escrow/wallet balance, protecting the Tenant from negative balance liabilities.
- **Dunning Management:** Automated retry schedules for failed payments (Day 3, 5, 7) before locking the account and suspending API access (as defined in the Lifecycle document).
- **Idempotency:** All billing webhooks and payment processing APIs strictly require and validate `Idempotency-Key` headers to ensure a network timeout never results in a double-charge.
