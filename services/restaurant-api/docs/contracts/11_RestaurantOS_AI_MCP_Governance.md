# 🤖 RestaurantOS AI & MCP Governance Specification (11)

> **Contract Reference:** `11_RestaurantOS_AI_MCP_Governance.md`  
> **Status:** Production Architecture Baseline (v2.1 Hardened)  
> **Package Target:** `@orbitox-io/restaurant-ai`, `@orbitox-io/mcp`

---

## 1. Tool-First AI Architecture & Gateway

AI agents (Copilots, Autonomous Workers) **never receive direct database credentials or raw SQL access**. All interactions route through the **OrbitoX Tool Gateway**:

```
AI Agent ➔ Tool Gateway (Schema Validation & Scope Check) ➔ Policy Engine ➔ Domain Service ➔ DB
```

### 1.1 Invariant: Execution Context Isolation
The tenant, company, and location boundaries are injected from the **trusted server execution context** (`AsyncLocalStorage`), never trusted from LLM prompt parameters:

```typescript
// SECURE TOOL INVOCATION PATTERN
export async function handleGetSalesSummaryTool(
  toolInput: GetSalesSummaryInput,
  trustedContext: ActorContext // Injected by framework, not by the LLM
) {
  // LLM cannot spoof companyId or locationId
  return salesService.getSummary({
    tenantId: trustedContext.tenantId,
    companyId: trustedContext.companyId,
    locationId: trustedContext.locationId,
    dateRange: toolInput.dateRange,
  });
}
```

---

## 2. Five Formal AI Action Levels

| Level | Classification | Execution Rule | Domain Examples |
|---|---|---|---|
| **Level 0** | **Observe** | Read-only queries with PII masking. | Explaining revenue dips, analyzing station bottlenecks. |
| **Level 1** | **Recommend** | Surfaces suggestions with human-readable rationale. | Suggesting prep volume increases, capacity-aware upsells. |
| **Level 2** | **Draft** | Creates uncommitted draft records in database. | Drafting a weekend promotional campaign or purchase order. |
| **Level 3** | **Human Approve** | Requires explicit manager click to execute. | Approving an inventory purchase order, publishing a menu. |
| **Level 4** | **Controlled Automation** | Whitelisted low-risk autonomous triggers. | Auto-86'ing items when raw ingredient balance hits zero. |
| **Level 5** | **Never Autonomous** | **Strictly Prohibited** from AI execution. | Processing refunds, charging cards, altering tax rates, RLS policies. |

---

## 3. Model Context Protocol (MCP) Server Specification

RestaurantOS exposes a capability-scoped **Model Context Protocol (MCP)** server for external AI tools and developer pair-programming:

```json
{
  "name": "orbitox-restaurant-mcp",
  "version": "2.1.0",
  "tools": [
    {
      "name": "restaurant_get_kitchen_load",
      "description": "Fetches current station queue lengths, active ticket counts, and delay warnings.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "stationId": { "type": "string", "description": "Optional filter by station ID" }
        }
      }
    },
    {
      "name": "restaurant_draft_purchase_order",
      "description": "Creates a draft supplier purchase order based on forecasted ingredient shortages (Action Level: 2).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "supplierId": { "type": "string" },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "ingredientId": { "type": "string" },
                "quantityGrams": { "type": "number" }
              },
              "required": ["ingredientId", "quantityGrams"]
            }
          }
        },
        "required": ["supplierId", "items"]
      }
    }
  ]
}
```
