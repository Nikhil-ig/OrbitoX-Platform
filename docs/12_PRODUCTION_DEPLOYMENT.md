# 🎯 Step 12: Production Deployment & Hardening Guide

This guide walks through everything required to safely deploy your OrbitoX application to a production environment — from security hardening and infrastructure setup to monitoring and health checks.

---

## 🏗️ Production Infrastructure Topology

```mermaid
graph TD
    Client["💻 Clients\n(Web / Mobile Apps)"]
    LB["⚖️ Load Balancer\n(Nginx / AWS ALB / Cloudflare)"]
    
    subgraph AppCluster ["🖥️ App Cluster (Multiple Instances)"]
        App1["🪐 OrbitoX Node 1\nmode: strict"]
        App2["🪐 OrbitoX Node 2\nmode: strict"]
    end

    subgraph DataLayer ["🗄️ Data Layer"]
        Redis["🗄️ Redis Cluster\n(BullMQ Job Queues)"]
        DB["🗃️ PostgreSQL / PlanetScale\n(Contexts, Audit Logs, Entities)"]
    end

    subgraph External ["🌐 External Services"]
        OpenAI["🤖 OpenAI / Gemini API"]
        Stripe["💳 Stripe (Billing)"]
        SMTP["📧 SMTP / Postmark (Emails)"]
        Slack["💬 Slack / Teams (Notifications)"]
    end

    Monitor["📊 Monitoring\n(Datadog / Grafana)"]

    Client --> LB
    LB --> App1
    LB --> App2
    App1 --> Redis
    App2 --> Redis
    App1 --> DB
    App2 --> DB
    App1 --> External
    App2 --> External
    App1 -.-> Monitor
    App2 -.-> Monitor
```

---

## 📋 Pre-Flight Production Checklist

| Category | Task | How to Verify | Priority |
| :--- | :--- | :--- | :--- |
| **Security** | Switch to `mode: 'strict'` | `orbitox.configure({ mode: 'strict' })` | 🔴 Critical |
| **Security** | All ABAC policies registered | Review `orbitox.security.addAbacPolicy(...)` calls | 🔴 Critical |
| **Redis** | Redis host + port configured | `redis-cli -h HOST ping` → `PONG` | 🔴 Critical |
| **AI Provider** | API key environment variables set | `echo $OPENAI_API_KEY` (non-empty) | 🟠 High |
| **Database** | Persistent storage connected | Check DB connection pool health | 🔴 Critical |
| **Audit** | Hash chain integrity verified | Query first and last audit block hashes | 🟠 High |
| **Health Endpoint** | Uptime monitoring enabled | `curl https://yourapp.com/health` → `{ status: 'ok' }` | 🟡 Medium |
| **Feature Flags** | Defaults reviewed and set correctly | Audit all flags with `defaultValue: true` | 🟡 Medium |
| **Billing Plans** | Production plans created and active | `orbitox.billing.listPlans()` | 🟡 Medium |
| **HTTPS** | TLS/SSL certificate active | `curl -I https://...` → `200 OK` | 🔴 Critical |

---

## 🔄 `open` → `strict` Migration Flow

```mermaid
flowchart TD
    Dev["🔧 Development Mode\norbitox.configure(\{ mode: 'open' \})"]
    
    T1["✅ Build all UI components\n✅ Define all entities & routes\n✅ Write business logic\n✅ Test workflows & events"]
    
    Switch["🔒 Switch to Strict Mode\norbitox.configure(\{ mode: 'strict' \})"]
    
    T2["⚙️ Assign user roles via assignRole()\n⚙️ Register ABAC policies via addAbacPolicy()\n⚙️ Configure Redis + AI keys\n⚙️ Verify /health endpoint"]
    
    Prod["🚀 Production Deployment\nAll 3 security layers enforced"]

    Dev --> T1
    T1 --> Switch
    Switch --> T2
    T2 --> Prod
```

---

## ⚙️ Production Configuration Code

```typescript
import { orbitox } from '@orbitox/runtime';

// ✅ Full production configuration
orbitox.configure({
  // 🔒 Enable all 3 security layers
  mode: 'strict',

  // 🗄️ Redis for distributed BullMQ queues
  redis: {
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.NODE_ENV === 'production', // TLS in production
  },

  // 🤖 AI provider (switch easily between openai/gemini/azure)
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    maxRetries: 3,
    timeout: 30_000, // 30 second timeout
  },
});

// 🛡️ Register all production ABAC policies
orbitox.security.addAbacPolicy({
  id: 'active-users-only',
  resourceType: '*',
  action: '*',
  rule: { "==": [{ "var": "user.attributes.status" }, "active"] }
});

// 📊 Health endpoint verification
const health = await orbitox.health();
console.log('Platform health:', health);
// { status: 'ok', mode: 'strict', redisConnected: true, entitiesLoaded: 4 }
```

---

## 📊 Environment Variables Reference

| Variable | Required | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `REDIS_HOST` | ✅ Production | Redis server hostname | `redis.myapp.internal` |
| `REDIS_PORT` | ✅ Production | Redis server port | `6379` |
| `REDIS_PASSWORD` | If secured | Redis AUTH password | `s3cr3tpassw0rd` |
| `OPENAI_API_KEY` | For AI features | OpenAI API key | `sk-proj-abc123...` |
| `GEMINI_API_KEY` | For AI features | Google Gemini API key | `AIza...` |
| `DATABASE_URL` | ✅ Production | DB connection string | `postgresql://user:pass@host/db` |
| `NODE_ENV` | ✅ Always | Environment name | `production` |
| `PORT` | Optional | Override app port | `3000` |

---

[⬅️ Prev: CLI & Scaffolding](./11_CLI_SCAFFOLDING.md) | [Back to Index](./README.md)
