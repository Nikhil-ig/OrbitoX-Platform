# Part 17 — Plugin Marketplace
### *Version, Install, Upgrade, Rollback, and License Plugins Independently*

---

## What Is the Marketplace?

The Plugin Marketplace is the distribution and lifecycle management system for OrbitoX plugins.

Think of it as:
- **npm** — for discovering and installing plugins
- **App Store** — for browsing, licensing, and monetizing
- **GitHub Releases** — for versioning and changelogs
- **Helm Charts** — for dependency management and compatibility

---

## Marketplace Architecture

```
Plugin Developer
  └── orbitox publish @orbitox/crm@1.2.0
        ↓
  Marketplace Registry (private npm-compatible registry)
        ↓
  Platform Admin browses marketplace
        ↓
  Selects plugin → views details, pricing, compatibility
        ↓
  Clicks Install
        ↓
  Plugin Engine downloads, validates, migrates, activates
        ↓
  Plugin live in minutes — zero downtime
```

---

## Plugin Listing Schema

```typescript
interface MarketplaceListing {
  id: string;                        // 'crm', 'inventory', 'hms'
  packageName: string;               // '@orbitox/crm'
  displayName: string;               // 'CRM — Customer Relationship Management'
  tagline: string;                   // 'Manage leads, customers, and pipelines'
  description: string;               // full markdown description
  icon: string;                      // URL to plugin icon
  screenshots: string[];             // URLs to feature screenshots
  category: PluginCategory;
  tags: string[];                    // ['sales', 'crm', 'leads', 'pipeline']

  author: {
    name: string;
    verified: boolean;
    supportEmail: string;
    website?: string;
  };

  versions: PluginVersion[];
  latestVersion: string;

  pricing: PluginPricing;
  license: 'open-source' | 'commercial' | 'enterprise';

  stats: {
    installs: number;
    rating: number;                  // 1-5 average
    reviewCount: number;
  };

  compatibility: {
    minimumPlatformVersion: string;
    testedUpTo: string;
  };

  dependencies: string[];            // other plugin IDs required
  incompatibleWith: string[];
}

enum PluginCategory {
  SALES       = 'sales',
  OPERATIONS  = 'operations',
  FINANCE     = 'finance',
  HR          = 'hr',
  HEALTHCARE  = 'healthcare',
  EDUCATION   = 'education',
  HOSPITALITY = 'hospitality',
  RETAIL      = 'retail',
  PRODUCTIVITY = 'productivity',
  AI          = 'ai',
  INTEGRATION = 'integration',
  ANALYTICS   = 'analytics',
}
```

---

## Plugin Versioning — Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (new manifest contract, DB schema drops)
MINOR: New features, backward-compatible
PATCH: Bug fixes, security patches

Examples:
  1.0.0 → Initial release
  1.0.1 → Bug fix: Lead status not saving correctly
  1.1.0 → New feature: Pipeline Kanban view
  2.0.0 → Breaking: Removed deprecated lead_owner column (replaced by assigned_to)
```

### Version Compatibility Matrix

```
Plugin 1.x.x → Platform 2.x.x ✅
Plugin 2.x.x → Platform 2.x.x ✅
Plugin 3.x.x → Platform 2.x.x ❌ (requires Platform 3.x.x)
```

Each plugin version declares its `minimumPlatformVersion` in `manifest.json`.

---

## Plugin Pricing Models

```typescript
interface PluginPricing {
  model: 'free' | 'one-time' | 'subscription' | 'usage-based' | 'freemium';

  // For subscription
  plans?: Array<{
    id: string;
    name: string;               // 'Starter', 'Professional', 'Enterprise'
    price: number;              // per context per month
    currency: string;
    features: string[];
    limits: Record<string, number>;
  }>;

  // For one-time
  price?: number;
  currency?: string;

  // For usage-based
  usageMetric?: string;         // 'per 1000 AI tokens', 'per 1000 SMS'
  usageRate?: number;

  // Free trial
  trialDays?: number;
}
```

### Example Pricing Configurations

```json
{
  "id": "@orbitox/crm",
  "pricing": {
    "model": "subscription",
    "plans": [
      {
        "id": "crm-starter",
        "name": "Starter",
        "price": 999,
        "currency": "INR",
        "features": ["Leads", "Customers", "Basic Pipeline"],
        "limits": { "leads": 1000, "users": 5 }
      },
      {
        "id": "crm-professional",
        "name": "Professional",
        "price": 2999,
        "currency": "INR",
        "features": ["Everything in Starter", "AI Scoring", "Bulk Export", "Workflows"],
        "limits": { "leads": -1, "users": 25 }
      },
      {
        "id": "crm-enterprise",
        "name": "Enterprise",
        "price": 7999,
        "currency": "INR",
        "features": ["Everything in Professional", "Custom Fields", "API Access", "SSO"],
        "limits": { "leads": -1, "users": -1 }
      }
    ],
    "trialDays": 14
  }
}
```

---

## Install Flow

```mermaid
flowchart TD
    BROWSE([Admin browses marketplace]) --> SELECT[Selects plugin + plan]
    SELECT --> COMPAT{Platform version\ncompatible?}
    COMPAT -->|No| WARN([Show warning: upgrade platform first])
    COMPAT -->|Yes| DEPS{All dependencies\ninstalled?}
    DEPS -->|No| INSTALL_DEPS[Prompt to install\nmissing dependencies first]
    DEPS -->|Yes| LICENSE{License\nacquired?}
    LICENSE -->|No| PAYMENT[Payment / license activation]
    LICENSE -->|Yes| DOWNLOAD[Download plugin package\nfrom registry]
    DOWNLOAD --> VALIDATE[Validate package signature\n& manifest schema]
    VALIDATE --> BACKUP[Create DB snapshot\n(rollback point)]
    BACKUP --> MIGRATE[Run plugin migrations\nin transaction]
    MIGRATE --> REGISTER[Register routes, permissions,\nmenus, pages, widgets, events]
    REGISTER --> SEED[Apply seed data\nif first install]
    SEED --> ACTIVE[Mark plugin ACTIVE\nin registry]
    ACTIVE --> DONE([Plugin live — no restart needed])
```

---

## Upgrade Flow

```
1. Marketplace shows available upgrade: CRM 1.1.0 → 1.2.0
2. Admin reviews changelog
3. Admin clicks "Upgrade"
4. Platform:
   a. Downloads 1.2.0 package
   b. Validates compatibility
   c. Creates DB snapshot (rollback point T-1)
   d. Runs new migrations (in transaction — rollback if any fail)
   e. Hot-swaps module in NestJS (or graceful pod restart)
   f. Updates plugin_registry to version 1.2.0
5. Upgrade complete — old version archived for 7 days
```

---

## Rollback Flow

```
Admin sees issue after upgrade
Admin clicks "Rollback to 1.1.0"

Platform:
  1. Stops new traffic to affected plugin routes
  2. Restores DB from T-1 snapshot (only plugin's own schema)
  3. Re-loads 1.1.0 module
  4. Updates plugin_registry back to 1.1.0
  5. Resumes traffic

Total rollback time: < 2 minutes
```

---

## Uninstall Flow

```
Admin clicks "Uninstall CRM"
Platform:
  1. Prompt: "Archive data" or "Delete all data"
  2. If Archive: Mark plugin_registry status = archived, data remains but is inaccessible
  3. If Delete: Remove plugin schema (with all tables) after confirmation
  4. Deregister routes, menus, pages, widgets, event subscriptions
  5. Remove permissions from RBAC registry
  6. Plugin removed — no orphaned routes or menus
```

---

## Publishing a Plugin to the Marketplace

```bash
# Authenticate
orbitox login

# Validate plugin structure and manifest
orbitox doctor --plugin ./plugins/crm

# Run tests
orbitox test --plugin ./plugins/crm

# Build
orbitox build --plugin ./plugins/crm

# Publish to marketplace registry
orbitox publish ./plugins/crm

# Output:
# ✅ Manifest valid
# ✅ Tests passed (42/42)
# ✅ Build successful
# ✅ Package signed
# ✅ Published: @orbitox/crm@1.2.0
# 🌐 Available at: marketplace.orbitox.com/plugins/crm
```

---

## Revenue Share

OrbitoX Platform takes a marketplace commission on paid plugin sales:

| Plugin Type | Commission |
|-------------|-----------|
| OrbitoX first-party plugins | 0% (platform owns) |
| Verified third-party plugins | 20% |
| Unverified third-party plugins | 30% |
| Enterprise plugins (direct license) | Negotiated |

Revenue is distributed via Stripe Connect — third-party developers receive payouts automatically.

---

*Next: [Part 18 — Build Philosophy](./18_Build_Philosophy.md)*
