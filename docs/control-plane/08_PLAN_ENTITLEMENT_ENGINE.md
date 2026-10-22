# 🪐 Plan & Entitlement Engine Specification (CP-08)
**Classification: Commercial Governance & Feature Gating**

---

## 1. Versioned Plan Contracts

Plans represent legally binding commercial contracts between the platform operator and clients. They are **immutable and versioned**:

```typescript
export interface PlanContract {
  readonly planId: string;             // plan_growth
  readonly version: number;            // 1, 2, 3
  readonly name: string;               // 'Growth Plus'
  readonly status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
  
  // Commercials
  readonly priceUsd: number;
  readonly billingPeriod: 'MONTHLY' | 'ANNUAL';
  
  // Hard Resource Allocations
  readonly includedPackages: string[]; // ['@orbitox/restaurant', '@orbitox/pos', '@orbitox/commerce']
  readonly includedFeatures: string[]; // ['restaurant.kds', 'commerce.discounts']
  readonly maxProjects: number;
  readonly maxEnvironmentsPerProject: number;
  readonly maxTenants: number;
  readonly monthlyApiQuota: number;
  readonly rateLimitRpm: number;
  readonly burstPerSecond: number;
  readonly storageQuotaGb: number;
  
  // Support & SLAs
  readonly supportTier: 'COMMUNITY' | 'BUSINESS' | 'ENTERPRISE_24_7';
  readonly slaPercentage: number;     // 99.9%
}
```

---

## 2. Dynamic Entitlement Evaluation

The backend independently evaluates entitlements at runtime before routing traffic:

$$\text{IsEntitled}(P, F) = (P.\text{status} == \text{ACTIVE}) \land (F \in P.\text{features} \lor P.\text{features} == ['*'])$$

If a project invokes an unentitled feature or un-subscribed package:
- Edge gateway returns HTTP `403 FORBIDDEN` with code `FEATURE_NOT_ENTITLED`.
- Injects resolution guidance:
  ```json
  {
    "error": "FEATURE_NOT_ENTITLED",
    "feature": "restaurant.kds",
    "currentPlan": "starter",
    "requiredPlan": "growth",
    "resolutionUrl": "/platform/projects/proj_01j7/upgrade"
  }
  ```
