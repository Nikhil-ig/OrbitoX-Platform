# Workflow & Rule Engine Specification

---

## Executive Summary

To make business logic completely customizable per Organisation, Tenant, and Company without code changes, the platform embeds a high-performance **JSON Logic Rule Engine** and a **Configurable State Machine Engine**.

---

## 1. JSON Logic Business Rule Engine

The Rule Engine evaluates business criteria stored as JSON definitions in PostgreSQL / Redis. 

### Structure of a Business Rule Definition

```json
{
  "id": "rule_tenant_discount_v1",
  "org_id": "org-001",
  "tenant_id": "tenant-005",
  "target_event": "cart.calculate_totals",
  "priority": 10,
  "condition": {
    "and": [
      { ">=": [{ "var": "cart.total" }, 100] },
      { "==": [{ "var": "user.membership_tier" }, "GOLD"] }
    ]
  },
  "action": {
    "type": "APPLY_DISCOUNT",
    "params": {
      "discount_type": "PERCENTAGE",
      "value": 15
    }
  }
}
```

### Supported Action Types
- `APPLY_DISCOUNT` / `ADD_SURCHARGE`
- `TRIGGER_NOTIFICATION` (Email, SMS, Push, WhatsApp)
- `ROUTE_WORKFLOW` (Assign to specific role/user)
- `BLOCK_ACTION` (Throw business validation error)
- `INVOKE_WEBHOOK` (Send payload to external API)

---

## 2. Configurable State Machine Engine

All core business objects (Orders, Service Tickets, Onboarding Applications, Withdrawals) follow a state machine defined in configuration.

### State Machine Schema Definition

```json
{
  "entity": "WithdrawalRequest",
  "tenant_id": "tenant-005",
  "initial_state": "REQUESTED",
  "states": {
    "REQUESTED": {
      "on": {
        "APPROVE": [
          {
            "target": "APPROVED",
            "condition": { "<=": [{ "var": "amount" }, 1000] }
          },
          {
            "target": "PENDING_MANAGER_APPROVAL",
            "condition": { ">": [{ "var": "amount" }, 1000] }
          }
        ],
        "REJECT": "REJECTED"
      }
    },
    "PENDING_MANAGER_APPROVAL": {
      "on": {
        "MANAGER_APPROVE": "APPROVED",
        "MANAGER_REJECT": "REJECTED"
      }
    },
    "APPROVED": {
      "on": {
        "PROCESS_PAYOUT": "PROCESSING"
      }
    },
    "PROCESSING": {
      "on": {
        "GATEWAY_SUCCESS": "COMPLETED",
        "GATEWAY_FAIL": "FAILED"
      }
    },
    "COMPLETED": { "type": "final" },
    "REJECTED": { "type": "final" },
    "FAILED": { "type": "final" }
  }
}
```

### State Machine Enforcement Logic

```typescript
@Injectable()
export class WorkflowEngineService {
  async transition(context: IRequestContext, entityId: string, eventName: string): Promise<StateResult> {
    const entity = await this.loadEntity(context, entityId);
    const machineDef = await this.getMachineDefinition(context, entity.type);

    const currentState = machineDef.states[entity.status];
    const transitionRules = currentState?.on[eventName];

    if (!transitionRules) {
      throw new InvalidStateTransitionException(`Event ${eventName} valid from state ${entity.status}`);
    }

    // Evaluate transition conditions using JSON Logic
    const targetState = this.ruleEngine.evaluateTransition(transitionRules, { entity, context });

    // Mutate state securely inside RLS context
    await this.updateEntityState(context, entityId, targetState);
    
    // Broadcast state transition event
    this.eventBus.emit(`${entity.type}.state_changed`, { entityId, from: entity.status, to: targetState });

    return { previousState: entity.status, newState: targetState };
  }
}
```
