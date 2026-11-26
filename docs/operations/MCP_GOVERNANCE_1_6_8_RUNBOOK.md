# MCP Governance Revision 1.6.8 — Operational Runbooks

## 1. Operational Migration Reconciliation (`20261126140000`, `20261126150000`, `20261126193000`)

Before executing `prisma migrate deploy` in an environment where Revision 1.6.7 DDL was pushed directly without `_prisma_migrations` registration:

1. **Verify Existing DDL Presence (Read-Only):**
   - Confirm `McpToolApproval.encryptedPayload`, `McpToolApproval.encryptionKid`, `McpToolExecution`, `AccountEmailOutbox.idempotencyKey`, and expected `CHECK` constraints exist.
2. **Baseline Idempotent Migrations if Already Present:**
   - Run the idempotent `20261126140000` and `20261126150000` SQL statements via `MIGRATOR_DATABASE_URL` if any object is absent, then register both cleanly:
     ```bash
     cd apps/platform
     npx prisma migrate resolve --applied 20261126140000_mcp_governance_integrity
     npx prisma migrate resolve --applied 20261126150000_mcp_audit_durability
     ```
3. **Apply Revision 1.6.8 Migration:**
   ```bash
   npx prisma migrate deploy
   npx prisma migrate status
   ```

---

## 2. Restricted Security Incident Procedure — Historical Credential Redaction

Runtime application roles (`orbitox_runtime`, `orbitox_platform_admin_audit`) **never** execute historical row redaction via an API toggle. Any historical credential exposure in audit or invocation logs from pre-1.6.8 releases must follow this controlled procedure:

1. **Dual-Control Authorization:** Require written approval from both Security Lead and Platform Owner under an incident ticket ID.
2. **Credential Revocation First:** Revoke any exposed API key immediately (`PlatformApiKey.status = 'REVOKED'`) before touching audit history.
3. **Encrypted Snapshot & Hash-Chain Pre-Image Export:** Capture an encrypted snapshot of `PlatformAuditEvent`, `McpToolInvocation`, and `McpToolApproval` and export pre-redaction SHA-256 chain hashes around each affected tenant scope.
4. **Read-Only Discovery Scan:** Scan `McpToolInvocation.actorId`, `McpToolInvocation.actorEmail`, `PlatformAuditEvent.actorId`, `PlatformAuditEvent.actorEmail`, and `PlatformAuditEvent.metadata` for raw secret prefixes (`ox_live_`, `ox_test_`, `Bearer `). Record the exact primary key `id` list.
5. **Isolated Maintenance Execution (`orbitox_audit_resolver`):**
   - Execute a scoped SQL transaction under `orbitox_audit_resolver` (never `orbitox_runtime`) targeting **only** confirmed affected row IDs, replacing exposed tokens with `[REDACTED_INCIDENT_<ticketId>]` while leaving row IDs and non-secret fields intact.
6. **Chain Attestation & Incident Audit Event:**
   - Record affected row IDs, pre-redaction SHA-256 chain digests, post-redaction attestation, and dual approvers inside a new immutable `SECURITY_INCIDENT_CREDENTIAL_REDACTION` record in `PlatformAuditEvent`.
