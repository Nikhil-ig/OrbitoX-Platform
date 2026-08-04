# Part 08 — Capability Engine
### *Reusable Platform Superpowers — Available to Every Plugin*

---

## The Problem Without a Capability Engine

Without a Capability Engine, every plugin that needs AI does this:

```typescript
// In CRM plugin
import OpenAI from 'openai';
const ai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const result = await ai.chat.completions.create({...});

// In Inventory plugin
import OpenAI from 'openai';
const ai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const result = await ai.chat.completions.create({...});

// In School plugin
import OpenAI from 'openai';
const ai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
// ...same thing again
```

And every plugin that needs notifications does this:

```typescript
// CRM plugin
import nodemailer from 'nodemailer';
// configure smtp...
// compose email...
// handle retries...
// handle failures...

// School plugin — same code, different file
// Restaurant plugin — same code, different file
```

This is the problem the Capability Engine solves.

---

## What Is a Capability?

A Capability is a **named, reusable, platform-provided superpower** that any plugin can consume through a uniform interface.

```
Platform provides:
  Capability: AI
  Capability: Notifications
  Capability: Payments
  Capability: Storage
  Capability: Search
  Capability: Reports
  Capability: Workflow
  Capability: Scheduler
  Capability: Audit
  Capability: Analytics
  Capability: Files
  Capability: Webhooks
  Capability: Translations
  Capability: Maps
  Capability: OCR
  Capability: Video
```

Any plugin can declare which capabilities it uses:

```json
{
  "id": "crm",
  "capabilities": [
    "ai",
    "notifications",
    "workflow",
    "reports",
    "search"
  ]
}
```

And the platform injects the capability services into the plugin's context.

---

## Capability Registry

```typescript
interface Capability {
  id: string;                        // 'ai', 'notifications', 'payments'
  displayName: string;               // 'AI Assistant'
  version: string;                   // '1.0.0'
  description: string;
  provider: string;                  // which service implements this
  configSchema: JSONSchema;          // configuration options
}
```

### Platform-Provided Capabilities

| Capability ID | Provider Package | Description |
|--------------|-----------------|-------------|
| `ai` | `@orbitox/services/ai` | LLM routing, RAG, embeddings, agents |
| `notifications` | `@orbitox/services/notifications` | Email, SMS, WhatsApp, Push |
| `payments` | `@orbitox/core/billing` | Payment processing, subscriptions |
| `storage` | `@orbitox/core/storage` | File upload, CDN, transformations |
| `search` | `@orbitox/services/search` | Full-text, semantic, faceted search |
| `reports` | `@orbitox/services/reports` | Report builder, PDF/CSV export |
| `workflow` | `@orbitox/core/workflow` | Workflow triggers and automation |
| `scheduler` | `@orbitox/core/scheduler` | Cron jobs, delayed tasks |
| `audit` | `@orbitox/core/audit` | Immutable audit log |
| `analytics` | `@orbitox/services/analytics` | Event tracking, dashboards |
| `webhooks` | `@orbitox/core/events` | Outbound webhook delivery |
| `translations` | `@orbitox/services/i18n` | Multi-language support |
| `maps` | `@orbitox/services/maps` | Geocoding, routing, display |
| `ocr` | `@orbitox/services/ocr` | Document scanning and extraction |

---

## Using Capabilities in a Plugin

```typescript
// Plugin service — capabilities injected by the engine
@Injectable()
export class LeadService {
  constructor(
    // These are all capability injections — no direct imports of AI/Notification SDKs
    private readonly ai: AICapability,
    private readonly notify: NotificationCapability,
    private readonly search: SearchCapability,
    private readonly audit: AuditCapability,
    private readonly workflow: WorkflowCapability,
  ) {}

  async createLead(dto: CreateLeadDto, ctx: RequestContext): Promise<Lead> {
    // 1. Create the lead
    const lead = await this.leadRepo.create({ ...dto, contextId: ctx.contextId });

    // 2. Index for search (capability — no elasticsearch code here)
    await this.search.index('crm.leads', lead.id, {
      name: lead.name,
      email: lead.email,
      status: lead.status,
    });

    // 3. Log to audit trail (capability)
    await this.audit.log({
      action: 'crm.lead.created',
      entityType: 'lead',
      entityId: lead.id,
      performedBy: ctx.userId,
      contextId: ctx.contextId,
      data: { name: lead.name },
    });

    // 4. Trigger workflow if configured (capability)
    await this.workflow.trigger('crm.lead.created', {
      entityId: lead.id,
      contextId: ctx.contextId,
    });

    // 5. AI — auto-score the lead (capability)
    const score = await this.ai.complete({
      prompt: `Score this lead 1-10 based on: ${JSON.stringify(dto)}`,
      contextId: ctx.contextId,
      maxTokens: 10,
    });
    await this.leadRepo.update(lead.id, { aiScore: parseInt(score) });

    return lead;
  }

  async notifyAssignee(lead: Lead, ctx: RequestContext): Promise<void> {
    // Notifications capability — no SMTP/Twilio config here
    await this.notify.send({
      to: { userId: lead.assignedTo },
      template: 'crm.lead.assigned',
      data: { leadName: lead.name, leadId: lead.id },
      channels: ['email', 'push'],
      contextId: ctx.contextId,
    });
  }
}
```

---

## Capability Configuration

Each capability is configured per context. A tenant can have a different AI provider than the platform default.

```json
{
  "contextId": "tenant-abc",
  "capabilities": {
    "ai": {
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "{SECRET:tenant-abc/openai-key}",
      "maxTokensPerRequest": 2000,
      "dailyBudgetUSD": 50
    },
    "notifications": {
      "email": {
        "provider": "sendgrid",
        "fromEmail": "noreply@client.com",
        "fromName": "ClientName"
      },
      "sms": {
        "provider": "twilio",
        "fromNumber": "+1234567890"
      },
      "whatsapp": {
        "provider": "360dialog",
        "apiKey": "{SECRET:tenant-abc/360dialog-key}"
      }
    },
    "payments": {
      "provider": "stripe",
      "publishableKey": "pk_live_...",
      "secretKey": "{SECRET:tenant-abc/stripe-secret}"
    },
    "storage": {
      "provider": "s3",
      "bucket": "tenant-abc-files",
      "region": "ap-south-1",
      "cdnUrl": "https://cdn.client.com"
    }
  }
}
```

**The plugin doesn't know or care which provider is configured. It just calls the capability interface.**

---

## Capability Adapters

Each capability has a standard interface and multiple adapters:

```typescript
// notifications/capability.interface.ts
interface NotificationCapability {
  send(options: SendNotificationOptions): Promise<void>;
  sendBulk(options: BulkSendOptions): Promise<BulkSendResult>;
  schedule(options: ScheduledNotificationOptions): Promise<void>;
}

// Adapters implement the same interface
class SendGridAdapter implements EmailAdapter { ... }
class SESAdapter implements EmailAdapter { ... }
class PostmarkAdapter implements EmailAdapter { ... }

class TwilioSMSAdapter implements SMSAdapter { ... }
class KaleyraAdapter implements SMSAdapter { ... }
class MSG91Adapter implements SMSAdapter { ... }

class TwilioWhatsAppAdapter implements WhatsAppAdapter { ... }
class 360DialogAdapter implements WhatsAppAdapter { ... }
class WatiBAdapter implements WhatsAppAdapter { ... }

// Platform resolves the right adapter at runtime based on context config
const notifier = capabilityEngine.resolve('notifications', contextId);
// Returns the correct adapter combination for that context
```

---

## Capability-Aware vs. Capability-Unaware

| Approach | Description | Problem |
|----------|-------------|---------|
| **Capability-Unaware** | Plugin imports `openai` directly | Changing provider requires editing every plugin |
| **Capability-Aware** | Plugin injects `AICapability` | Changing provider = change one config value |

**Always be capability-aware.**

---

## Extending Capabilities with Plugin-Provided Capabilities

Plugins can also **register new capabilities** for other plugins to use.

Example: The `@orbitox/hms` (Hospital Management) plugin registers:

```typescript
capabilityEngine.register({
  id: 'hl7-fhir',
  displayName: 'HL7 FHIR',
  description: 'Healthcare data exchange standard',
  provider: '@orbitox/hms/fhir-service',
});
```

Now any other healthcare-adjacent plugin can consume:

```typescript
@Injectable()
class AppointmentService {
  constructor(private readonly fhir: HL7FhirCapability) {}

  async syncToFhir(appointment: Appointment) {
    await this.fhir.createEncounter({...});
  }
}
```

---

*Next: [Part 09 — Data Philosophy](./09_Data_Philosophy.md)*
