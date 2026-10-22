# 🪐 OrbitoX Platform Control Center: Platform Overview Wireframe (v3.1)
**Document Ref: PCC-22**  
**Classification: Landing Page Wireframe & Layout Specification**

---

## 1. Overview Page Layout Blueprint

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Platform / Overview                                                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  Platform Overview                                                                     │
│  Everything is operational. 2 items need attention.                                    │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 128 Projects       12.8M Requests / 24h       0.12% Error Rate       Good Security │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  ATTENTION (2)                                                                         │
│                                                                                        │
│  🔴 Production API key has excessive privileges   OmniDeliver / Production   Review →   │
│  🟠 Stripe credential expires in 8 days           Stripe / Production        Rotate →   │
│                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  PROJECTS                                        PLATFORM ACTIVITY                     │
│                                                                                        │
│  OmniDeliver          Enterprise  Healthy        12:42  API key created (Admin A)      │
│  MedNet Global        Enterprise  Healthy        12:36  Package verified (@orbitox/crm)│
│  Aura Luxury Brands   Growth      Healthy        12:11  Project provisioned (Omni)     │
│                                                  11:58  Security scan passed (0 crit)  │
│  View all projects →                                                                   │
│                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  SYSTEM HEALTH                                                                         │
│                                                                                        │
│  API Gateway          ● Operational    3.2ms p95      0.02% error                      │
│  Database Cluster     ● Operational    1.4ms p95      Healthy pool                     │
│  Redis In-Memory      ● Operational    0.6ms p95      RAM cached                       │
│  Background Workers   ● Operational    Active         0 queued lag                     │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Information Hierarchy Rules

1. **Top Metric Strip**:
   - Single clean horizontal bar (`border-top: 1px solid border`, `border-bottom: 1px solid border`).
   - Pure typography and small metric labels. Zero glowing rounded tiles. Zero decorative emojis.
2. **Attention Queue**:
   - High-contrast visual focus.
   - Clean row format: severity dot, title, contextual tag, inline action button.
   - Click to inspect or resolve directly.
3. **Projects Table**:
   - Compact table preview showing primary projects, tier, environment count, and status.
   - Clickable rows opening the Project Inspector drawer.
4. **Platform Activity Stream**:
   - Minimalist chronological event stream with relative timestamps and actor.
5. **System Health Strip**:
   - Subsystem status, latency metric, and availability. Replaces the heavy mesh network graph with operational clarity.
