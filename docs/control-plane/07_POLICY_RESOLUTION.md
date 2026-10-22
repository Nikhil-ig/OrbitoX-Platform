# 🪐 Policy Resolution Engine Specification (CP-07)
**Classification: Governance, Inheritance & Authorization**

---

## 1. Hierarchical Inheritance Pipeline

OrbitoX resolves operational policies through a deterministic 4-tier inheritance cascade:

$$\text{Effective Policy} = \text{Platform Default} \oplus \text{Plan Policy} \oplus \text{Project Override} \oplus \text{Environment Override}$$

```
                ┌───────────────────────────────────┐
                │      Platform Default Policy      │  (Base Safety Floor)
                └─────────────────┬─────────────────┘
                                  │ Inherits & Specializes
                                  ▼
                ┌───────────────────────────────────┐
                │        Plan Contract Policy       │  (Commercial Tier Cap)
                └─────────────────┬─────────────────┘
                                  │ Inherits & Specializes
                                  ▼
                ┌───────────────────────────────────┐
                │      Project Policy Override      │  (Account-Level Customization)
                └─────────────────┬─────────────────┘
                                  │ Inherits & Specializes
                                  ▼
                ┌───────────────────────────────────┐
                │   Environment Policy Override     │  (Staging vs Production Rules)
                └─────────────────┬─────────────────┘
                                  │ Evaluates
                                  ▼
                ┌───────────────────────────────────┐
                │     EFFECTIVE RESOLVED POLICY     │  (Authoritative Decision)
                └───────────────────────────────────┘
```

---

## 2. Policy Categories & Conflict Resolution

| Policy Domain | Platform Default | Plan Cap (e.g. Growth) | Project Override | Environment Override | Effective Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **API Rate Limit** | 600 RPM | 1,200 RPM | 2,000 RPM *(Blocked by plan cap)* | 1,000 RPM (Prod) | **1,000 RPM** |
| **Key Max Lifetime** | 365 Days | 90 Days | 60 Days | 30 Days (Prod strict) | **30 Days** |
| **Four-Eyes Quorum** | Optional | Optional | Mandatory in Prod | Mandatory in Prod | **MANDATORY** |
| **Storage Cap** | 10 GB | 50 GB | 100 GB *(With add-on quota)* | 100 GB | **100 GB** |

### The "Why?" Policy Explainer
Every calculated property exposes an explanation tree answering:
```json
{
  "property": "rateLimitPerMin",
  "effectiveValue": 1000,
  "derivationTree": [
    { "source": "PLATFORM_DEFAULT", "value": 600 },
    { "source": "PLAN_GROWTH", "value": 1200 },
    { "source": "ENVIRONMENT_OVERRIDE_PROD", "value": 1000, "reason": "Production strict throttling policy" }
  ],
  "reason": "Environment policy caps rate limit at 1,000 RPM for safety."
}
```
