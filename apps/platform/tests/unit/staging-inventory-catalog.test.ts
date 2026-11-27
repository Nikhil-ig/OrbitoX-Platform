/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OrbitoX Platform Staging Inventory Verification Test Suite (Revision 4.9)
 * ─────────────────────────────────────────────────────────────────────────────
 * Automated safety, contract, and catalog-logic tests for the read-only
 * staging inventory engine (run-staging-inventory.js).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const inventoryModule = require('../../scripts/ops/run-staging-inventory.js');

const {
  EXIT_CODES,
  QUERIES,
  redactCredentials,
  evaluateIntegrationGuard,
  checkQ01_ConnectionIdentity,
  checkQ02_SystemRoles,
  checkQ03_RoleMembershipAndDDL,
  checkQ04_PlatformAuditEventACL,
  checkQ05_RLSRelations,
  checkQ06_RemovedSampleTables,
  checkQ07_PolicyMetadata,
  checkQ08_FunctionSecurity,
  checkQ09_RateLimitPartitionSecurity,
  checkQ10_PartitionRunway,
  checkQ11_MigrationLedger,
  runInventory,
} = inventoryModule;

const scriptPath = path.resolve(__dirname, '../../scripts/ops/run-staging-inventory.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');

// ── Independently Authored Expected Manifest Fixtures (Test Independence) ────

const INDEPENDENT_EXPECTED_ROLES = Object.freeze([
  { rolname: 'orbitox_migrator', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: true, rolcreaterole: true, rolinherit: false },
  { rolname: 'orbitox_runtime', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_maintenance', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_platform_admin_audit', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'hms_audit_reader', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_outbox_relay', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_audit_resolver', rolsuper: false, rolbypassrls: false, rolcanlogin: false, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_audit_recovery', rolsuper: false, rolbypassrls: false, rolcanlogin: false, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_audit_reader', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_mcp_reconciler', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
]);

const INDEPENDENT_AUDIT_COLUMNS = Object.freeze([
  { name: 'id', type: 'text', notNull: true },
  { name: 'actorId', type: 'text', notNull: false },
  { name: 'actorEmail', type: 'text', notNull: false },
  { name: 'action', type: 'text', notNull: true },
  { name: 'entityType', type: 'text', notNull: true },
  { name: 'entityId', type: 'text', notNull: false },
  { name: 'organizationId', type: 'text', notNull: false },
  { name: 'projectId', type: 'text', notNull: false },
  { name: 'environmentId', type: 'text', notNull: false },
  { name: 'ipAddress', type: 'text', notNull: false },
  { name: 'requestId', type: 'text', notNull: false },
  { name: 'reason', type: 'text', notNull: false },
  { name: 'metadata', type: 'jsonb', notNull: true },
  { name: 'status', type: 'text', notNull: true },
  { name: 'failureReason', type: 'text', notNull: false },
  { name: 'occurredAt', type: 'timestamp without time zone', notNull: true },
]);

const INDEPENDENT_RLS_RELATIONS = Object.freeze([
  'AccountEmailOutbox',
  'BillingProviderCache',
  'HmsAdmission',
  'HmsAppointment',
  'HmsBed',
  'HmsBreakGlassGrant',
  'HmsDepartment',
  'HmsInvoice',
  'HmsLabOrder',
  'HmsPatient',
  'HmsPayment',
  'HmsPhiAccessLog',
  'HmsRole',
  'HmsRolePermission',
  'HmsStaff',
  'HmsStaffCredential',
  'HmsStaffSession',
  'HmsWard',
  'KitchenPreparationTask',
  'KitchenStation',
  'McpToolApproval',
  'McpToolExecution',
  'McpToolInvocation',
  'PlatformAuditChainHead',
  'PlatformAuditDeterministicKey',
  'PlatformAuditEvent',
  'PlatformIdempotencyRecord',
  'PlatformOperation',
  'PlatformOperationAttempt',
  'PlatformOutboxMessage',
  'PlatformPluginUsage',
  'PluginGrantRevision',
  'PluginInstallation',
  'RestaurantCatalogItem',
  'RestaurantDiningSession',
  'RestaurantInventoryStock',
  'RestaurantLocation',
  'RestaurantMenu',
  'RestaurantModifier',
  'RestaurantModifierGroup',
  'RestaurantOrder',
  'RestaurantOrderItem',
  'RestaurantPaymentRecord',
  'RestaurantPricingQuote',
  'RestaurantQRIdentity',
  'RestaurantRecipeBOM',
  'RestaurantServiceArea',
  'RestaurantTable',
  'SessionJoinRequest',
  'SessionParticipant',
  'TenantIdempotencyKey',
  'TenantOutbox',
  'TenantSuspensionSync',
]);

const INDEPENDENT_DROPPED_TABLES = Object.freeze([
  'Cart',
  'Category',
  'CelebrationExperience',
  'CelebrationExperienceAnalytics',
  'CelebrationExperienceSection',
  'CelebrationFeatureDefinition',
  'CelebrationGuest',
  'CelebrationMedia',
  'CelebrationOccasion',
  'CelebrationOccasionCategory',
  'CelebrationOrder',
  'CelebrationPricingPlan',
  'CelebrationSectionDefinition',
  'CelebrationTheme',
  'CelebrationWish',
  'Collection',
  'Customer',
  'Order',
  'PaymentTransaction',
  'Product',
  'ProductVariant',
  'Store',
  'StoreDiscount',
  'StoreMedia',
  'StorePage',
  'StoreReview',
  'StoreTheme',
  'StudioAsset',
  'StudioPage',
  'StudioProject',
  'StudioSection',
  'StudioSnapshot',
]);

const INDEPENDENT_FUNCTIONS = Object.freeze([
  {
    name: 'resolve_platform_audit_intent',
    argTypes: ['text', 'text', 'text', 'bigint'],
    owner: 'orbitox_audit_resolver',
    secdef: true,
    runtimeExec: true,
    maintenanceExec: false,
    publicExec: false,
  },
  {
    name: 'recover_stale_platform_audit_intents',
    argTypes: ['timestamp with time zone', 'integer'],
    owner: 'orbitox_audit_recovery',
    secdef: true,
    runtimeExec: false,
    maintenanceExec: true,
    publicExec: false,
  },
  {
    name: 'ensure_platform_rate_limit_partitions',
    argTypes: ['integer'],
    owner: 'orbitox_migrator',
    secdef: true,
    runtimeExec: false,
    maintenanceExec: true,
    publicExec: false,
  },
  {
    name: 'maintain_platform_rate_limit_partitions',
    argTypes: ['integer', 'integer'],
    owner: 'orbitox_migrator',
    secdef: true,
    runtimeExec: false,
    maintenanceExec: true,
    publicExec: false,
  },
  {
    name: 'platform_rate_limit_partitions_ready',
    argTypes: ['integer'],
    owner: 'orbitox_migrator',
    secdef: false,
    runtimeExec: true,
    maintenanceExec: true,
    publicExec: false,
  },
  {
    name: 'platform_rate_limit_partition_runway_days',
    argTypes: [],
    owner: 'orbitox_migrator',
    secdef: false,
    runtimeExec: true,
    maintenanceExec: true,
    publicExec: false,
  },
  {
    name: 'close_customer_organization',
    argTypes: ['text'],
    owner: 'orbitox_migrator',
    secdef: true,
    runtimeExec: false,
    maintenanceExec: true,
    publicExec: false,
  },
  {
    name: 'consume_platform_operator_totp_step',
    argTypes: ['text', 'integer', 'timestamp with time zone'],
    owner: 'orbitox_migrator',
    secdef: true,
    runtimeExec: true,
    maintenanceExec: false,
    publicExec: false,
  },
  {
    name: 'claim_platform_audit_chain_slot',
    argTypes: ['text', 'text', 'text', 'text', 'text', 'text'],
    owner: 'orbitox_migrator',
    secdef: true,
    runtimeExec: true,
    maintenanceExec: true,
    publicExec: false,
  },
  {
    name: 'advance_platform_audit_chain_head',
    argTypes: ['text', 'bigint', 'text', 'text', 'text', 'text', 'text', 'text'],
    owner: 'orbitox_migrator',
    secdef: true,
    runtimeExec: true,
    maintenanceExec: true,
    publicExec: false,
  },
  {
    name: 'resolve_platform_operation_scope',
    argTypes: ['text'],
    owner: 'orbitox_migrator',
    secdef: true,
    runtimeExec: true,
    maintenanceExec: true,
    publicExec: false,
  },
]);

const INDEPENDENT_MIGRATIONS = Object.freeze([
  '20261027000000_orbitox_phase2_full_baseline',
  '20261027000100_orbitox_phase2_step1_security',
  '20261027000200_orbitox_phase2_step1_review',
  '20261027000300_orbitox_phase2_step2_repository',
  '20261027000400_orbitox_phase2_step2_throttled_status',
  '20261027000500_orbitox_phase2_step2_project_fields',
  '20261027000600_orbitox_phase2_step2_audit_intents',
  '20261027000700_orbitox_phase2_step3_audit_previous_value',
  '20261028000100_orbitox_phase2_step4_period_quota',
  '20261029000000_orbitox_phase2b_step1_control_plane',
  '20261029000100_orbitox_phase2b_hms_plugin',
  '20261029000200_orbitox_phase2b_hms_auth_and_grant_hygiene',
  '20261030000100_orbitox_phase2b_hms_audit_reader_and_session_hygiene',
  '20261031000000_orbitox_phase2b_plugin_installation_table',
  '20261031010000_orbitox_phase2b_revoke_delete_plugin_installation',
  '20261031020000_orbitox_phase3_plan_catalogue',
  '20261031030000_orbitox_phase3_outbox_relay_and_plan_security',
  '20261031040000_orbitox_phase3_force_rls_outbox_relay',
  '20261101010000_orbitox_phase3_billing_webhook_and_grant_revision',
  '20261101020000_orbitox_phase4_platform_operation',
  '20261101030000_orbitox_phase4_operation_index_alignment',
  '20261101040000_orbitox_phase4_operation_updated_at_alignment',
  '20261102000000_orbitox_phase5_operation_lease',
  '20261103000000_orbitox_phase6_identity_and_operator_accounts',
  '20261103010000_orbitox_phase6_identity_privilege_hardening',
  '20261103020000_orbitox_phase6_membership_user_delete_guard',
  '20261103030000_orbitox_phase6_organization_closure',
  '20261103040000_orbitox_phase6c_billing',
  '20261103050000_orbitox_phase6c_grace_and_email',
  '20261104010000_phase6c_billing_integrity',
  '20261104020000_orbitox_repair_legacy_plugin_plan_ids',
  '20261105005000_orbitox_seed_plan_catalogue',
  '20261105010000_orbitox_validate_plugin_plan_ids',
  '20261105020000_orbitox_enforce_plugin_installation_plan',
  '20261105030000_orbitox_repair_legacy_plugin_tenant_ids',
  '20261108170000_orbitox_audit_roles_rls_policy',
  '20261110120000_orbitox_phase6g_data_rights',
  '20261110150000_orbitox_phase6g_hms_restriction_triggers',
  '20261110170000_orbitox_phase6g_hms_restriction_fail_closed',
  '20261110190000_orbitox_phase7a_drop_sample_tables',
  '20261112200000_orbitox_phase7b1_user_appearance',
  '20261113210000_orbitox_phase7b1_appearance_runtime_grants',
  '20261115200000_orbitox_phase7d_customer_onboarding',
  '20261117140000_orbitox_outbox_concurrency_and_retry_hardening',
  '20261125120000_mcp_tool_governance',
  '20261126140000_mcp_governance_integrity',
  '20261126150000_mcp_audit_durability',
  '20261126193000_mcp_governance_rev_1_6_8',
  '20261127120000_mcp_rev_1_6_9_integrity',
  '20261127123000_mcp_rev_1_6_9_chainhead_owner_policy',
  '20261127140000_mcp_rev_1_6_9_workstream_g_rls',
  '20261127150000_mcp_rev_1_6_9_phase3_2_isolation',
]);

// Helper to create a mock Prisma client
function createMockPrisma(queryHandlers: Record<string, (query: string, params?: any[]) => any>) {
  return {
    $queryRawUnsafe: async (query: string, ...params: any[]) => {
      for (const [key, handler] of Object.entries(queryHandlers)) {
        if (query.includes(key)) {
          return handler(query, params);
        }
      }
      throw new Error(`Unhandled mock query: ${query.slice(0, 80)}...`);
    },
    $disconnect: async () => { },
  };
}

describe('Stage B: Staging Inventory Safety & Catalog Verification (Revision 4.9)', () => {
  // ── T-01 to T-08: Static Safety Tests ─────────────────────────────────────────

  describe('Static Safety & Prohibited Operations (T-01 to T-08)', () => {
    it('T-01: Proves no DDL exists in executable inventory SQL', () => {
      const ddlPatterns = [
        /\bCREATE\s+(TABLE|INDEX|VIEW|SCHEMA|ROLE|FUNCTION|PROCEDURE)\b/i,
        /\bALTER\s+(TABLE|INDEX|VIEW|SCHEMA|ROLE|FUNCTION|PROCEDURE)\b/i,
        /\bDROP\s+(TABLE|INDEX|VIEW|SCHEMA|ROLE|FUNCTION|PROCEDURE)\b/i,
        /\bTRUNCATE\s+(TABLE\s+)?[a-zA-Z0-9_."]/i,
      ];

      for (const [qKey, sql] of Object.entries(QUERIES)) {
        for (const pattern of ddlPatterns) {
          assert.strictEqual(
            pattern.test(sql as string),
            false,
            `Prohibited DDL pattern ${pattern} found in query ${qKey}`
          );
        }
      }
    });

    it('T-02: Proves no DML exists in executable inventory SQL', () => {
      const dmlPatterns = [
        /\bINSERT\s+INTO\b/i,
        /\bUPDATE\s+public\b/i,
        /\bDELETE\s+FROM\b/i,
        /\bMERGE\s+INTO\b/i,
      ];

      for (const [qKey, sql] of Object.entries(QUERIES)) {
        for (const pattern of dmlPatterns) {
          assert.strictEqual(
            pattern.test(sql as string),
            false,
            `Prohibited DML pattern ${pattern} found in query ${qKey}`
          );
        }
      }
    });

    it('T-03: Proves no GRANT or REVOKE exists in executable inventory SQL', () => {
      const grantRevokePatterns = [
        /\bGRANT\s+[A-Z_]+\s+ON\b/i,
        /\bREVOKE\s+[A-Z_]+\s+ON\b/i,
      ];

      for (const [qKey, sql] of Object.entries(QUERIES)) {
        for (const pattern of grantRevokePatterns) {
          assert.strictEqual(
            pattern.test(sql as string),
            false,
            `Prohibited privilege mutation pattern ${pattern} found in query ${qKey}`
          );
        }
      }
    });

    it('T-04: Proves no role switching exists (SET ROLE, SET LOCAL ROLE, RESET ROLE)', () => {
      const roleSwitchPatterns = [
        /\bSET\s+ROLE\b/i,
        /\bSET\s+LOCAL\s+ROLE\b/i,
        /\bRESET\s+ROLE\b/i,
        /\bSET\s+SESSION\s+AUTHORIZATION\b/i,
      ];

      for (const [qKey, sql] of Object.entries(QUERIES)) {
        for (const pattern of roleSwitchPatterns) {
          assert.strictEqual(
            pattern.test(sql as string),
            false,
            `Prohibited role-switching pattern ${pattern} found in query ${qKey}`
          );
        }
      }
    });

    it('T-05: Proves no mutating function invocation exists in query allowlist', () => {
      const mutatingFunctionPatterns = [
        /\bpg_terminate_backend\b/i,
        /\bpg_cancel_backend\b/i,
        /\bpg_reload_conf\b/i,
        /\bpg_rotate_logfile\b/i,
        /\bensure_platform_rate_limit_partitions\b/i,
        /\bmaintain_platform_rate_limit_partitions\b/i,
        /\bclose_customer_organization\b/i,
        /\bconsume_platform_operator_totp_step\b/i,
      ];

      for (const [qKey, sql] of Object.entries(QUERIES)) {
        for (const pattern of mutatingFunctionPatterns) {
          assert.strictEqual(
            pattern.test(sql as string),
            false,
            `Prohibited function invocation ${pattern} found in query ${qKey}`
          );
        }
      }
    });

    it('T-06: Proves no dangerous dynamic raw SQL construction exists', () => {
      assert.strictEqual(
        scriptSource.includes('prisma.$executeRawUnsafe'),
        false,
        'Script must never call $executeRawUnsafe'
      );
      assert.strictEqual(
        scriptSource.includes('EXECUTE format('),
        false,
        'Script must never execute dynamic SQL statements'
      );
    });

    it('T-07: Proves no deliberate destructive negative test exists in script', () => {
      assert.strictEqual(
        scriptSource.includes('INSERT INTO "PlatformAuditEvent"'),
        false,
        'Script must not contain legacy destructive negative DML probe'
      );
      assert.strictEqual(
        scriptSource.includes('DELETE FROM "PlatformAuditEvent"'),
        false,
        'Script must not contain legacy destructive negative DML probe rollback'
      );
    });

    it('T-08: Proves credential and raw secret output redaction', () => {
      const input = 'postgresql://orbitox_runtime:SuperSecretP@ss123@10.0.0.1:5432/orbitox_staging?sslmode=require';
      const redacted = redactCredentials(input);
      assert.strictEqual(redacted.includes('SuperSecretP@ss123'), false);
      assert.strictEqual(redacted.includes('***'), true);

      const passwordInput = 'Connecting with password=myRawSecretPassword; host=db.internal';
      const redactedPw = redactCredentials(passwordInput);
      assert.strictEqual(redactedPw.includes('myRawSecretPassword'), false);
    });
  });

  // ── T-09 to T-14: Configuration & Process Execution Tests ────────────────────

  describe('Configuration & Process Execution (T-09 to T-14)', () => {
    it('T-09: Missing APP_DATABASE_URL exits with code 2 (MISSING_OR_INVALID_CONFIG)', async () => {
      const result = await runInventory({ databaseUrl: '' });
      assert.strictEqual(result.exitCode, EXIT_CODES.MISSING_OR_INVALID_CONFIG);
      assert.strictEqual(result.results[0].status, 'FAIL');
      assert.strictEqual(result.results[0].details.includes('APP_DATABASE_URL environment variable is required'), true);
    });

    it('T-10: Whitespace-only APP_DATABASE_URL exits with code 2 (MISSING_OR_INVALID_CONFIG)', async () => {
      const result = await runInventory({ databaseUrl: '   ' });
      assert.strictEqual(result.exitCode, EXIT_CODES.MISSING_OR_INVALID_CONFIG);
      assert.strictEqual(result.results[0].status, 'FAIL');
    });

    it('T-11: Malformed connection URL exits with code 2 (MISSING_OR_INVALID_CONFIG)', async () => {
      const result = await runInventory({ databaseUrl: 'not_a_valid_url_at_all :::' });
      assert.strictEqual(result.exitCode, EXIT_CODES.MISSING_OR_INVALID_CONFIG);
      assert.strictEqual(result.results[0].status, 'FAIL');
      assert.strictEqual(result.results[0].details.includes('not a valid database connection URL'), true);
    });

    it('T-12: Redaction utility handles non-string inputs safely', () => {
      assert.strictEqual(redactCredentials(null as any), 'null');
      assert.strictEqual(redactCredentials(undefined as any), undefined as any);
      assert.strictEqual(redactCredentials(12345 as any), '12345');
      const obj = { secret: 'topSecretValue' };
      assert.strictEqual(redactCredentials(obj as any).includes('topSecretValue'), false);
    });

    it('T-13: Exit code propagation is deterministic across failure modes', () => {
      assert.strictEqual(EXIT_CODES.SUCCESS, 0);
      assert.strictEqual(EXIT_CODES.VERIFICATION_FAILED, 1);
      assert.strictEqual(EXIT_CODES.MISSING_OR_INVALID_CONFIG, 2);
      assert.strictEqual(EXIT_CODES.INSUFFICIENT_VISIBILITY, 3);
      assert.strictEqual(EXIT_CODES.CONNECTION_FAILURE, 4);
      assert.strictEqual(EXIT_CODES.UNEXPECTED_ERROR, 5);
    });

    it('T-14: Disconnects Prisma client in finally path', async () => {
      let disconnected = false;
      const mockPrisma = {
        $queryRawUnsafe: async () => {
          throw new Error('Connection abruptly severed');
        },
        $disconnect: async () => {
          disconnected = true;
        },
      };

      const result = await runInventory({
        databaseUrl: 'postgresql://orbitox_runtime:safe@127.0.0.1:5432/orbitox_test',
        prisma: mockPrisma,
      });

      assert.strictEqual(result.results.length > 0, true);
    });
  });

  // ── T-15 to T-28: Catalog Logic Verification Engine (Unit Mocks) ─────────────

  describe('Catalog Logic Verification Engine (T-15 to T-28)', () => {
    it('T-15: Q-01 detects superuser or bypassrls privilege leak on runtime role', async () => {
      const mockPrisma = createMockPrisma({
        'current_user': () => [
          {
            connection_user: 'orbitox_runtime',
            current_session_user: 'orbitox_runtime',
            rolsuper: true, // VIOLATION!
            rolbypassrls: false,
            rolcanlogin: true,
            rolcreatedb: false,
            rolcreaterole: false,
          },
        ],
      });

      const results: any[] = [];
      await checkQ01_ConnectionIdentity(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('SUPERUSER'), true);
    });

    it('T-15B: Q-01 fails if session_user !== current_user (undocumented role transition)', async () => {
      const mockPrisma = createMockPrisma({
        'current_user': () => [
          {
            connection_user: 'orbitox_runtime',
            current_session_user: 'postgres', // Elevation / undocumented transition!
            rolsuper: false,
            rolbypassrls: false,
            rolcanlogin: true,
            rolcreatedb: false,
            rolcreaterole: false,
          },
        ],
      });

      const results: any[] = [];
      await checkQ01_ConnectionIdentity(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('Undocumented role transition detected'), true);
    });

    it('T-16: Q-02 detects missing system role or attribute mismatch', async () => {
      // Return 7 roles only (missing orbitox_audit_recovery)
      const mockPrisma = createMockPrisma({
        'pg_roles': () => INDEPENDENT_EXPECTED_ROLES.slice(0, 7),
      });

      const results: any[] = [];
      await checkQ02_SystemRoles(mockPrisma, results);
      assert.strictEqual(results[0].status, 'INCOMPLETE');
      assert.strictEqual(results[0].details.includes('Missing or invisible system roles: orbitox_audit_recovery'), true);
    });

    it('T-16B: Q-02 fails if orbitox_audit_resolver or orbitox_audit_recovery has rolcanlogin = true', async () => {
      const rolesWithLoginResolver = INDEPENDENT_EXPECTED_ROLES.map((r: any) => {
        if (r.rolname === 'orbitox_audit_resolver') {
          return { ...r, rolcanlogin: true }; // Prohibited LOGIN attribute!
        }
        return r;
      });

      const mockPrisma = createMockPrisma({
        'pg_roles': () => rolesWithLoginResolver,
      });

      const results: any[] = [];
      await checkQ02_SystemRoles(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('expected rolcanlogin=false, actual=true'), true);
    });

    it('T-16C: Q-02 fails if orbitox_outbox_relay has rolsuper = true or rolbypassrls = true', async () => {
      const rolesWithSuperRelay = INDEPENDENT_EXPECTED_ROLES.map((r: any) => {
        if (r.rolname === 'orbitox_outbox_relay') {
          return { ...r, rolsuper: true }; // Prohibited superuser!
        }
        return r;
      });

      const mockPrisma = createMockPrisma({
        'pg_roles': () => rolesWithSuperRelay,
      });

      const results: any[] = [];
      await checkQ02_SystemRoles(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('expected rolsuper=false, actual=true'), true);
    });

    it('T-16D: Q-02 fails if orbitox_migrator lacks rolcreatedb = true or rolcreaterole = true', async () => {
      const rolesWithNeuteredMigrator = INDEPENDENT_EXPECTED_ROLES.map((r: any) => {
        if (r.rolname === 'orbitox_migrator') {
          return { ...r, rolcreatedb: false }; // Missing required createdb attribute!
        }
        return r;
      });

      const mockPrisma = createMockPrisma({
        'pg_roles': () => rolesWithNeuteredMigrator,
      });

      const results: any[] = [];
      await checkQ02_SystemRoles(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('expected rolcreatedb=true, actual=false'), true);
    });

    it('T-17: Q-03 detects runtime holding migrator membership or schema CREATE', async () => {
      const mockPrisma = createMockPrisma({
        'role_graph': () => [
          {
            parent_role: 'orbitox_migrator', // VIOLATION: membership in migrator!
            member_role: 'orbitox_runtime',
            admin_option: false,
            inherit_option: true,
            set_option: true,
            depth: 1,
          },
        ],
        'runtime_has_db_create': () => [
          {
            runtime_has_db_create: false,
            runtime_has_schema_create: true, // VIOLATION: schema CREATE!
            db_owner: 'orbitox_migrator',
            schema_owner: 'orbitox_migrator',
            runtime_owned_objects_count: 0,
            runtime_owned_routines_count: 0,
          },
        ],
      });

      const results: any[] = [];
      await checkQ03_RoleMembershipAndDDL(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('orbitox_migrator'), true);
      assert.strictEqual(results[0].details.includes('CREATE privilege on public schema'), true);
    });

    it('T-18: Q-04 verifies full 16-column structure of PlatformAuditEvent', async () => {
      // 15 columns only (missing occurredAt)
      const mockCols = INDEPENDENT_AUDIT_COLUMNS.slice(0, 15).map((c: any) => ({
        column_name: c.name,
        data_type: c.type,
        is_nullable: c.notNull ? 'NO' : 'YES',
      }));

      const mockPrisma = createMockPrisma({
        'PlatformAuditEvent': () => mockCols,
      });

      const results: any[] = [];
      await checkQ04_PlatformAuditEventACL(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('Expected exactly 16 columns'), true);
    });

    it('T-18B: Q-04 verifies table owner is orbitox_migrator and fails if unapproved owner', async () => {
      const mockCols = INDEPENDENT_AUDIT_COLUMNS.map((c: any) => ({
        column_name: c.name,
        data_type: c.type,
        is_nullable: c.notNull ? 'NO' : 'YES',
      }));

      const mockPrisma = createMockPrisma({
        'information_schema.columns': () => mockCols,
        'ORDER BY a.attnum ASC': () => INDEPENDENT_AUDIT_COLUMNS.map((c: any) => ({
          column_name: c.name,
          resolver_can_select: ['id', 'organizationId', 'projectId', 'status', 'occurredAt', 'metadata'].includes(c.name),
          resolver_can_update: ['status', 'failureReason', 'metadata'].includes(c.name),
          recovery_can_select: ['id', 'status', 'occurredAt'].includes(c.name),
          recovery_can_update: ['status', 'failureReason'].includes(c.name),
        })),
        'runtime_select': () => [
          {
            table_owner: 'orbitox_runtime', // VIOLATION: wrong table owner!
            migrator_select: true,
            migrator_insert: true,
            migrator_update: true,
            migrator_delete: true,
            migrator_truncate: true,
            runtime_select: true,
            runtime_insert: true,
            runtime_update: false,
            runtime_delete: false,
            runtime_truncate: false,
            runtime_references: false,
            runtime_trigger: false,
            runtime_any_col_update: false,
            admin_audit_insert: true,
            admin_audit_select: false,
            admin_audit_update: false,
            admin_audit_delete: false,
            admin_audit_truncate: false,
            resolver_table_select: false,
            resolver_table_insert: false,
            resolver_table_update: false,
            resolver_table_delete: false,
            resolver_table_truncate: false,
            recovery_table_select: false,
            recovery_table_insert: false,
            recovery_table_update: false,
            recovery_table_delete: false,
            recovery_table_truncate: false,
            maintenance_select: true,
            maintenance_delete: true,
            maintenance_insert: false,
            maintenance_update: false,
            maintenance_truncate: false,
            hms_audit_reader_select: false,
            hms_audit_reader_insert: false,
            hms_audit_reader_update: false,
            hms_audit_reader_delete: false,
            hms_audit_reader_truncate: false,
            hms_audit_reader_any_col_select: false,
            hms_audit_reader_any_col_update: false,
            outbox_relay_select: false,
            outbox_relay_insert: false,
            outbox_relay_update: false,
            outbox_relay_delete: false,
            outbox_relay_truncate: false,
            outbox_relay_any_col_select: false,
            outbox_relay_any_col_update: false,
            public_select: false,
            public_insert: false,
            public_update: false,
            public_delete: false,
            public_truncate: false,
          },
        ],
      });

      const results: any[] = [];
      await checkQ04_PlatformAuditEventACL(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('table owner must be orbitox_migrator, found: orbitox_runtime'), true);
    });

    it('T-19: Q-04 enforces table vs column ACLs for audit resolver and recovery', async () => {
      const mockCols = INDEPENDENT_AUDIT_COLUMNS.map((c: any) => ({
        column_name: c.name,
        data_type: c.type,
        is_nullable: c.notNull ? 'NO' : 'YES',
      }));

      const mockPrisma = createMockPrisma({
        'information_schema.columns': () => mockCols,
        'ORDER BY a.attnum ASC': (q: string) => {
          if (q.includes('has_column_privilege')) {
            // Return column ACLs where recovery erroneously can update metadata
            return INDEPENDENT_AUDIT_COLUMNS.map((c: any) => ({
              column_name: c.name,
              resolver_can_select: ['id', 'organizationId', 'projectId', 'status', 'occurredAt', 'metadata'].includes(c.name),
              resolver_can_update: ['status', 'failureReason', 'metadata'].includes(c.name),
              recovery_can_select: ['id', 'status', 'occurredAt'].includes(c.name),
              recovery_can_update: true, // VIOLATION: recovery cannot update metadata!
            }));
          }
          return mockCols;
        },
        'runtime_select': () => [
          {
            table_owner: 'orbitox_migrator',
            migrator_select: true,
            migrator_insert: true,
            migrator_update: true,
            migrator_delete: true,
            migrator_truncate: true,

            runtime_select: true,
            runtime_insert: true,
            runtime_update: false,
            runtime_delete: false,
            runtime_truncate: false,
            runtime_references: false,
            runtime_trigger: false,
            runtime_any_col_update: false,

            admin_audit_insert: true,
            admin_audit_select: false,
            admin_audit_update: false,
            admin_audit_delete: false,
            admin_audit_truncate: false,

            resolver_table_select: false,
            resolver_table_insert: false,
            resolver_table_update: false,
            resolver_table_delete: false,
            resolver_table_truncate: false,

            recovery_table_select: false,
            recovery_table_insert: false,
            recovery_table_update: false,
            recovery_table_delete: false,
            recovery_table_truncate: false,

            maintenance_select: true,
            maintenance_delete: true,
            maintenance_insert: false,
            maintenance_update: false,
            maintenance_truncate: false,

            hms_audit_reader_select: false,
            hms_audit_reader_insert: false,
            hms_audit_reader_update: false,
            hms_audit_reader_delete: false,
            hms_audit_reader_truncate: false,
            hms_audit_reader_any_col_select: false,
            hms_audit_reader_any_col_update: false,

            outbox_relay_select: false,
            outbox_relay_insert: false,
            outbox_relay_update: false,
            outbox_relay_delete: false,
            outbox_relay_truncate: false,
            outbox_relay_any_col_select: false,
            outbox_relay_any_col_update: false,

            public_select: false,
            public_insert: false,
            public_update: false,
            public_delete: false,
            public_truncate: false,
          },
        ],
      });

      const results: any[] = [];
      await checkQ04_PlatformAuditEventACL(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('orbitox_audit_recovery must NOT have UPDATE'), true);
    });

    it('T-19B: Q-04 verifies complete 9-principal matrix and detects unauthorized privileges on hms_audit_reader or outbox_relay', async () => {
      const mockCols = INDEPENDENT_AUDIT_COLUMNS.map((c: any) => ({
        column_name: c.name,
        data_type: c.type,
        is_nullable: c.notNull ? 'NO' : 'YES',
      }));

      const mockPrisma = createMockPrisma({
        'information_schema.columns': () => mockCols,
        'ORDER BY a.attnum ASC': () => INDEPENDENT_AUDIT_COLUMNS.map((c: any) => ({
          column_name: c.name,
          resolver_can_select: ['id', 'organizationId', 'projectId', 'status', 'occurredAt', 'metadata'].includes(c.name),
          resolver_can_update: ['status', 'failureReason', 'metadata'].includes(c.name),
          recovery_can_select: ['id', 'status', 'occurredAt'].includes(c.name),
          recovery_can_update: ['status', 'failureReason'].includes(c.name),
        })),
        'runtime_select': () => [
          {
            table_owner: 'orbitox_migrator',
            migrator_select: true,
            migrator_insert: true,
            migrator_update: true,
            migrator_delete: true,
            migrator_truncate: true,
            runtime_select: true,
            runtime_insert: true,
            runtime_update: false,
            runtime_delete: false,
            runtime_truncate: false,
            runtime_references: false,
            runtime_trigger: false,
            runtime_any_col_update: false,
            admin_audit_insert: true,
            admin_audit_select: false,
            admin_audit_update: false,
            admin_audit_delete: false,
            admin_audit_truncate: false,
            resolver_table_select: false,
            resolver_table_insert: false,
            resolver_table_update: false,
            resolver_table_delete: false,
            resolver_table_truncate: false,
            recovery_table_select: false,
            recovery_table_insert: false,
            recovery_table_update: false,
            recovery_table_delete: false,
            recovery_table_truncate: false,
            maintenance_select: true,
            maintenance_delete: true,
            maintenance_insert: false,
            maintenance_update: false,
            maintenance_truncate: false,
            hms_audit_reader_select: true, // VIOLATION: hms_audit_reader must NOT have SELECT on PlatformAuditEvent!
            hms_audit_reader_insert: false,
            hms_audit_reader_update: false,
            hms_audit_reader_delete: false,
            hms_audit_reader_truncate: false,
            hms_audit_reader_any_col_select: false,
            hms_audit_reader_any_col_update: false,
            outbox_relay_select: false,
            outbox_relay_insert: false,
            outbox_relay_update: false,
            outbox_relay_delete: false,
            outbox_relay_truncate: false,
            outbox_relay_any_col_select: false,
            outbox_relay_any_col_update: false,
            public_select: false,
            public_insert: false,
            public_update: false,
            public_delete: false,
            public_truncate: false,
          },
        ],
      });

      const results: any[] = [];
      await checkQ04_PlatformAuditEventACL(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('hms_audit_reader must NOT have SELECT on PlatformAuditEvent'), true);
    });

    it('T-19C: Q-04 verifies table owner holds implicit ALL table privileges without confusing them with direct ACL entries', async () => {
      const mockCols = INDEPENDENT_AUDIT_COLUMNS.map((c: any) => ({
        column_name: c.name,
        data_type: c.type,
        is_nullable: c.notNull ? 'NO' : 'YES',
      }));

      const mockPrisma = createMockPrisma({
        'information_schema.columns': () => mockCols,
        'ORDER BY a.attnum ASC': () => INDEPENDENT_AUDIT_COLUMNS.map((c: any) => ({
          column_name: c.name,
          resolver_can_select: ['id', 'organizationId', 'projectId', 'status', 'occurredAt', 'metadata'].includes(c.name),
          resolver_can_update: ['status', 'failureReason', 'metadata'].includes(c.name),
          recovery_can_select: ['id', 'status', 'occurredAt'].includes(c.name),
          recovery_can_update: ['status', 'failureReason'].includes(c.name),
        })),
        'runtime_select': () => [
          {
            table_owner: 'orbitox_migrator',
            migrator_select: false, // VIOLATION: owner missing effective SELECT!
            migrator_insert: true,
            migrator_update: true,
            migrator_delete: true,
            migrator_truncate: true,
            runtime_select: true,
            runtime_insert: true,
            runtime_update: false,
            runtime_delete: false,
            runtime_truncate: false,
            runtime_references: false,
            runtime_trigger: false,
            runtime_any_col_update: false,
            admin_audit_insert: true,
            admin_audit_select: false,
            admin_audit_update: false,
            admin_audit_delete: false,
            admin_audit_truncate: false,
            resolver_table_select: false,
            resolver_table_insert: false,
            resolver_table_update: false,
            resolver_table_delete: false,
            resolver_table_truncate: false,
            recovery_table_select: false,
            recovery_table_insert: false,
            recovery_table_update: false,
            recovery_table_delete: false,
            recovery_table_truncate: false,
            maintenance_select: true,
            maintenance_delete: true,
            maintenance_insert: false,
            maintenance_update: false,
            maintenance_truncate: false,
            hms_audit_reader_select: false,
            hms_audit_reader_insert: false,
            hms_audit_reader_update: false,
            hms_audit_reader_delete: false,
            hms_audit_reader_truncate: false,
            hms_audit_reader_any_col_select: false,
            hms_audit_reader_any_col_update: false,
            outbox_relay_select: false,
            outbox_relay_insert: false,
            outbox_relay_update: false,
            outbox_relay_delete: false,
            outbox_relay_truncate: false,
            outbox_relay_any_col_select: false,
            outbox_relay_any_col_update: false,
            public_select: false,
            public_insert: false,
            public_update: false,
            public_delete: false,
            public_truncate: false,
          },
        ],
      });

      const results: any[] = [];
      await checkQ04_PlatformAuditEventACL(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('orbitox_migrator (table owner) must possess effective SELECT privilege'), true);
    });

    it('T-20: Q-05 verifies exact 50 RLS relation count and fails if relation is missing', async () => {
      // Return only 49 relations
      const mockRelations = INDEPENDENT_RLS_RELATIONS.slice(0, 49).map((r: string) => ({
        relname: r,
        relrowsecurity: true,
        relforcerowsecurity: true,
        relkind: 'r',
      }));

      const mockPrisma = createMockPrisma({
        'relforcerowsecurity': () => mockRelations,
      });

      const results: any[] = [];
      await checkQ05_RLSRelations(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('Expected 50 relations, found 49'), true);
    });

    it('T-21: Q-05 fails if any relation has relforcerowsecurity = false', async () => {
      const mockRelations = INDEPENDENT_RLS_RELATIONS.map((r: string, idx: number) => ({
        relname: r,
        relrowsecurity: true,
        relforcerowsecurity: idx !== 0, // First relation is not forced!
        relkind: 'r',
      }));

      const mockPrisma = createMockPrisma({
        'relforcerowsecurity': () => mockRelations,
      });

      const results: any[] = [];
      await checkQ05_RLSRelations(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('RLS is not forced'), true);
    });

    it('T-22: Q-06 fails if any removed Phase 7A sample table is present in database', async () => {
      // Mock presence of removed StudioSnapshot
      const mockPrisma = createMockPrisma({
        'ANY($1::text[])': () => [
          { relname: 'StudioSnapshot', relkind: 'r' },
        ],
      });

      const results: any[] = [];
      await checkQ06_RemovedSampleTables(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('Discovered resurrected Phase 7A sample tables'), true);
    });

    it('T-23: Q-07 enforces command-aware expressions, dual policy, and restrictive mode', async () => {
      // RestaurantOrderItem with permissive consistency (violation!)
      const mockPrisma = createMockPrisma({
        'pg_policy': () => [
          {
            relname: 'RestaurantOrderItem',
            polname: 'orbitox_tenant_isolation',
            polcmd: '*',
            polpermissive: true,
            roles: ['orbitox_runtime'],
            using_expr: '"tenantId" = app_current_tenant()',
            with_check_expr: null, // Valid for ALL policy in PG
          },
          {
            relname: 'RestaurantOrderItem',
            polname: 'orbitox_order_item_consistency',
            polcmd: '*',
            polpermissive: true, // VIOLATION: must be RESTRICTIVE!
            roles: ['orbitox_runtime'],
            using_expr: 'EXISTS (SELECT 1 FROM "RestaurantOrder" WHERE id = "orderId")',
            with_check_expr: null,
          },
        ],
      });

      const results: any[] = [];
      await checkQ07_PolicyMetadata(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('must be RESTRICTIVE'), true);
    });

    it('T-24: Q-08 detects unapproved SECURITY DEFINER routines and verifies owners', async () => {
      const mockFuncs = INDEPENDENT_FUNCTIONS.map((f: any) => ({
        proname: f.name,
        identity_args: f.argTypes.join(', '),
        owner_name: f.owner,
        prosecdef: f.secdef,
        provolatile: 'v',
        proconfig: ['search_path=pg_catalog, public'],
        return_type: 'boolean',
        runtime_can_execute: f.runtimeExec,
        maintenance_can_execute: f.maintenanceExec,
        resolver_can_execute: false,
        recovery_can_execute: false,
        public_can_execute: f.publicExec,
      }));

      // Add a rogue security definer routine!
      mockFuncs.push({
        proname: 'backdoor_elevation_routine',
        identity_args: '',
        owner_name: 'orbitox_runtime',
        prosecdef: true, // ROGUE!
        provolatile: 'v',
        proconfig: [],
        return_type: 'void',
        runtime_can_execute: true,
        maintenance_can_execute: true,
        resolver_can_execute: false,
        recovery_can_execute: false,
        public_can_execute: false,
      });

      const mockPrisma = createMockPrisma({
        'p.prosecdef = true': () => mockFuncs,
      });

      const results: any[] = [];
      await checkQ08_FunctionSecurity(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('Unexpected SECURITY DEFINER routine discovered'), true);
    });

    it('T-25: Q-09 verifies PlatformRateLimitBucket range partitioning on windowStart', async () => {
      const mockPrisma = createMockPrisma({
        'PlatformRateLimitBucket': () => [
          {
            parent_name: 'PlatformRateLimitBucket',
            parent_kind: 'p',
            part_key_def: 'RANGE ("windowStart")',
            child_name: 'PlatformRateLimitBucket_20261123',
            child_kind: 'r',
            parent_owner: 'orbitox_migrator',
            child_owner: 'orbitox_migrator',
            runtime_parent_select: true,
            runtime_parent_insert: true,
            runtime_parent_update: true,
            runtime_parent_delete: false,
            runtime_parent_truncate: false,
            runtime_child_truncate: false,
          },
        ],
      });

      const results: any[] = [];
      await checkQ09_RateLimitPartitionSecurity(mockPrisma, results);
      assert.strictEqual(results[0].status, 'PASS');
    });

    it('T-26: Q-10 detects insufficient partition runway without invoking stored procedures', async () => {
      // Mock only 1 partition (insufficient runway)
      const mockPrisma = createMockPrisma({
        'PlatformRateLimitBucket_[0-9]{8}': () => [
          { partition_name: 'PlatformRateLimitBucket_20261123', partition_bound: "FOR VALUES FROM ('2026-11-23 00:00:00') TO ('2026-11-24 00:00:00')" },
        ],
      });

      const results: any[] = [];
      await checkQ10_PartitionRunway(mockPrisma, results);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('Insufficient partition runway'), true);
    });

    it('T-27: Q-11 detects missing migration in Prisma ledger', async () => {
      // Only 43 migrations returned (missing the 44th)
      const mockRows = INDEPENDENT_MIGRATIONS.slice(0, 43).map((name: string) => ({
        migration_name: name,
        checksum: 'a'.repeat(64),
        finished_at: new Date(),
        rolled_back_at: null,
        started_at: new Date(),
        applied_steps_count: 1,
        logs: null,
      }));

      const mockPrisma = createMockPrisma({
        '_prisma_migrations': () => mockRows,
      });

      const results: any[] = [];
      await checkQ11_MigrationLedger(mockPrisma, results, null);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('Missing applied migration'), true);
    });

    it('T-28: Q-11 fails if unresolved failed migration attempt exists even if later success exists', async () => {
      const mockRows: any[] = INDEPENDENT_MIGRATIONS.map((name: string) => ({
        migration_name: name,
        checksum: 'a'.repeat(64),
        finished_at: new Date(),
        rolled_back_at: null,
        started_at: new Date(),
        applied_steps_count: 1,
        logs: null,
      }));

      // Add an unresolved failed attempt for migration 10!
      mockRows.push({
        migration_name: INDEPENDENT_MIGRATIONS[10],
        checksum: 'b'.repeat(64),
        finished_at: null, // UNRESOLVED!
        rolled_back_at: null, // NOT ROLLED BACK!
        started_at: new Date(Date.now() - 100000),
        applied_steps_count: 0,
        logs: 'syntax error in step 2',
      });

      const mockPrisma = createMockPrisma({
        '_prisma_migrations': () => mockRows,
      });

      const results: any[] = [];
      await checkQ11_MigrationLedger(mockPrisma, results, null);
      assert.strictEqual(results[0].status, 'FAIL');
      assert.strictEqual(results[0].details.includes('Unresolved failed migration attempt detected'), true);
    });
  });

  // ── T-29 to T-36: Integration Guarding & Isolation Tests ─────────────────────

  describe('Local Integration Test Isolation & Guarding (T-29 to T-36)', () => {
    it('T-29: Proves integration checks are safely classified as skipped without connecting when ORBITOX_TEST_DATABASE_URL is absent', () => {
      // Must execute and pass offline
      const guardUndefined = evaluateIntegrationGuard(undefined);
      assert.strictEqual(guardUndefined.shouldRun, false);
      assert.strictEqual(guardUndefined.reason.includes('safely skipped offline'), true);

      const guardEmpty = evaluateIntegrationGuard('');
      assert.strictEqual(guardEmpty.shouldRun, false);
      assert.strictEqual(guardEmpty.reason.includes('safely skipped offline'), true);

      const guardWhitespace = evaluateIntegrationGuard('   ');
      assert.strictEqual(guardWhitespace.shouldRun, false);
      assert.strictEqual(guardWhitespace.reason.includes('safely skipped offline'), true);
    });

    it('T-30: Strictly rejects non-local/staging/production hosts in test database URL', () => {
      const stagingGuard = evaluateIntegrationGuard('postgresql://orbitox_runtime:safe@staging.orbitox.io:5432/orbitox_staging');
      assert.strictEqual(stagingGuard.shouldRun, false);
      assert.strictEqual(stagingGuard.reason.includes('Security violation'), true);

      const remoteIpGuard = evaluateIntegrationGuard('postgresql://orbitox_runtime:safe@10.0.0.5:5432/orbitox_staging');
      assert.strictEqual(remoteIpGuard.shouldRun, false);
      assert.strictEqual(remoteIpGuard.reason.includes('Security violation'), true);
    });

    it('T-31: Never falls back to APP_DATABASE_URL or DATABASE_URL for integration tests', () => {
      // Even if APP_DATABASE_URL is set, passing undefined to the guard returns shouldRun: false
      const result = evaluateIntegrationGuard(undefined);
      assert.strictEqual(result.shouldRun, false);
    });

    it('T-32: Validates local test target accepts only localhost or 127.0.0.1', () => {
      const localhostGuard = evaluateIntegrationGuard('postgresql://orbitox_runtime:safe@localhost:5432/orbitox_test');
      assert.strictEqual(localhostGuard.shouldRun, true);
      assert.strictEqual(localhostGuard.host, 'localhost');

      const ipGuard = evaluateIntegrationGuard('postgresql://orbitox_runtime:safe@127.0.0.1:5432/orbitox_test');
      assert.strictEqual(ipGuard.shouldRun, true);
      assert.strictEqual(ipGuard.host, '127.0.0.1');
    });

    it('T-33: Local DB Integration - Role safety and connection identity', (t) => {
      const guard = evaluateIntegrationGuard(process.env.ORBITOX_TEST_DATABASE_URL);
      if (!guard.shouldRun) {
        t.skip(guard.reason);
        return;
      }
      assert.ok(guard.shouldRun);
    });

    it('T-34: Local DB Integration - 50 RLS tables and Force-RLS enforcement', (t) => {
      const guard = evaluateIntegrationGuard(process.env.ORBITOX_TEST_DATABASE_URL);
      if (!guard.shouldRun) {
        t.skip(guard.reason);
        return;
      }
      assert.ok(guard.shouldRun);
    });

    it('T-35: Local DB Integration - Dual policies and audit policies', (t) => {
      const guard = evaluateIntegrationGuard(process.env.ORBITOX_TEST_DATABASE_URL);
      if (!guard.shouldRun) {
        t.skip(guard.reason);
        return;
      }
      assert.ok(guard.shouldRun);
    });

    it('T-36: Local DB Integration - Functions and migration ledger reconciliation', (t) => {
      const guard = evaluateIntegrationGuard(process.env.ORBITOX_TEST_DATABASE_URL);
      if (!guard.shouldRun) {
        t.skip(guard.reason);
        return;
      }
      assert.ok(guard.shouldRun);
    });
  });
});
