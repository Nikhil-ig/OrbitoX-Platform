# 🪐 ORBITOX CONTROL CENTER v4.2
## Resource Editability Matrix

**Specification Reference**: `docs/control-plane/30_RESOURCE_EDITABILITY_MATRIX.md`  
**Milestone**: v4.2 — Universal Resource Editor + Full Control  

---

## 1. Universal Editability & Protection Matrix

| Resource Type | Editable Fields | Immutable Fields | Operable Actions | Approval Required | Rollback Supported |
|---|---|---|---|---|---|
| **ORGANIZATION** | `name`, `billingEmail`, `metadata`, `securityContact` | `id`, `slug`, `createdAt` | `archive`, `suspend`, `activate` | YES (Suspend) | NO |
| **PROJECT** | `name`, `description`, `planTier`, `tags`, `metadata` | `id`, `slug`, `organizationId`, `createdAt` | `clone`, `suspend`, `change_plan`, `archive` | YES (Archive) | YES (Plan revert) |
| **ENVIRONMENT** | `name`, `type`, `region`, `isProduction`, `mTLS`, `rateLimitRpm`, `quotaMonthly` | `id`, `slug`, `projectId`, `createdAt` | `freeze`, `unfreeze`, `promote`, `deprovision`, `reconcile` | YES (Deprovision, Prod changes) | YES (Config restore) |
| **TENANT** | `name`, `domain`, `tier`, `features`, `metadata` | `tenantId`, `environmentId`, `createdAt` | `suspend`, `activate`, `reassign` | NO | YES |
| **PLAN** | `name`, `price`, `currency`, `includedPackages`, `features`, `limits`, `sla` | `id`, `version`, `createdAt` | `create_draft`, `publish`, `deprecate`, `archive` | YES (Publish downgrade) | YES (Version rollback) |
| **FEATURE** | `displayName`, `description`, `enabled`, `defaultTier` | `id`, `key`, `packageId` | `toggle`, `deprecate` | NO | YES |
| **ENTITLEMENT** | `overrideQuota`, `expirationDate`, `status` | `id`, `projectId`, `packageId` | `grant`, `revoke`, `extend` | YES (Revoke) | YES |
| **PACKAGE** | `displayName`, `description`, `compatibility`, `configSchema` | `id`, `name`, `author`, `signature` | `verify`, `install`, `upgrade`, `retire` | YES (Prod upgrade) | YES (Artifact rollback) |
| **INSTALLATION** | `version`, `configuration`, `enabledFeatures`, `serviceBindings` | `id`, `environmentId`, `packageId` | `configure`, `upgrade`, `rollback`, `uninstall` | YES (Prod uninstall) | YES (Version rollback) |
| **SERVICE** | `name`, `replicas`, `cpuReservation`, `memoryLimitMb`, `timeoutSec`, `retryPolicy`, `config` | `id`, `serviceId`, `packageId` | `deploy`, `scale`, `restart`, `drain`, `rollback` | YES (Drain, Prod scale down) | YES (Revision rollback) |
| **NODE** | `name`, `labels`, `drainState`, `maintenanceMode`, `placementPolicy` | `id`, `clusterId`, `region`, `hardware` | `drain`, `cordon`, `uncordon`, `retire` | YES (Drain prod node) | YES (Undrain) |
| **API** | `name`, `description`, `lifecycle`, `rateLimitRpm`, `visibility`, `deprecationDate` | `id`, `path`, `method`, `packageId` | `publish`, `deprecate`, `sunset`, `retire` | YES (Sunset) | YES |
| **CAPABILITY** | `displayName`, `description`, `riskLevel`, `requiredPlanTier`, `auditLevel` | `id`, `name`, `apiId` | `update_policy`, `deprecate` | NO | YES |
| **API_KEY** | `name`, `capabilities`, `expiresAt`, `ipAllowlist`, `rateLimitRpm`, `tags` | `id`, `keyId`, `secret`, `fingerprint` | `scope`, `rotate`, `suspend`, `revoke` | YES (Revoke prod key) | NO (Revocation permanent) |
| **CREDENTIAL** | `name`, `provider`, `rotationIntervalDays`, `consumers`, `metadata` | `id`, `fingerprint`, `vaultPath`, `secret` | `rotate`, `validate`, `migrate`, `revoke` | YES (Revoke) | YES (Prior key grace) |
| **DOMAIN** | `domainName`, `environmentId`, `routeTarget`, `tlsPolicy`, `autoRenew` | `id`, `discoveredAt` | `verify_dns`, `issue_tls`, `activate`, `rebind`, `retire` | YES (Rebind prod) | YES (Revert route) |
| **RATE_LIMIT** | `requestsPerMinute`, `burstCapacity`, `windowSeconds`, `scope` | `id`, `platformCeiling` | `override`, `reset_inherited` | NO | YES |
| **QUOTA** | `limitValue`, `unit`, `gracePercentage`, `enforcementMode` | `id`, `resourceType` | `update`, `reset` | YES (Prod increase) | YES |
| **WEBHOOK** | `url`, `events`, `secret`, `retryCount`, `enabled` | `id`, `projectId`, `createdAt` | `test_ping`, `toggle`, `delete` | NO | YES |
| **POLICY** | `rules`, `description`, `defaultEffect`, `priority` | `id`, `namespace` | `validate`, `publish`, `rollback` | YES (Prod publish) | YES |
| **FEATURE_FLAG** | `enabled`, `percentageRollout`, `allowlistTenants`, `conditions` | `id`, `key` | `toggle`, `adjust_rollout` | NO | YES |
| **AI_AGENT** | `modelProvider`, `modelId`, `temperature`, `maxTokens`, `allowedMcpTools` | `id`, `agentId` | `test_prompt`, `update_config` | NO | YES |
| **MCP_SERVER** | `endpointUrl`, `transport`, `timeoutSec`, `enabledTools` | `id`, `serverId` | `restart`, `discover_tools` | NO | YES |

---

## 2. Inviolable Security Bounds
1. `secret` fields are WRITE-ONLY or REPLACE-ONLY. Never exposed to browser or returned in GET payloads.
2. `resourceId` / `id` / `slug` identities cannot be mutated after creation.
3. Observed telemetry fields (`currentCpu`, `observedDns`, `activeConnections`) cannot be targeted by edit mutations.
