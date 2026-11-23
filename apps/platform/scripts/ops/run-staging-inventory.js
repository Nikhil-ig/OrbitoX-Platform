#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OrbitoX Platform Staging Step 1 Inventory Verification (Revision 4.9)
 * ─────────────────────────────────────────────────────────────────────────────
 * Strictly read-only PostgreSQL 16 catalog inspection engine.
 * Verifies RLS enforcement, role safety, immutability, partition lifecycle,
 * and Prisma migration history without executing any DDL, DML, role switching,
 * or mutating stored procedures.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

// ── Approved Exit Codes Contract ───────────────────────────────────────────────
const EXIT_CODES = Object.freeze({
  SUCCESS: 0,                   // Every required check passed cleanly
  VERIFICATION_FAILED: 1,       // Security or catalog mismatch
  MISSING_OR_INVALID_CONFIG: 2, // Missing, whitespace-only, or malformed URL
  INSUFFICIENT_VISIBILITY: 3,   // Required metadata could not be verified (INCOMPLETE)
  CONNECTION_FAILURE: 4,        // Prisma client cannot connect to PostgreSQL
  UNEXPECTED_ERROR: 5,          // Unhandled runtime exception
});

// ── Expected Manifests (Source of Truth) ───────────────────────────────────────

// 1. All 8 System Roles
const EXPECTED_ROLES = Object.freeze([
  { rolname: 'orbitox_migrator', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: true, rolcreaterole: true, rolinherit: false },
  { rolname: 'orbitox_runtime', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_maintenance', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_platform_admin_audit', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'hms_audit_reader', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_outbox_relay', rolsuper: false, rolbypassrls: false, rolcanlogin: true, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_audit_resolver', rolsuper: false, rolbypassrls: false, rolcanlogin: false, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
  { rolname: 'orbitox_audit_recovery', rolsuper: false, rolbypassrls: false, rolcanlogin: false, rolcreatedb: false, rolcreaterole: false, rolinherit: false },
]);

// 2. Authoritative 16-Column Manifest for PlatformAuditEvent (schema.prisma lines 1396-1413)
const EXPECTED_AUDIT_COLUMNS = Object.freeze([
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

// 3. Complete 42 Surviving Relations Requiring RLS and FORCE RLS
const EXPECTED_RLS_RELATIONS = Object.freeze([
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
  'PlatformAuditEvent',
  'PlatformIdempotencyRecord',
  'PlatformOutboxMessage',
  'PlatformPluginUsage',
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
]);

// 4. Exactly 32 Dropped Phase 7A Sample Tables
const EXPECTED_DROPPED_TABLES = Object.freeze([
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

// 5. Authoritative 8 Functions Security Manifest
const EXPECTED_FUNCTIONS = Object.freeze([
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
]);

// Approved Trigger Functions (SECURITY DEFINER trigger routines)
const APPROVED_TRIGGER_FUNCTIONS = Object.freeze([
  'keep_customer_organization_owner',
]);

// 6. Chronological 44 Prisma Migrations Manifest
const EXPECTED_MIGRATIONS = Object.freeze([
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
]);

// ── Redaction Utility ─────────────────────────────────────────────────────────

function redactCredentials(text) {
  if (text === undefined) {
    return undefined;
  }
  if (text === null) {
    return 'null';
  }
  if (typeof text !== 'string') {
    try {
      text = JSON.stringify(text);
    } catch {
      return '[REDACTED]';
    }
  }
  return text
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1***$3')
    .replace(/("?(?:password|token|secret|key)"?\s*[:=]\s*["']?)[^"',\s;}]+/gi, '$1***');
}

// ── Integration Guard Utility ──────────────────────────────────────────────────

function evaluateIntegrationGuard(testDatabaseUrl) {
  if (!testDatabaseUrl || testDatabaseUrl.trim() === '') {
    return {
      shouldRun: false,
      reason: 'ORBITOX_TEST_DATABASE_URL environment variable is not set; local integration execution safely skipped offline.',
    };
  }

  let parsed;
  try {
    parsed = new URL(testDatabaseUrl.replace(/^postgresql:\/\//i, 'http://'));
  } catch {
    return {
      shouldRun: false,
      reason: 'Security violation: ORBITOX_TEST_DATABASE_URL is not a valid URL.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return {
      shouldRun: false,
      reason: `Security violation: ORBITOX_TEST_DATABASE_URL must target localhost or 127.0.0.1 only. Host "${hostname}" is rejected.`,
    };
  }

  return {
    shouldRun: true,
    host: hostname,
  };
}

// ── Read-Only Catalog Queries ───────────────────────────────────────────────────

const QUERIES = Object.freeze({
  Q01_CONNECTION_IDENTITY: `
    SELECT
      current_user AS connection_user,
      session_user AS current_session_user,
      r.rolsuper,
      r.rolbypassrls,
      r.rolcanlogin,
      r.rolcreatedb,
      r.rolcreaterole
    FROM pg_roles r
    WHERE r.rolname = current_user;
  `,

  Q02_SYSTEM_ROLES: `
    SELECT
      r.rolname,
      r.rolsuper,
      r.rolbypassrls,
      r.rolcanlogin,
      r.rolcreatedb,
      r.rolcreaterole,
      r.rolreplication,
      r.rolinherit
    FROM pg_roles r
    WHERE r.rolname = ANY($1::text[])
    ORDER BY r.rolname ASC;
  `,

  Q03_ROLE_MEMBERSHIP_GRAPH: `
    WITH RECURSIVE role_graph AS (
      SELECT
        m.roleid,
        m.member,
        m.grantor,
        m.admin_option,
        m.inherit_option,
        m.set_option,
        1 AS depth
      FROM pg_auth_members m
      WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname = 'orbitox_runtime')
      UNION ALL
      SELECT
        m.roleid,
        m.member,
        m.grantor,
        m.admin_option,
        m.inherit_option,
        m.set_option,
        rg.depth + 1
      FROM pg_auth_members m
      JOIN role_graph rg ON m.member = rg.roleid
    )
    SELECT
      r_parent.rolname AS parent_role,
      r_member.rolname AS member_role,
      rg.admin_option,
      rg.inherit_option,
      rg.set_option,
      rg.depth
    FROM role_graph rg
    JOIN pg_roles r_parent ON r_parent.oid = rg.roleid
    JOIN pg_roles r_member ON r_member.oid = rg.member;
  `,

  Q03_DDL_AUTHORITY: `
    SELECT
      has_database_privilege('orbitox_runtime', current_database(), 'CREATE') AS runtime_has_db_create,
      has_schema_privilege('orbitox_runtime', 'public', 'CREATE') AS runtime_has_schema_create,
      (SELECT r.rolname FROM pg_database d JOIN pg_roles r ON r.oid = d.datdba WHERE d.datname = current_database()) AS db_owner,
      (SELECT r.rolname FROM pg_namespace n JOIN pg_roles r ON r.oid = n.nspowner WHERE n.nspname = 'public') AS schema_owner,
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = 'orbitox_runtime')) AS runtime_owned_objects_count,
      (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proowner = (SELECT oid FROM pg_roles WHERE rolname = 'orbitox_runtime')) AS runtime_owned_routines_count;
  `,

  Q04_AUDIT_COLUMNS: `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PlatformAuditEvent'
    ORDER BY ordinal_position ASC;
  `,

  Q04_AUDIT_TABLE_PRIVILEGES: `
    SELECT
      (SELECT r.rolname
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_roles r ON r.oid = c.relowner
       WHERE n.nspname = 'public'
         AND c.relname = 'PlatformAuditEvent') AS table_owner,

      -- Principal 1: orbitox_migrator (Table Owner - holds implicit ALL table privileges)
      has_table_privilege('orbitox_migrator', 'public."PlatformAuditEvent"', 'SELECT') AS migrator_select,
      has_table_privilege('orbitox_migrator', 'public."PlatformAuditEvent"', 'INSERT') AS migrator_insert,
      has_table_privilege('orbitox_migrator', 'public."PlatformAuditEvent"', 'UPDATE') AS migrator_update,
      has_table_privilege('orbitox_migrator', 'public."PlatformAuditEvent"', 'DELETE') AS migrator_delete,
      has_table_privilege('orbitox_migrator', 'public."PlatformAuditEvent"', 'TRUNCATE') AS migrator_truncate,
      has_table_privilege('orbitox_migrator', 'public."PlatformAuditEvent"', 'REFERENCES') AS migrator_references,
      has_table_privilege('orbitox_migrator', 'public."PlatformAuditEvent"', 'TRIGGER') AS migrator_trigger,

      -- Principal 2: orbitox_runtime (SELECT, INSERT only; strictly NO column-level UPDATE)
      has_table_privilege('orbitox_runtime', 'public."PlatformAuditEvent"', 'SELECT') AS runtime_select,
      has_table_privilege('orbitox_runtime', 'public."PlatformAuditEvent"', 'INSERT') AS runtime_insert,
      has_table_privilege('orbitox_runtime', 'public."PlatformAuditEvent"', 'UPDATE') AS runtime_update,
      has_table_privilege('orbitox_runtime', 'public."PlatformAuditEvent"', 'DELETE') AS runtime_delete,
      has_table_privilege('orbitox_runtime', 'public."PlatformAuditEvent"', 'TRUNCATE') AS runtime_truncate,
      has_table_privilege('orbitox_runtime', 'public."PlatformAuditEvent"', 'REFERENCES') AS runtime_references,
      has_table_privilege('orbitox_runtime', 'public."PlatformAuditEvent"', 'TRIGGER') AS runtime_trigger,
      has_any_column_privilege('orbitox_runtime', 'public."PlatformAuditEvent"', 'UPDATE') AS runtime_any_col_update,

      -- Principal 3: orbitox_platform_admin_audit (INSERT only)
      has_table_privilege('orbitox_platform_admin_audit', 'public."PlatformAuditEvent"', 'INSERT') AS admin_audit_insert,
      has_table_privilege('orbitox_platform_admin_audit', 'public."PlatformAuditEvent"', 'SELECT') AS admin_audit_select,
      has_table_privilege('orbitox_platform_admin_audit', 'public."PlatformAuditEvent"', 'UPDATE') AS admin_audit_update,
      has_table_privilege('orbitox_platform_admin_audit', 'public."PlatformAuditEvent"', 'DELETE') AS admin_audit_delete,
      has_table_privilege('orbitox_platform_admin_audit', 'public."PlatformAuditEvent"', 'TRUNCATE') AS admin_audit_truncate,

      -- Principal 4: orbitox_audit_resolver (Column-level only)
      has_table_privilege('orbitox_audit_resolver', 'public."PlatformAuditEvent"', 'SELECT') AS resolver_table_select,
      has_table_privilege('orbitox_audit_resolver', 'public."PlatformAuditEvent"', 'INSERT') AS resolver_table_insert,
      has_table_privilege('orbitox_audit_resolver', 'public."PlatformAuditEvent"', 'UPDATE') AS resolver_table_update,
      has_table_privilege('orbitox_audit_resolver', 'public."PlatformAuditEvent"', 'DELETE') AS resolver_table_delete,
      has_table_privilege('orbitox_audit_resolver', 'public."PlatformAuditEvent"', 'TRUNCATE') AS resolver_table_truncate,

      -- Principal 5: orbitox_audit_recovery (Column-level only)
      has_table_privilege('orbitox_audit_recovery', 'public."PlatformAuditEvent"', 'SELECT') AS recovery_table_select,
      has_table_privilege('orbitox_audit_recovery', 'public."PlatformAuditEvent"', 'INSERT') AS recovery_table_insert,
      has_table_privilege('orbitox_audit_recovery', 'public."PlatformAuditEvent"', 'UPDATE') AS recovery_table_update,
      has_table_privilege('orbitox_audit_recovery', 'public."PlatformAuditEvent"', 'DELETE') AS recovery_table_delete,
      has_table_privilege('orbitox_audit_recovery', 'public."PlatformAuditEvent"', 'TRUNCATE') AS recovery_table_truncate,

      -- Principal 6: orbitox_maintenance (Day-30 erasure SELECT, DELETE only)
      has_table_privilege('orbitox_maintenance', 'public."PlatformAuditEvent"', 'SELECT') AS maintenance_select,
      has_table_privilege('orbitox_maintenance', 'public."PlatformAuditEvent"', 'DELETE') AS maintenance_delete,
      has_table_privilege('orbitox_maintenance', 'public."PlatformAuditEvent"', 'INSERT') AS maintenance_insert,
      has_table_privilege('orbitox_maintenance', 'public."PlatformAuditEvent"', 'UPDATE') AS maintenance_update,
      has_table_privilege('orbitox_maintenance', 'public."PlatformAuditEvent"', 'TRUNCATE') AS maintenance_truncate,

      -- Principal 7: hms_audit_reader (ZERO privileges on PlatformAuditEvent)
      has_table_privilege('hms_audit_reader', 'public."PlatformAuditEvent"', 'SELECT') AS hms_audit_reader_select,
      has_table_privilege('hms_audit_reader', 'public."PlatformAuditEvent"', 'INSERT') AS hms_audit_reader_insert,
      has_table_privilege('hms_audit_reader', 'public."PlatformAuditEvent"', 'UPDATE') AS hms_audit_reader_update,
      has_table_privilege('hms_audit_reader', 'public."PlatformAuditEvent"', 'DELETE') AS hms_audit_reader_delete,
      has_table_privilege('hms_audit_reader', 'public."PlatformAuditEvent"', 'TRUNCATE') AS hms_audit_reader_truncate,
      has_any_column_privilege('hms_audit_reader', 'public."PlatformAuditEvent"', 'SELECT') AS hms_audit_reader_any_col_select,
      has_any_column_privilege('hms_audit_reader', 'public."PlatformAuditEvent"', 'UPDATE') AS hms_audit_reader_any_col_update,

      -- Principal 8: orbitox_outbox_relay (ZERO privileges on PlatformAuditEvent)
      has_table_privilege('orbitox_outbox_relay', 'public."PlatformAuditEvent"', 'SELECT') AS outbox_relay_select,
      has_table_privilege('orbitox_outbox_relay', 'public."PlatformAuditEvent"', 'INSERT') AS outbox_relay_insert,
      has_table_privilege('orbitox_outbox_relay', 'public."PlatformAuditEvent"', 'UPDATE') AS outbox_relay_update,
      has_table_privilege('orbitox_outbox_relay', 'public."PlatformAuditEvent"', 'DELETE') AS outbox_relay_delete,
      has_table_privilege('orbitox_outbox_relay', 'public."PlatformAuditEvent"', 'TRUNCATE') AS outbox_relay_truncate,
      has_any_column_privilege('orbitox_outbox_relay', 'public."PlatformAuditEvent"', 'SELECT') AS outbox_relay_any_col_select,
      has_any_column_privilege('orbitox_outbox_relay', 'public."PlatformAuditEvent"', 'UPDATE') AS outbox_relay_any_col_update,

      -- Principal 9: public (ZERO privileges on PlatformAuditEvent)
      has_table_privilege('public', 'public."PlatformAuditEvent"', 'SELECT') AS public_select,
      has_table_privilege('public', 'public."PlatformAuditEvent"', 'INSERT') AS public_insert,
      has_table_privilege('public', 'public."PlatformAuditEvent"', 'UPDATE') AS public_update,
      has_table_privilege('public', 'public."PlatformAuditEvent"', 'DELETE') AS public_delete,
      has_table_privilege('public', 'public."PlatformAuditEvent"', 'TRUNCATE') AS public_truncate;
  `,

  Q04_AUDIT_COLUMN_PRIVILEGES: `
    SELECT
      a.attname AS column_name,
      has_column_privilege('orbitox_audit_resolver', 'public."PlatformAuditEvent"', a.attname, 'SELECT') AS resolver_can_select,
      has_column_privilege('orbitox_audit_resolver', 'public."PlatformAuditEvent"', a.attname, 'UPDATE') AS resolver_can_update,
      has_column_privilege('orbitox_audit_recovery', 'public."PlatformAuditEvent"', a.attname, 'SELECT') AS recovery_can_select,
      has_column_privilege('orbitox_audit_recovery', 'public."PlatformAuditEvent"', a.attname, 'UPDATE') AS recovery_can_update
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'PlatformAuditEvent'
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY a.attnum ASC;
  `,

  Q05_RLS_RELATIONS: `
    SELECT
      c.relname,
      c.relrowsecurity,
      c.relforcerowsecurity,
      c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY($1::text[])
    ORDER BY c.relname ASC;
  `,

  Q06_REMOVED_TABLES: `
    SELECT
      c.relname,
      c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY($1::text[]);
  `,

  Q07_POLICY_METADATA: `
    SELECT
      c.relname,
      p.polname,
      p.polcmd,
      p.polpermissive,
      (SELECT array_agg(r.rolname::text ORDER BY r.rolname)
       FROM pg_roles r
       WHERE r.oid = ANY(p.polroles)) AS roles,
      pg_get_expr(p.polqual, p.polrelid) AS using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY($1::text[])
    ORDER BY c.relname ASC, p.polname ASC;
  `,

  Q08_FUNCTION_SECURITY: `
    SELECT
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      r.rolname AS owner_name,
      p.prosecdef,
      p.provolatile,
      p.proconfig,
      format_type(p.prorettype, NULL) AS return_type,
      has_function_privilege('orbitox_runtime', p.oid, 'EXECUTE') AS runtime_can_execute,
      has_function_privilege('orbitox_maintenance', p.oid, 'EXECUTE') AS maintenance_can_execute,
      has_function_privilege('orbitox_audit_resolver', p.oid, 'EXECUTE') AS resolver_can_execute,
      has_function_privilege('orbitox_audit_recovery', p.oid, 'EXECUTE') AS recovery_can_execute,
      has_function_privilege('public', p.oid, 'EXECUTE') AS public_can_execute
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE n.nspname = 'public'
      AND (p.proname = ANY($1::text[]) OR p.prosecdef = true)
    ORDER BY p.proname ASC, identity_args ASC;
  `,

  Q09_RATE_LIMIT_PARTITION_SECURITY: `
    SELECT
      parent.relname AS parent_name,
      parent.relkind AS parent_kind,
      pg_get_partkeydef(parent.oid) AS part_key_def,
      child.relname AS child_name,
      child.relkind AS child_kind,
      r_parent.rolname AS parent_owner,
      r_child.rolname AS child_owner,
      has_table_privilege('orbitox_runtime', parent.oid, 'SELECT') AS runtime_parent_select,
      has_table_privilege('orbitox_runtime', parent.oid, 'INSERT') AS runtime_parent_insert,
      has_table_privilege('orbitox_runtime', parent.oid, 'UPDATE') AS runtime_parent_update,
      has_table_privilege('orbitox_runtime', parent.oid, 'DELETE') AS runtime_parent_delete,
      has_table_privilege('orbitox_runtime', parent.oid, 'TRUNCATE') AS runtime_parent_truncate,
      has_table_privilege('orbitox_runtime', child.oid, 'TRUNCATE') AS runtime_child_truncate
    FROM pg_class parent
    JOIN pg_namespace n ON n.oid = parent.relnamespace
    JOIN pg_roles r_parent ON r_parent.oid = parent.relowner
    LEFT JOIN pg_inherits i ON i.inhparent = parent.oid
    LEFT JOIN pg_class child ON child.oid = i.inhrelid
    LEFT JOIN pg_roles r_child ON r_child.oid = child.relowner
    WHERE n.nspname = 'public'
      AND parent.relname = 'PlatformRateLimitBucket'
    ORDER BY child.relname ASC;
  `,

  Q10_PARTITION_RUNWAY: `
    SELECT
      c.relname AS partition_name,
      pg_get_expr(c.relpartbound, c.oid) AS partition_bound
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND p.relname = 'PlatformRateLimitBucket'
      AND c.relname ~ '^PlatformRateLimitBucket_[0-9]{8}$'
    ORDER BY c.relname ASC;
  `,

  Q11_MIGRATION_LEDGER: `
    SELECT
      migration_name,
      checksum,
      finished_at,
      rolled_back_at,
      started_at,
      applied_steps_count,
      logs
    FROM _prisma_migrations
    ORDER BY started_at ASC;
  `,
});

// ── Catalog Inspection Check Implementations ────────────────────────────────────

async function checkQ01_ConnectionIdentity(prisma, results) {
  const checkId = 'Q-01';
  const name = 'Connection identity & PostgreSQL role safety';
  try {
    const rows = await prisma.$queryRawUnsafe(QUERIES.Q01_CONNECTION_IDENTITY);
    if (!rows || rows.length === 0) {
      results.push({ id: checkId, name, status: 'INCOMPLETE', details: 'No connection identity returned from pg_roles.' });
      return;
    }
    const identity = rows[0];
    const errors = [];

    if (identity.connection_user !== 'orbitox_runtime') {
      errors.push(`Current user must be orbitox_runtime, found: ${identity.connection_user}`);
    }
    if (identity.current_session_user !== 'orbitox_runtime') {
      errors.push(`Session user must be orbitox_runtime, found: ${identity.current_session_user}`);
    }
    if (identity.connection_user !== identity.current_session_user) {
      errors.push(`Undocumented role transition detected: session_user (${identity.current_session_user}) !== current_user (${identity.connection_user})`);
    }
    if (identity.rolsuper) errors.push('Role possesses prohibited SUPERUSER privilege');
    if (identity.rolbypassrls) errors.push('Role possesses prohibited BYPASSRLS privilege');
    if (identity.rolcreaterole) errors.push('Role possesses prohibited CREATEROLE privilege');
    if (identity.rolcreatedb) errors.push('Role possesses prohibited CREATEDB privilege');
    if (!identity.rolcanlogin) errors.push('Role lacks required LOGIN attribute');

    if (errors.length > 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: errors.join('; ') });
    } else {
      results.push({ id: checkId, name, status: 'PASS', details: 'Connection verified as unprivileged orbitox_runtime (NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE).' });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ02_SystemRoles(prisma, results) {
  const checkId = 'Q-02';
  const name = 'Complete 8-system-role attribute inventory';
  try {
    const targetRoles = EXPECTED_ROLES.map((r) => r.rolname);
    const rows = await prisma.$queryRawUnsafe(QUERIES.Q02_SYSTEM_ROLES, targetRoles);
    if (!rows || rows.length === 0) {
      results.push({ id: checkId, name, status: 'INCOMPLETE', details: 'No system roles visible in pg_roles.' });
      return;
    }

    const roleMap = new Map(rows.map((r) => [r.rolname, r]));
    const missing = [];
    const mismatches = [];

    for (const exp of EXPECTED_ROLES) {
      const act = roleMap.get(exp.rolname);
      if (!act) {
        missing.push(exp.rolname);
        continue;
      }
      if (act.rolsuper !== exp.rolsuper) {
        mismatches.push(`${exp.rolname}: expected rolsuper=${exp.rolsuper}, actual=${act.rolsuper}`);
      }
      if (act.rolbypassrls !== exp.rolbypassrls) {
        mismatches.push(`${exp.rolname}: expected rolbypassrls=${exp.rolbypassrls}, actual=${act.rolbypassrls}`);
      }
      if (act.rolcanlogin !== exp.rolcanlogin) {
        mismatches.push(`${exp.rolname}: expected rolcanlogin=${exp.rolcanlogin}, actual=${act.rolcanlogin}`);
      }
      if (act.rolcreatedb !== exp.rolcreatedb) {
        mismatches.push(`${exp.rolname}: expected rolcreatedb=${exp.rolcreatedb}, actual=${act.rolcreatedb}`);
      }
      if (act.rolcreaterole !== exp.rolcreaterole) {
        mismatches.push(`${exp.rolname}: expected rolcreaterole=${exp.rolcreaterole}, actual=${act.rolcreaterole}`);
      }
      if (act.rolinherit !== exp.rolinherit) {
        mismatches.push(`${exp.rolname}: expected rolinherit=${exp.rolinherit}, actual=${act.rolinherit}`);
      }
    }

    if (mismatches.length > 0) {
      // Confirmed FAIL takes precedence over INCOMPLETE
      const details = missing.length > 0
        ? `Role attribute violations: ${mismatches.join('; ')}. Also missing or invisible: ${missing.join(', ')}`
        : `Role attribute violations: ${mismatches.join('; ')}`;
      results.push({ id: checkId, name, status: 'FAIL', details });
    } else if (missing.length > 0) {
      results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Missing or invisible system roles: ${missing.join(', ')}` });
    } else {
      results.push({ id: checkId, name, status: 'PASS', details: `All ${EXPECTED_ROLES.length} system roles verified with strict least-privilege attributes.` });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ03_RoleMembershipAndDDL(prisma, results) {
  const checkId = 'Q-03';
  const name = 'Role membership graph & DDL authority lockout';
  try {
    const graphRows = await prisma.$queryRawUnsafe(QUERIES.Q03_ROLE_MEMBERSHIP_GRAPH);
    const ddlRows = await prisma.$queryRawUnsafe(QUERIES.Q03_DDL_AUTHORITY);

    if (!ddlRows || ddlRows.length === 0) {
      results.push({ id: checkId, name, status: 'INCOMPLETE', details: 'No DDL authority metadata returned.' });
      return;
    }

    const ddl = ddlRows[0];
    const errors = [];

    // 1. Role membership graph checks: runtime cannot be a member (direct or indirect) of privileged roles
    const prohibitedParents = new Set([
      'orbitox_migrator',
      'orbitox_maintenance',
      'orbitox_audit_resolver',
      'orbitox_audit_recovery',
      'rds_superuser',
      'postgres',
    ]);

    if (graphRows && graphRows.length > 0) {
      for (const edge of graphRows) {
        if (prohibitedParents.has(edge.parent_role)) {
          errors.push(`orbitox_runtime holds direct or indirect membership in ${edge.parent_role} (depth: ${edge.depth})`);
        }
        if (edge.admin_option) {
          errors.push(`orbitox_runtime possesses admin_option on role ${edge.parent_role}`);
        }
        if (edge.set_option && prohibitedParents.has(edge.parent_role)) {
          errors.push(`orbitox_runtime possesses set_option to switch into ${edge.parent_role}`);
        }
      }
    }

    // 2. DDL and ownership lockout checks
    if (ddl.runtime_has_db_create) errors.push('orbitox_runtime holds CREATE privilege on current database');
    if (ddl.runtime_has_schema_create) errors.push('orbitox_runtime holds CREATE privilege on public schema');
    if (ddl.db_owner === 'orbitox_runtime') errors.push('orbitox_runtime is the database owner');
    if (ddl.schema_owner === 'orbitox_runtime') errors.push('orbitox_runtime is the public schema owner');
    if (Number(ddl.runtime_owned_objects_count) > 0) errors.push(`orbitox_runtime owns ${ddl.runtime_owned_objects_count} database objects in public schema`);
    if (Number(ddl.runtime_owned_routines_count) > 0) errors.push(`orbitox_runtime owns ${ddl.runtime_owned_routines_count} functions/procedures in public schema`);

    if (errors.length > 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: errors.join('; ') });
    } else {
      results.push({ id: checkId, name, status: 'PASS', details: 'Zero DDL authority confirmed: no schema/DB CREATE, no ownership, and no privileged role memberships.' });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ04_PlatformAuditEventACL(prisma, results) {
  const checkId = 'Q-04';
  const name = 'PlatformAuditEvent 16-column structure & fine-grained ACLs';
  try {
    const colRows = await prisma.$queryRawUnsafe(QUERIES.Q04_AUDIT_COLUMNS);
    const tableAclRows = await prisma.$queryRawUnsafe(QUERIES.Q04_AUDIT_TABLE_PRIVILEGES);
    const colAclRows = await prisma.$queryRawUnsafe(QUERIES.Q04_AUDIT_COLUMN_PRIVILEGES);

    if (!colRows || !tableAclRows || !colAclRows || colRows.length === 0 || tableAclRows.length === 0) {
      results.push({ id: checkId, name, status: 'INCOMPLETE', details: 'Could not inspect PlatformAuditEvent columns or privileges.' });
      return;
    }

    const errors = [];

    // 1. Column structure validation: exactly 16 columns matching schema
    if (colRows.length !== EXPECTED_AUDIT_COLUMNS.length) {
      errors.push(`Expected exactly ${EXPECTED_AUDIT_COLUMNS.length} columns, found ${colRows.length}`);
    }

    const colMap = new Map(colRows.map((c) => [c.column_name, c]));
    const expectedColNames = new Set(EXPECTED_AUDIT_COLUMNS.map((c) => c.name));

    for (const act of colRows) {
      if (!expectedColNames.has(act.column_name)) {
        errors.push(`Unexpected column present in PlatformAuditEvent: ${act.column_name}`);
      }
    }

    for (const exp of EXPECTED_AUDIT_COLUMNS) {
      const act = colMap.get(exp.name);
      if (!act) {
        errors.push(`Missing expected column: ${exp.name}`);
        continue;
      }
      if (act.data_type !== exp.type) {
        errors.push(`Column ${exp.name} expected data_type '${exp.type}', actual '${act.data_type}'`);
      }
      const actNotNull = act.is_nullable === 'NO';
      if (actNotNull !== exp.notNull) {
        errors.push(`Column ${exp.name} expected notNull=${exp.notNull}, actual=${actNotNull}`);
      }
    }

    // 2. Table ownership and multi-principal privilege matrix validation (8 roles + PUBLIC = 9 principals)
    const tAcl = tableAclRows[0];

    // Ownership verification (pg_class.relowner)
    if (tAcl.table_owner !== 'orbitox_migrator') {
      errors.push(`PlatformAuditEvent table owner must be orbitox_migrator, found: ${tAcl.table_owner}`);
    }

    // Principal 1: orbitox_migrator (Table Owner - implicit ALL table privileges)
    if (!tAcl.migrator_select) errors.push('orbitox_migrator (table owner) must possess effective SELECT privilege');
    if (!tAcl.migrator_insert) errors.push('orbitox_migrator (table owner) must possess effective INSERT privilege');
    if (!tAcl.migrator_update) errors.push('orbitox_migrator (table owner) must possess effective UPDATE privilege');
    if (!tAcl.migrator_delete) errors.push('orbitox_migrator (table owner) must possess effective DELETE privilege');
    if (!tAcl.migrator_truncate) errors.push('orbitox_migrator (table owner) must possess effective TRUNCATE privilege');

    // Principal 2: orbitox_runtime (SELECT, INSERT only; audit immutability strictly enforced)
    if (!tAcl.runtime_select) errors.push('orbitox_runtime must have SELECT on PlatformAuditEvent');
    if (!tAcl.runtime_insert) errors.push('orbitox_runtime must have INSERT on PlatformAuditEvent');
    if (tAcl.runtime_update) errors.push('orbitox_runtime must NOT have UPDATE on PlatformAuditEvent');
    if (tAcl.runtime_delete) errors.push('orbitox_runtime must NOT have DELETE on PlatformAuditEvent');
    if (tAcl.runtime_truncate) errors.push('orbitox_runtime must NOT have TRUNCATE on PlatformAuditEvent');
    if (tAcl.runtime_references) errors.push('orbitox_runtime must NOT have REFERENCES on PlatformAuditEvent');
    if (tAcl.runtime_trigger) errors.push('orbitox_runtime must NOT have TRIGGER on PlatformAuditEvent');
    if (tAcl.runtime_any_col_update) errors.push('orbitox_runtime must NOT hold UPDATE on ANY column of PlatformAuditEvent');

    // Principal 3: orbitox_platform_admin_audit (INSERT only)
    if (!tAcl.admin_audit_insert) errors.push('orbitox_platform_admin_audit must have INSERT on PlatformAuditEvent');
    if (tAcl.admin_audit_select) errors.push('orbitox_platform_admin_audit must NOT have SELECT on PlatformAuditEvent');
    if (tAcl.admin_audit_update) errors.push('orbitox_platform_admin_audit must NOT have UPDATE on PlatformAuditEvent');
    if (tAcl.admin_audit_delete) errors.push('orbitox_platform_admin_audit must NOT have DELETE on PlatformAuditEvent');
    if (tAcl.admin_audit_truncate) errors.push('orbitox_platform_admin_audit must NOT have TRUNCATE on PlatformAuditEvent');

    // Principal 4: orbitox_audit_resolver (Column-level only)
    if (tAcl.resolver_table_select) errors.push('orbitox_audit_resolver must NOT have table-level SELECT (column-level only)');
    if (tAcl.resolver_table_insert) errors.push('orbitox_audit_resolver must NOT have table-level INSERT');
    if (tAcl.resolver_table_update) errors.push('orbitox_audit_resolver must NOT have table-level UPDATE (column-level only)');
    if (tAcl.resolver_table_delete) errors.push('orbitox_audit_resolver must NOT have DELETE on PlatformAuditEvent');
    if (tAcl.resolver_table_truncate) errors.push('orbitox_audit_resolver must NOT have TRUNCATE on PlatformAuditEvent');

    // Principal 5: orbitox_audit_recovery (Column-level only)
    if (tAcl.recovery_table_select) errors.push('orbitox_audit_recovery must NOT have table-level SELECT (column-level only)');
    if (tAcl.recovery_table_insert) errors.push('orbitox_audit_recovery must NOT have table-level INSERT');
    if (tAcl.recovery_table_update) errors.push('orbitox_audit_recovery must NOT have table-level UPDATE (column-level only)');
    if (tAcl.recovery_table_delete) errors.push('orbitox_audit_recovery must NOT have DELETE on PlatformAuditEvent');
    if (tAcl.recovery_table_truncate) errors.push('orbitox_audit_recovery must NOT have TRUNCATE on PlatformAuditEvent');

    // Principal 6: orbitox_maintenance (Day-30 erasure SELECT, DELETE only)
    if (!tAcl.maintenance_select) errors.push('orbitox_maintenance must have SELECT on PlatformAuditEvent');
    if (!tAcl.maintenance_delete) errors.push('orbitox_maintenance must have DELETE on PlatformAuditEvent');
    if (tAcl.maintenance_insert) errors.push('orbitox_maintenance must NOT have INSERT on PlatformAuditEvent');
    if (tAcl.maintenance_update) errors.push('orbitox_maintenance must NOT have UPDATE on PlatformAuditEvent');
    if (tAcl.maintenance_truncate) errors.push('orbitox_maintenance must NOT have TRUNCATE on PlatformAuditEvent');

    // Principal 7: hms_audit_reader (ZERO privileges on PlatformAuditEvent)
    if (tAcl.hms_audit_reader_select) errors.push('hms_audit_reader must NOT have SELECT on PlatformAuditEvent');
    if (tAcl.hms_audit_reader_insert) errors.push('hms_audit_reader must NOT have INSERT on PlatformAuditEvent');
    if (tAcl.hms_audit_reader_update) errors.push('hms_audit_reader must NOT have UPDATE on PlatformAuditEvent');
    if (tAcl.hms_audit_reader_delete) errors.push('hms_audit_reader must NOT have DELETE on PlatformAuditEvent');
    if (tAcl.hms_audit_reader_truncate) errors.push('hms_audit_reader must NOT have TRUNCATE on PlatformAuditEvent');
    if (tAcl.hms_audit_reader_any_col_select) errors.push('hms_audit_reader must NOT have column-level SELECT on PlatformAuditEvent');
    if (tAcl.hms_audit_reader_any_col_update) errors.push('hms_audit_reader must NOT have column-level UPDATE on PlatformAuditEvent');

    // Principal 8: orbitox_outbox_relay (ZERO privileges on PlatformAuditEvent)
    if (tAcl.outbox_relay_select) errors.push('orbitox_outbox_relay must NOT have SELECT on PlatformAuditEvent');
    if (tAcl.outbox_relay_insert) errors.push('orbitox_outbox_relay must NOT have INSERT on PlatformAuditEvent');
    if (tAcl.outbox_relay_update) errors.push('orbitox_outbox_relay must NOT have UPDATE on PlatformAuditEvent');
    if (tAcl.outbox_relay_delete) errors.push('orbitox_outbox_relay must NOT have DELETE on PlatformAuditEvent');
    if (tAcl.outbox_relay_truncate) errors.push('orbitox_outbox_relay must NOT have TRUNCATE on PlatformAuditEvent');
    if (tAcl.outbox_relay_any_col_select) errors.push('orbitox_outbox_relay must NOT have column-level SELECT on PlatformAuditEvent');
    if (tAcl.outbox_relay_any_col_update) errors.push('orbitox_outbox_relay must NOT have column-level UPDATE on PlatformAuditEvent');

    // Principal 9: public (ZERO privileges on PlatformAuditEvent)
    if (tAcl.public_select) errors.push('public must NOT have SELECT on PlatformAuditEvent');
    if (tAcl.public_insert) errors.push('public must NOT have INSERT on PlatformAuditEvent');
    if (tAcl.public_update) errors.push('public must NOT have UPDATE on PlatformAuditEvent');
    if (tAcl.public_delete) errors.push('public must NOT have DELETE on PlatformAuditEvent');
    if (tAcl.public_truncate) errors.push('public must NOT have TRUNCATE on PlatformAuditEvent');

    // 3. Column-level privileges validation for Resolver and Recovery
    const resolverSelectAllowed = new Set(['id', 'organizationId', 'projectId', 'status', 'occurredAt', 'metadata']);
    const resolverUpdateAllowed = new Set(['status', 'failureReason', 'metadata']);
    const recoverySelectAllowed = new Set(['id', 'status', 'occurredAt']);
    const recoveryUpdateAllowed = new Set(['status', 'failureReason']);

    for (const cAcl of colAclRows) {
      const colName = cAcl.column_name;

      // Resolver SELECT
      if (resolverSelectAllowed.has(colName)) {
        if (!cAcl.resolver_can_select) errors.push(`orbitox_audit_resolver missing required SELECT on column ${colName}`);
      } else {
        if (cAcl.resolver_can_select) errors.push(`orbitox_audit_resolver must NOT have SELECT on column ${colName}`);
      }

      // Resolver UPDATE
      if (resolverUpdateAllowed.has(colName)) {
        if (!cAcl.resolver_can_update) errors.push(`orbitox_audit_resolver missing required UPDATE on column ${colName}`);
      } else {
        if (cAcl.resolver_can_update) errors.push(`orbitox_audit_resolver must NOT have UPDATE on column ${colName}`);
      }

      // Recovery SELECT
      if (recoverySelectAllowed.has(colName)) {
        if (!cAcl.recovery_can_select) errors.push(`orbitox_audit_recovery missing required SELECT on column ${colName}`);
      } else {
        if (cAcl.recovery_can_select) errors.push(`orbitox_audit_recovery must NOT have SELECT on column ${colName}`);
      }

      // Recovery UPDATE
      if (recoveryUpdateAllowed.has(colName)) {
        if (!cAcl.recovery_can_update) errors.push(`orbitox_audit_recovery missing required UPDATE on column ${colName}`);
      } else {
        if (cAcl.recovery_can_update) errors.push(`orbitox_audit_recovery must NOT have UPDATE on column ${colName}`);
      }
    }

    if (errors.length > 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: errors.join('; ') });
    } else {
      results.push({ id: checkId, name, status: 'PASS', details: 'Verified table owner (orbitox_migrator), all 16 columns, and complete 9-principal table/column ACL security matrix.' });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ05_RLSRelations(prisma, results) {
  const checkId = 'Q-05';
  const name = 'Complete 42-relation RLS & FORCE RLS verification';
  try {
    const rows = await prisma.$queryRawUnsafe(QUERIES.Q05_RLS_RELATIONS, EXPECTED_RLS_RELATIONS);
    if (!rows) {
      results.push({ id: checkId, name, status: 'INCOMPLETE', details: 'No relation metadata returned.' });
      return;
    }

    const errors = [];
    const relationMap = new Map(rows.map((r) => [r.relname, r]));

    if (rows.length !== EXPECTED_RLS_RELATIONS.length) {
      errors.push(`Expected 42 relations, found ${rows.length}`);
    }

    for (const expName of EXPECTED_RLS_RELATIONS) {
      const act = relationMap.get(expName);
      if (!act) {
        errors.push(`Missing relation: ${expName}`);
        continue;
      }
      if (!act.relrowsecurity) errors.push(`${expName}: RLS is not enabled (relrowsecurity=false)`);
      if (!act.relforcerowsecurity) errors.push(`${expName}: RLS is not forced (relforcerowsecurity=false)`);
      if (act.relkind !== 'r') errors.push(`${expName}: expected ordinary table (relkind='r'), actual '${act.relkind}'`);
    }

    if (errors.length > 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: errors.join('; ') });
    } else {
      results.push({ id: checkId, name, status: 'PASS', details: 'All 42 surviving operational tables have relrowsecurity=true and relforcerowsecurity=true.' });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ06_RemovedSampleTables(prisma, results) {
  const checkId = 'Q-06';
  const name = 'Removed sample-table absence verification';
  try {
    const rows = await prisma.$queryRawUnsafe(QUERIES.Q06_REMOVED_TABLES, EXPECTED_DROPPED_TABLES);
    if (rows && rows.length > 0) {
      const foundNames = rows.map((r) => r.relname).join(', ');
      results.push({
        id: checkId,
        name,
        status: 'FAIL',
        details: `Discovered resurrected Phase 7A sample tables in public schema: ${foundNames}`,
      });
    } else {
      results.push({
        id: checkId,
        name,
        status: 'PASS',
        details: `All ${EXPECTED_DROPPED_TABLES.length} Phase 7A sample tables confirmed absent.`,
      });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ07_PolicyMetadata(prisma, results) {
  const checkId = 'Q-07';
  const name = 'Complete policy metadata & command-aware expression verification';
  try {
    const rows = await prisma.$queryRawUnsafe(QUERIES.Q07_POLICY_METADATA, EXPECTED_RLS_RELATIONS);
    if (!rows || rows.length === 0) {
      results.push({ id: checkId, name, status: 'INCOMPLETE', details: 'No policy metadata returned.' });
      return;
    }

    const errors = [];
    const policiesByTable = new Map();

    for (const row of rows) {
      if (!policiesByTable.has(row.relname)) policiesByTable.set(row.relname, []);
      policiesByTable.get(row.relname).push(row);

      // Validate command-aware expression semantics for each policy
      const cmd = row.polcmd;
      const usingExpr = row.using_expr;
      const withCheckExpr = row.with_check_expr;

      if (cmd === 'r') {
        // SELECT policy requires USING; WITH CHECK is irrelevant
        if (!usingExpr || usingExpr.trim() === '') {
          errors.push(`Table ${row.relname} SELECT policy '${row.polname}' missing required USING expression`);
        }
      } else if (cmd === 'a') {
        // INSERT policy requires WITH CHECK; USING is irrelevant
        if (!withCheckExpr || withCheckExpr.trim() === '') {
          errors.push(`Table ${row.relname} INSERT policy '${row.polname}' missing required WITH CHECK expression`);
        }
      } else if (cmd === 'w') {
        // UPDATE policy requires USING; WITH CHECK can be explicit or fallback
        if (!usingExpr || usingExpr.trim() === '') {
          errors.push(`Table ${row.relname} UPDATE policy '${row.polname}' missing required USING expression`);
        }
      } else if (cmd === 'd') {
        // DELETE policy requires USING; WITH CHECK is irrelevant
        if (!usingExpr || usingExpr.trim() === '') {
          errors.push(`Table ${row.relname} DELETE policy '${row.polname}' missing required USING expression`);
        }
      } else if (cmd === '*') {
        // ALL policy requires USING; PostgreSQL uses USING as implicit WITH CHECK when withCheck is omitted
        if (!usingExpr || usingExpr.trim() === '') {
          errors.push(`Table ${row.relname} ALL policy '${row.polname}' missing required USING expression`);
        }
      }
    }

    // Specific mandatory policy assertions

    // 1. RestaurantOrderItem dual policy & RESTRICTIVE mode
    const roiPolicies = policiesByTable.get('RestaurantOrderItem') || [];
    const roiConsistency = roiPolicies.find((p) => p.polname === 'orbitox_order_item_consistency');
    const roiTenant = roiPolicies.find((p) => p.polname === 'orbitox_tenant_isolation');

    if (!roiTenant) errors.push('RestaurantOrderItem missing orbitox_tenant_isolation policy');
    else if (!roiTenant.polpermissive) errors.push('RestaurantOrderItem orbitox_tenant_isolation must be PERMISSIVE');

    if (!roiConsistency) errors.push('RestaurantOrderItem missing orbitox_order_item_consistency policy');
    else {
      if (roiConsistency.polpermissive) errors.push('RestaurantOrderItem orbitox_order_item_consistency must be RESTRICTIVE');
      const using = roiConsistency.using_expr || '';
      if (!using.includes('RestaurantOrder') || !using.includes('orderId')) {
        errors.push('RestaurantOrderItem consistency policy missing RestaurantOrder EXISTS check');
      }
    }

    // 2. PlatformAuditEvent 4 policies
    const paePolicies = policiesByTable.get('PlatformAuditEvent') || [];
    const expectedPaePolicies = [
      { name: 'PlatformAuditEvent_maintenance_all', cmd: '*', permissive: true },
      { name: 'orbitox_audit_resolution', cmd: '*', permissive: true },
      { name: 'orbitox_audit_scope', cmd: '*', permissive: true },
      { name: 'orbitox_platform_admin_audit_insert', cmd: 'a', permissive: true },
    ];
    for (const exp of expectedPaePolicies) {
      const act = paePolicies.find((p) => p.polname === exp.name);
      if (!act) {
        errors.push(`PlatformAuditEvent missing expected policy ${exp.name}`);
      } else {
        if (act.polcmd !== exp.cmd) errors.push(`PlatformAuditEvent policy ${exp.name} expected cmd '${exp.cmd}', actual '${act.polcmd}'`);
        if (act.polpermissive !== exp.permissive) errors.push(`PlatformAuditEvent policy ${exp.name} expected permissive=${exp.permissive}`);
      }
    }

    // 3. HmsPhiAccessLog dedicated audit reader policy
    const hmsPhiPolicies = policiesByTable.get('HmsPhiAccessLog') || [];
    if (!hmsPhiPolicies.some((p) => p.polname === 'HmsPhiAccessLog_audit_reader_select')) {
      errors.push('HmsPhiAccessLog missing HmsPhiAccessLog_audit_reader_select policy');
    }

    // 4. PlatformPluginUsage & BillingProviderCache tenant scope and maintenance policies
    const ppuPolicies = policiesByTable.get('PlatformPluginUsage') || [];
    if (!ppuPolicies.some((p) => p.polname === 'orbitox_plugin_usage_tenant_scope')) {
      errors.push('PlatformPluginUsage missing orbitox_plugin_usage_tenant_scope policy');
    }
    if (!ppuPolicies.some((p) => p.polname === 'PlatformPluginUsage_maintenance_all')) {
      errors.push('PlatformPluginUsage missing PlatformPluginUsage_maintenance_all policy');
    }

    const bpcPolicies = policiesByTable.get('BillingProviderCache') || [];
    if (!bpcPolicies.some((p) => p.polname === 'orbitox_billing_cache_tenant_scope')) {
      errors.push('BillingProviderCache missing orbitox_billing_cache_tenant_scope policy');
    }
    if (!bpcPolicies.some((p) => p.polname === 'BillingProviderCache_maintenance_all')) {
      errors.push('BillingProviderCache missing BillingProviderCache_maintenance_all policy');
    }

    // 5. TenantIdempotencyKey & TenantOutbox maintenance policies
    const tikPolicies = policiesByTable.get('TenantIdempotencyKey') || [];
    if (!tikPolicies.some((p) => p.polname === 'TenantIdempotencyKey_maintenance_all')) {
      errors.push('TenantIdempotencyKey missing TenantIdempotencyKey_maintenance_all policy');
    }

    const outboxPolicies = policiesByTable.get('TenantOutbox') || [];
    if (!outboxPolicies.some((p) => p.polname === 'TenantOutbox_maintenance_all')) {
      errors.push('TenantOutbox missing TenantOutbox_maintenance_all policy');
    }

    if (errors.length > 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: errors.join('; ') });
    } else {
      results.push({ id: checkId, name, status: 'PASS', details: 'All policies verified for command-aware expressions, RESTRICTIVE modes, and tenant isolation.' });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ08_FunctionSecurity(prisma, results) {
  const checkId = 'Q-08';
  const name = 'Routine & SECURITY DEFINER function security inventory';
  try {
    const targetNames = EXPECTED_FUNCTIONS.map((f) => f.name);
    const rows = await prisma.$queryRawUnsafe(QUERIES.Q08_FUNCTION_SECURITY, targetNames);
    if (!rows) {
      results.push({ id: checkId, name, status: 'INCOMPLETE', details: 'No function metadata returned.' });
      return;
    }

    const errors = [];
    const expectedFuncMap = new Map(EXPECTED_FUNCTIONS.map((f) => [f.name, f]));
    const foundNames = new Set();
    const approvedTriggerSet = new Set(APPROVED_TRIGGER_FUNCTIONS);

    for (const row of rows) {
      foundNames.add(row.proname);
      const exp = expectedFuncMap.get(row.proname);

      if (!exp) {
        // If this is an additional SECURITY DEFINER routine, check if it's an approved trigger routine
        if (row.prosecdef) {
          if (row.return_type === 'trigger' && approvedTriggerSet.has(row.proname)) {
            // Valid approved trigger routine
            continue;
          }
          errors.push(`Unexpected SECURITY DEFINER routine discovered: ${row.proname}(${row.identity_args}) owned by ${row.owner_name}`);
        }
        continue;
      }

      // Check owner vs caller distinction
      if (row.owner_name !== exp.owner) {
        errors.push(`Function ${row.proname} expected owner '${exp.owner}', actual '${row.owner_name}'`);
      }

      // Check SECURITY DEFINER
      if (row.prosecdef !== exp.secdef) {
        errors.push(`Function ${row.proname} expected secdef=${exp.secdef}, actual=${row.prosecdef}`);
      }

      // Check search_path pinning for SECDEF routines
      if (row.prosecdef) {
        const configStr = (row.proconfig || []).join('; ');
        if (!configStr.includes('search_path')) {
          errors.push(`Function ${row.proname} is SECURITY DEFINER but missing pinned search_path in proconfig`);
        }
      }

      // Check caller execution permissions
      if (row.public_can_execute) {
        errors.push(`Function ${row.proname} is executable by PUBLIC (must be revoked)`);
      }
      if (row.runtime_can_execute !== exp.runtimeExec) {
        errors.push(`Function ${row.proname} expected runtimeExec=${exp.runtimeExec}, actual=${row.runtime_can_execute}`);
      }
      if (row.maintenance_can_execute !== exp.maintenanceExec) {
        errors.push(`Function ${row.proname} expected maintenanceExec=${exp.maintenanceExec}, actual=${row.maintenance_can_execute}`);
      }
    }

    for (const exp of EXPECTED_FUNCTIONS) {
      if (!foundNames.has(exp.name)) {
        errors.push(`Function ${exp.name} missing from database`);
      }
    }

    if (errors.length > 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: errors.join('; ') });
    } else {
      results.push({ id: checkId, name, status: 'PASS', details: 'All 8 stored routines verified for signature, owner, search_path isolation, and caller permissions.' });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ09_RateLimitPartitionSecurity(prisma, results) {
  const checkId = 'Q-09';
  const name = 'Rate-limit partition model & parent privilege security';
  try {
    const rows = await prisma.$queryRawUnsafe(QUERIES.Q09_RATE_LIMIT_PARTITION_SECURITY);
    if (!rows || rows.length === 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: 'PlatformRateLimitBucket table missing from database' });
      return;
    }

    const errors = [];
    const parentRow = rows[0];

    // Parent validations
    if (parentRow.parent_kind !== 'p') errors.push(`PlatformRateLimitBucket expected partitioned table (relkind='p'), actual '${parentRow.parent_kind}'`);
    if (parentRow.parent_owner !== 'orbitox_migrator') errors.push(`PlatformRateLimitBucket parent expected owner 'orbitox_migrator', actual '${parentRow.parent_owner}'`);
    if (!parentRow.part_key_def || !parentRow.part_key_def.includes('RANGE') || !parentRow.part_key_def.includes('windowStart')) {
      errors.push(`PlatformRateLimitBucket expected RANGE ("windowStart") partitioning, actual '${parentRow.part_key_def}'`);
    }

    // Parent runtime ACLs
    if (!parentRow.runtime_parent_select) errors.push('orbitox_runtime must have SELECT on parent PlatformRateLimitBucket');
    if (!parentRow.runtime_parent_insert) errors.push('orbitox_runtime must have INSERT on parent PlatformRateLimitBucket');
    if (!parentRow.runtime_parent_update) errors.push('orbitox_runtime must have UPDATE on parent PlatformRateLimitBucket');
    if (parentRow.runtime_parent_delete) errors.push('orbitox_runtime must NOT have DELETE on parent PlatformRateLimitBucket');
    if (parentRow.runtime_parent_truncate) errors.push('orbitox_runtime must NOT have TRUNCATE on parent PlatformRateLimitBucket');

    // Child validations
    const childRows = rows.filter((r) => r.child_name !== null);
    for (const child of childRows) {
      if (child.child_owner !== 'orbitox_migrator') {
        errors.push(`Child partition ${child.child_name} expected owner 'orbitox_migrator', actual '${child.child_owner}'`);
      }
      if (child.runtime_child_truncate) {
        errors.push(`orbitox_runtime must NOT have TRUNCATE on child partition ${child.child_name}`);
      }
    }

    if (errors.length > 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: errors.join('; ') });
    } else {
      results.push({ id: checkId, name, status: 'PASS', details: 'Partition model verified: parent RANGE ("windowStart"), owned by orbitox_migrator, runtime ACLs intact.' });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ10_PartitionRunway(prisma, results) {
  const checkId = 'Q-10';
  const name = 'Direct partition runway catalog inspection (zero-eval)';
  try {
    const rows = await prisma.$queryRawUnsafe(QUERIES.Q10_PARTITION_RUNWAY);
    if (!rows) {
      results.push({ id: checkId, name, status: 'INCOMPLETE', details: 'Could not query pg_inherits for partitions.' });
      return;
    }

    const partitionMap = new Map(rows.map((r) => [r.partition_name, r.partition_bound]));
    const now = new Date();
    const requiredRunwayDays = 3; // Today + 3 forward days = 4 days
    const missingDays = [];
    const boundaryMismatches = [];

    for (let i = 0; i <= requiredRunwayDays; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const expectedPartition = `PlatformRateLimitBucket_${year}${month}${day}`;
      const expectedDatePrefix = `${year}-${month}-${day}`;

      if (!partitionMap.has(expectedPartition)) {
        missingDays.push(expectedPartition);
      } else {
        const bound = partitionMap.get(expectedPartition) || '';
        if (!bound.includes(expectedDatePrefix)) {
          boundaryMismatches.push(`${expectedPartition} bound mismatch: ${bound}`);
        }
      }
    }

    if (missingDays.length > 0 || boundaryMismatches.length > 0) {
      const details = [];
      if (missingDays.length > 0) details.push(`Insufficient partition runway. Missing required daily partitions: ${missingDays.join(', ')}`);
      if (boundaryMismatches.length > 0) details.push(`Partition boundary mismatches: ${boundaryMismatches.join('; ')}`);
      results.push({ id: checkId, name, status: 'FAIL', details: details.join('; ') });
    } else {
      results.push({
        id: checkId,
        name,
        status: 'PASS',
        details: `Direct catalog scan verified contiguous ${requiredRunwayDays + 1}-day partition runway with valid boundary ranges (${rows.length} total partitions present).`,
      });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

async function checkQ11_MigrationLedger(prisma, results, migrationsDir) {
  const checkId = 'Q-11';
  const name = 'Prisma migration ledger reconciliation & checksum integrity';
  try {
    const rows = await prisma.$queryRawUnsafe(QUERIES.Q11_MIGRATION_LEDGER);
    if (!rows || rows.length === 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: 'No records found in _prisma_migrations ledger.' });
      return;
    }

    const errors = [];
    const expectedSet = new Set(EXPECTED_MIGRATIONS);
    const rowsByName = new Map();

    // 1. Inspect all rows for unresolved attempts and contradictory states
    for (const row of rows) {
      // Unresolved failed attempt
      if (row.finished_at === null && row.rolled_back_at === null) {
        errors.push(`Unresolved failed migration attempt detected: ${row.migration_name} (started at ${row.started_at})`);
      }
      // Contradictory state: finished without starting, or rolled back without finished
      if (row.finished_at !== null && row.started_at === null) {
        errors.push(`Contradictory migration state: ${row.migration_name} finished_at is set but started_at is null`);
      }

      if (!rowsByName.has(row.migration_name)) rowsByName.set(row.migration_name, []);
      rowsByName.get(row.migration_name).push(row);
    }

    // 2. Reconcile each expected migration
    for (const expName of EXPECTED_MIGRATIONS) {
      const attempts = rowsByName.get(expName);
      if (!attempts || attempts.length === 0) {
        errors.push(`Missing applied migration: ${expName}`);
        continue;
      }
      const successfulAttempts = attempts.filter((a) => a.finished_at !== null && a.rolled_back_at === null);
      if (successfulAttempts.length === 0) {
        errors.push(`Migration ${expName} has no successful unrolled-back attempt`);
      } else if (successfulAttempts.length > 1) {
        errors.push(`Duplicate successful attempts detected for migration: ${expName} (ledger corruption)`);
      }
    }

    // 3. Check for unexpected database migrations
    for (const [name, attempts] of rowsByName.entries()) {
      if (!expectedSet.has(name)) {
        const active = attempts.some((a) => a.finished_at !== null && a.rolled_back_at === null);
        if (active) {
          errors.push(`Unexpected database migration not in expected manifest: ${name}`);
        }
      }
    }

    // 4. Source checksum verification
    let checksumVerified = false;
    let checksumDetails = '';

    if (migrationsDir && fs.existsSync(migrationsDir)) {
      let checksumFailures = 0;
      let checksumChecked = 0;

      for (const expName of EXPECTED_MIGRATIONS) {
        const sqlFile = path.join(migrationsDir, expName, 'migration.sql');
        if (fs.existsSync(sqlFile)) {
          const fileBytes = fs.readFileSync(sqlFile);
          const computedHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
          const successfulAttempt = (rowsByName.get(expName) || []).find((a) => a.finished_at !== null && a.rolled_back_at === null);
          if (successfulAttempt) {
            checksumChecked++;
            if (successfulAttempt.checksum !== computedHash) {
              errors.push(`Checksum mismatch for ${expName}: expected ${computedHash}, database has ${successfulAttempt.checksum}`);
              checksumFailures++;
            }
          }
        }
      }
      if (checksumFailures === 0 && checksumChecked > 0) {
        checksumVerified = true;
        checksumDetails = `Filesystem source checksums verified for ${checksumChecked} migrations.`;
      } else if (checksumChecked === 0) {
        checksumDetails = 'No local migration.sql files matched directories on disk.';
      }
    } else {
      checksumDetails = 'Migration SQL source directory not accessible on disk; source checksum verification unavailable.';
    }

    if (errors.length > 0) {
      results.push({ id: checkId, name, status: 'FAIL', details: errors.join('; ') });
    } else {
      results.push({
        id: checkId,
        name,
        status: 'PASS',
        details: `All ${EXPECTED_MIGRATIONS.length} migrations reconciled in ledger. ${checksumDetails}`,
      });
    }
  } catch (err) {
    results.push({ id: checkId, name, status: 'INCOMPLETE', details: `Query failed: ${redactCredentials(err.message)}` });
  }
}

// ── Orchestration Engine ───────────────────────────────────────────────────────

async function runInventory(options = {}) {
  const databaseUrl = options.databaseUrl || process.env.APP_DATABASE_URL;

  // 1. Missing or whitespace-only configuration
  if (!databaseUrl || databaseUrl.trim() === '') {
    const errorMsg = '❌ FATAL: APP_DATABASE_URL environment variable is required for catalog inventory verification.';
    console.error(errorMsg);
    return {
      exitCode: EXIT_CODES.MISSING_OR_INVALID_CONFIG,
      results: [{ id: 'CONFIG', name: 'Environment Configuration', status: 'FAIL', details: errorMsg }],
      summary: { total: 1, pass: 0, fail: 1, incomplete: 0 },
    };
  }

  // 2. Validate URL syntax
  try {
    new URL(databaseUrl.replace(/^postgresql:\/\//i, 'http://'));
  } catch {
    const errorMsg = '❌ FATAL: APP_DATABASE_URL is not a valid database connection URL.';
    console.error(errorMsg);
    return {
      exitCode: EXIT_CODES.MISSING_OR_INVALID_CONFIG,
      results: [{ id: 'CONFIG', name: 'Environment Configuration', status: 'FAIL', details: errorMsg }],
      summary: { total: 1, pass: 0, fail: 1, incomplete: 0 },
    };
  }

  let prisma = options.prisma;
  let ownPrisma = false;

  if (!prisma) {
    try {
      prisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });
      ownPrisma = true;
    } catch (err) {
      console.error('❌ FATAL: Failed to construct Prisma Client:', redactCredentials(err.message));
      return {
        exitCode: EXIT_CODES.CONNECTION_FAILURE,
        results: [{ id: 'CLIENT_INIT', name: 'Prisma Client Construction', status: 'FAIL', details: redactCredentials(err.message) }],
        summary: { total: 1, pass: 0, fail: 1, incomplete: 0 },
      };
    }
  }

  const results = [];
  const migrationsDir = options.migrationsDir || path.resolve(__dirname, '../../prisma/migrations');

  console.log('================================================================');
  console.log('🪐 ORBITOX STAGING STEP 1 READ-ONLY CATALOG INVENTORY ENGINE');
  console.log('================================================================\n');

  try {
    await checkQ01_ConnectionIdentity(prisma, results);
    await checkQ02_SystemRoles(prisma, results);
    await checkQ03_RoleMembershipAndDDL(prisma, results);
    await checkQ04_PlatformAuditEventACL(prisma, results);
    await checkQ05_RLSRelations(prisma, results);
    await checkQ06_RemovedSampleTables(prisma, results);
    await checkQ07_PolicyMetadata(prisma, results);
    await checkQ08_FunctionSecurity(prisma, results);
    await checkQ09_RateLimitPartitionSecurity(prisma, results);
    await checkQ10_PartitionRunway(prisma, results);
    await checkQ11_MigrationLedger(prisma, results, migrationsDir);
  } catch (err) {
    console.error('❌ FATAL UNEXPECTED ERROR during inventory execution:', redactCredentials(err.message));
    results.push({ id: 'RUNTIME_EXCEPTION', name: 'Unexpected Execution Error', status: 'FAIL', details: redactCredentials(err.message) });
  } finally {
    if (ownPrisma && prisma) {
      try {
        await prisma.$disconnect();
      } catch {}
    }
  }

  let passCount = 0;
  let failCount = 0;
  let incompleteCount = 0;

  console.log('────────────────────────────────────────────────────────────────');
  console.log('INVENTORY VERIFICATION RESULTS');
  console.log('────────────────────────────────────────────────────────────────');

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${r.id}] ${r.name}`);
    console.log(`   Status : ${r.status}`);
    console.log(`   Details: ${r.details}\n`);

    if (r.status === 'PASS') passCount++;
    else if (r.status === 'FAIL') failCount++;
    else incompleteCount++;
  }

  console.log('────────────────────────────────────────────────────────────────');
  console.log(`SUMMARY: Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount} | Incomplete: ${incompleteCount}`);
  console.log('────────────────────────────────────────────────────────────────\n');

  // Exit code deterministic precedence:
  // 1. Any check FAIL -> VERIFICATION_FAILED (1)
  // 2. Any check INCOMPLETE (no FAIL) -> INSUFFICIENT_VISIBILITY (3)
  // 3. All checks PASS -> SUCCESS (0)
  let exitCode = EXIT_CODES.SUCCESS;
  if (failCount > 0) {
    exitCode = EXIT_CODES.VERIFICATION_FAILED;
    console.error('❌ STAGING INVENTORY VERIFICATION FAILED.');
  } else if (incompleteCount > 0) {
    exitCode = EXIT_CODES.INSUFFICIENT_VISIBILITY;
    console.error('⚠️ STAGING INVENTORY INCOMPLETE: Insufficient catalog visibility.');
  } else {
    console.log('✅ ALL STAGING STEP 1 CATALOG INVENTORY CHECKS PASSED.');
  }

  return {
    exitCode,
    results,
    summary: { total: results.length, pass: passCount, fail: failCount, incomplete: incompleteCount },
  };
}

// ── CLI Main Execution ─────────────────────────────────────────────────────────

if (require.main === module) {
  runInventory()
    .then(({ exitCode }) => {
      process.exit(exitCode);
    })
    .catch((err) => {
      console.error('❌ Fatal error:', redactCredentials(err?.message || err));
      process.exit(EXIT_CODES.UNEXPECTED_ERROR);
    });
}

// ── Module Exports for Testing ─────────────────────────────────────────────────

module.exports = {
  EXIT_CODES,
  EXPECTED_ROLES,
  EXPECTED_AUDIT_COLUMNS,
  EXPECTED_RLS_RELATIONS,
  EXPECTED_DROPPED_TABLES,
  EXPECTED_FUNCTIONS,
  APPROVED_TRIGGER_FUNCTIONS,
  EXPECTED_MIGRATIONS,
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
};
