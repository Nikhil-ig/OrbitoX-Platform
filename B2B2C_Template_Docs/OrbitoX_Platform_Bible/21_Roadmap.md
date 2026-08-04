# Part 21 — Roadmap
### *OrbitoX from Year 1 to Year 5 — Building the SaaS Operating System*

---

## Roadmap Philosophy

The roadmap is not a feature list. It is a **platform maturity model**.

Each year builds on the previous. We never skip a layer. The platform must be rock-solid before the ecosystem can flourish.

```
Year 1: Platform Core     → The foundation nobody sees but everything depends on
Year 2: Plugin Ecosystem  → The first wave of reusable capabilities
Year 3: AI Platform       → Intelligence as infrastructure
Year 4: Enterprise Scale  → Security, compliance, global deployment
Year 5: Public Ecosystem  → Third-party developers building on OrbitoX
```

---

## Year 1 — Platform Core

**Theme: "Make the foundation unbreakable."**

### Q1 — Kernel

- [ ] TurboRepo monorepo bootstrap
- [ ] `packages/core/auth` — JWT RS256, refresh tokens, MFA (TOTP + SMS)
- [ ] `packages/core/context` — Universal Context Engine (types + hierarchy)
- [ ] `packages/core/rbac` — Roles, permissions, guards
- [ ] PostgreSQL with RLS setup
- [ ] Redis cluster setup
- [ ] API Gateway (NestJS)
- [ ] Context resolution middleware

### Q2 — Platform Services

- [ ] `packages/core/billing` — Stripe integration, subscriptions, plans
- [ ] `packages/core/storage` — S3 abstraction, CDN
- [ ] `packages/services/notifications` — Email (SendGrid) + SMS (Twilio)
- [ ] `packages/core/events` — Event bus (BullMQ)
- [ ] `packages/core/audit` — Immutable audit log
- [ ] `packages/core/scheduler` — Cron jobs

### Q3 — Plugin Engine

- [ ] `packages/plugin-engine` — Plugin loader, registry, lifecycle
- [ ] Plugin SDK (base class, entity registration, event helpers)
- [ ] Dynamic UI Engine (menus, forms, tables)
- [ ] `packages/ui` — Shared design system components
- [ ] Theme Engine (per-context branding)

### Q4 — First Plugins + CLI

- [ ] `@orbitox/crm` — v1.0 (Leads, Customers, Pipeline)
- [ ] `@orbitox/inventory` — v1.0 (Products, Stock, Warehouses)
- [ ] `tools/cli` — `orbitox new`, `orbitox create`, `orbitox migrate`
- [ ] Developer documentation site
- [ ] Internal alpha test with 5 pilot tenants

**Year 1 Exit Criteria:**
- Platform can be bootstrapped in under 1 hour
- New plugin can be created, installed, and active in under 1 day
- 2 production-ready plugins in marketplace
- 5 active tenants on platform

---

## Year 2 — Plugin Ecosystem

**Theme: "Build once, use everywhere."**

### Q1 — Core Plugin Library

- [ ] `@orbitox/hrms` — Employee profiles, org chart, leave management
- [ ] `@orbitox/payroll` — Salary calculation, payslips, tax computation
- [ ] `@orbitox/attendance` — Multi-method attendance (biometric, app, QR)
- [ ] `@orbitox/hms` — Patients, doctors, appointments, prescriptions

### Q2 — Workflow + Policy

- [ ] Workflow Engine — full implementation (triggers, actions, delays, branches)
- [ ] Policy Engine — ABAC + PBAC + Approval flows
- [ ] Feature Flag Engine — full multi-dimension flag system
- [ ] Metadata Engine — entity registration + dynamic field extension

### Q3 — More Plugins

- [ ] `@orbitox/school` — Students, attendance, grading, fees
- [ ] `@orbitox/restaurant` — Menu, orders, tables, reservations
- [ ] `@orbitox/pos` — Point of sale
- [ ] `@orbitox/reports` — Visual report builder

### Q4 — Marketplace Launch

- [ ] Marketplace registry and listing portal
- [ ] Plugin versioning + upgrade/rollback
- [ ] `orbitox publish` CLI
- [ ] Plugin rating and review system
- [ ] 3rd party developer onboarding (invite-only)

**Year 2 Exit Criteria:**
- 10+ production-ready plugins
- Workflow engine powering live automations
- Marketplace with first 3 external plugins
- 50+ active tenants

---

## Year 3 — AI Platform

**Theme: "Intelligence as infrastructure."**

### Q1 — AI Capability

- [ ] AI Gateway (rate limiting, cost tracking, PII masking)
- [ ] LLM Router (model selection, fallback)
- [ ] Prompt Library (versioned, context-configurable)
- [ ] RAG Engine (vector store per context)
- [ ] Memory Service (conversation + entity memory)

### Q2 — AI Agents

- [ ] Agent Orchestrator (multi-step agents with tools)
- [ ] Plugin tool registration (any plugin can give tools to AI)
- [ ] AI Copilot UI component (embeddable in any page)
- [ ] AI Permission system (RBAC for AI actions)
- [ ] AI usage dashboard (cost, tokens, by plugin)

### Q3 — AI-Powered Features

- [ ] AI-powered lead scoring (CRM)
- [ ] AI-powered demand forecasting (Inventory)
- [ ] Clinical decision support (HMS)
- [ ] AI-generated reports from natural language queries
- [ ] AI workflow action types (generate_text, classify, extract)

### Q4 — AI Platform Maturity

- [ ] Fine-tuning pipeline (custom models per tenant)
- [ ] Model Comparison Engine (A/B test two models)
- [ ] AI Gateway supports self-hosted LLMs (Ollama, vLLM)
- [ ] Compliance mode (AI with on-premise model — no data leaves)

**Year 3 Exit Criteria:**
- AI capability available to all plugins
- 5+ AI-powered workflows in production
- Customers using AI with their own LLM providers
- 200+ active tenants

---

## Year 4 — Enterprise Scale

**Theme: "Ready for the biggest customers in the world."**

### Q1 — Security & Compliance

- [ ] SOC2 Type II audit
- [ ] ISO 27001 certification
- [ ] GDPR compliance tooling (data export, right to erasure)
- [ ] HIPAA-ready infrastructure (BAA agreements, PHI handling)
- [ ] Penetration test (external security firm)
- [ ] Vulnerability disclosure program

### Q2 — Global Scale

- [ ] Multi-region deployment (3 regions: India, Europe, US)
- [ ] Data residency controls (EU data stays in EU)
- [ ] 99.99% SLA with automated failover
- [ ] Load tested to 100k concurrent users
- [ ] Database sharding strategy for 1B+ rows

### Q3 — Enterprise Features

- [ ] SAML SSO + LDAP / Active Directory integration
- [ ] Custom domain mapping (per tenant)
- [ ] White-label platform (reseller program)
- [ ] Advanced approval workflows
- [ ] Data warehouse export (BigQuery, Snowflake, Redshift)

### Q4 — Partner Ecosystem

- [ ] Certified Partner Program (implementation partners)
- [ ] Enterprise SLA contracts
- [ ] Dedicated cluster offering (single-tenant deployment)
- [ ] Enterprise plugin certification program

**Year 4 Exit Criteria:**
- SOC2 Type II certified
- 3 global regions live
- First enterprise customer (1000+ users)
- 500+ active tenants

---

## Year 5 — Public Ecosystem

**Theme: "OrbitoX is an ecosystem, not a product."**

### Q1 — Public Developer Program

- [ ] Public SDK documentation
- [ ] Public marketplace open to all developers
- [ ] Developer grants program (fund open-source plugins)
- [ ] Annual developer conference

### Q2 — Platform as a Service

- [ ] OrbitoX Cloud (managed hosting)
- [ ] OrbitoX Self-Hosted (Docker/K8s — GPL or commercial)
- [ ] One-click deploy to AWS / GCP / Azure
- [ ] Platform API for building custom integrations

### Q3 — Ecosystem Growth

- [ ] 100+ plugins in marketplace
- [ ] Revenue share payouts to external developers
- [ ] Plugin certification and security review program
- [ ] Community forum and Discord

### Q4 — Long-Term Vision

- [ ] OrbitoX as a no-code platform for non-technical builders
- [ ] Visual plugin builder (drag-and-drop entity + workflow)
- [ ] AI-assisted plugin generation ("Build me an attendance plugin")
- [ ] International expansion (MENA, Southeast Asia, Africa)

**Year 5 Exit Criteria:**
- 100+ plugins from external developers
- 2,000+ active tenants
- Platform MRR exceeds plugin revenue (ecosystem healthy)
- Developer ecosystem generating independent income

---

## Non-Negotiables at Every Stage

Regardless of which year we are in, these never slip:

```
✅ Security first — no features shipped with known security issues
✅ Audit log completeness — every mutation audited
✅ Data isolation — zero cross-tenant data leaks
✅ API versioning — never break existing integrations
✅ Plugin backward compatibility — upgrades never silently break plugins
✅ Observability — every new service ships with dashboards and alerts
```

---

*Next: [Part 22 — Engineering Rules](./22_Engineering_Rules.md)*
