process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit@127.0.0.1:5432/orbitox_phase2';
process.env.OUTBOX_RELAY_DATABASE_URL = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay@127.0.0.1:5432/orbitox_phase2';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.APP_DATABASE_URL;
}

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { platformRepository } from '../lib/platform-repository';
import {
  SEED_PLANS,
  SEED_PLUGINS,
  InvalidStateTransitionError,
  PlatformRepository,
} from '@orbitox-io/plugin-engine';
import { DELETE as deletePlan, PATCH as patchPlan } from '../app/api/v1/platform/plans/[planId]/route';

async function listAuditEvents(entityId: string) {
  const databaseUrl = process.env.TEST_OWNER_DATABASE_URL || process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
  const reader = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    return await reader.platformAuditEvent.findMany({
      where: { entityId },
      orderBy: { occurredAt: 'desc' },
    });
  } finally {
    await reader.$disconnect();
  }
}

describe('Phase 3 Parts A–C: Rights, Licensing & Entitlement Engine', () => {
  const TEST_ADMIN_TOKEN = 'test_admin_token_super_secret_32_chars_minimum';
  let testOrg: any;

  before(async () => {
    process.env.ORBITOX_ADMIN_TOKEN = TEST_ADMIN_TOKEN;
    process.env.ORBITOX_ADMIN_TOKEN_SCOPES = 'DELETE:/api/v1/platform/plans/*,PATCH:/api/v1/platform/plans/*';
    process.env.PLATFORM_ADMIN_TOKEN = TEST_ADMIN_TOKEN;
    await platformRepository.ensurePlanCatalogueSeeded();
    const orgs = await platformRepository.listOrganizations();
    testOrg = orgs.find((o) => o.slug === 'test-org-phase3');
    if (!testOrg) {
      testOrg = await platformRepository.createOrganization({
        name: 'Phase 3 Test Org',
        slug: 'test-org-phase3',
        billingEmail: 'phase3@orbitox.io',
      });
    }
  });

  describe('Part A: Provisioning Shortcuts Fixes', () => {
    it('refuses project creation if organisation cannot be resolved (no org_default)', async () => {
      await assert.rejects(
        async () => {
          await platformRepository.createProject({
            name: 'No Org Project',
            slug: `no-org-${Date.now()}`,
            organizationId: 'non-existent-org-id-99999',
            businessModel: 'HEALTHCARE_NETWORK',
            planTier: 'growth',
            technicalLead: 'Lead Dev',
            contactEmail: 'dev@test.io',
          });
        },
        /(cannot be resolved|not found)/i,
        'Must refuse creation if organization cannot be resolved'
      );
    });

    it('businessModel guessing is removed: businessModel does NOT grant or create PluginInstallation rows', async () => {
      const projSlug = `hms-model-test-${Date.now()}`;
      const res = await platformRepository.createProject({
        name: 'Healthcare Proj',
        slug: projSlug,
        organizationId: testOrg.id,
        businessModel: 'HEALTHCARE_NETWORK',
        planTier: 'growth',
        technicalLead: 'Lead Dev',
        contactEmail: 'dev@test.io',
      });

      assert.ok(res.project, 'Project created');
      const canonicalTenantId = `org/${testOrg.slug}/project/${projSlug}/environment/production`;

      // Check no installations were created automatically
      const hmsInst = await platformRepository.getPluginInstallation(canonicalTenantId, '@orbitox/hms');
      const restInst = await platformRepository.getPluginInstallation(canonicalTenantId, '@orbitox/restaurant');
      assert.strictEqual(hmsInst, undefined, 'HospitalOS installation must NOT be created from businessModel');
      assert.strictEqual(restInst, undefined, 'RestaurantOS installation must NOT be created from businessModel');
    });

    it('creates project and explicit plugin installations in one transaction with canonical tenantId and outbox row', async () => {
      const projSlug = `tx-proj-${Date.now()}`;
      const res = await platformRepository.createProject({
        name: 'Transactional Proj',
        slug: projSlug,
        organizationId: testOrg.id,
        businessModel: 'B2B_SaaS',
        planTier: 'starter',
        technicalLead: 'Lead Dev',
        contactEmail: 'dev@test.io',
        plugins: [
          { pluginId: '@orbitox/restaurant', planId: 'restaurant-starter' },
        ],
      });

      const canonicalTenantId = `org/${testOrg.slug}/project/${projSlug}/environment/production`;
      const inst = await platformRepository.getPluginInstallation(canonicalTenantId, '@orbitox/restaurant');
      assert.ok(inst, 'Installation must exist');
      assert.strictEqual(inst.tenantId, canonicalTenantId, 'tenantId must store canonical platform tenant ID');
      assert.strictEqual(inst.status, 'ACTIVE');
      assert.strictEqual(inst.entitlementRevision, 1);
      assert.strictEqual(inst.planId, 'restaurant-starter');

      // Check outbox row written
      const outbox = await platformRepository.listOutboxMessages();
      const matchingOutbox = outbox.find(
        (m) => m.tenantId === canonicalTenantId && m.aggregateId === inst.id && m.eventType === 'entitlement.updated'
      );
      assert.ok(matchingOutbox, 'Outbox row must be recorded in the same transaction');
    });

    it('lookups use tenantId strictly and do NOT match by runtimeTenantId', async () => {
      const tenantIdA = `org/test-org-phase3/project/tenant-lookup-a-${Date.now()}/environment/production`;
      const sharedRuntime = `org/test-org-phase3/project/runtime-shared-${Date.now()}/environment/production`;

      await platformRepository.provisionPluginInstallation({
        tenantId: tenantIdA,
        pluginId: '@orbitox/restaurant',
        runtimeTenantId: sharedRuntime,
        status: 'ACTIVE',
        planId: 'restaurant-starter',
      });

      // Searching by sharedRuntime as tenantId should return undefined if tenantId doesn't match
      const notFound = await platformRepository.getPluginInstallation(
        `org/test-org-phase3/project/non-existent-tenant/environment/production`,
        '@orbitox/restaurant'
      );
      assert.strictEqual(notFound, undefined, 'Must not return installation for a non-matching tenantId');

      const found = await platformRepository.getPluginInstallation(tenantIdA, '@orbitox/restaurant');
      assert.ok(found, 'Must find installation by canonical tenantId');
      assert.strictEqual(found.tenantId, tenantIdA);
    });

    it('anti-claim: two tenants cannot claim the same runtime tenant for the same plugin', async () => {
      const tenantA = `org/test-org-phase3/project/claim-a-${Date.now()}/environment/production`;
      const tenantB = `org/test-org-phase3/project/claim-b-${Date.now()}/environment/production`;
      const sharedRuntime = `org/test-org-phase3/project/shared-runtime-${Date.now()}/environment/production`;

      // First tenant claims it
      await platformRepository.provisionPluginInstallation({
        tenantId: tenantA,
        pluginId: '@orbitox/hms',
        runtimeTenantId: sharedRuntime,
        status: 'ACTIVE',
        planId: 'hms-starter',
      });

      // Second tenant attempts to claim same runtimeTenantId
      await assert.rejects(
        async () => {
          await platformRepository.provisionPluginInstallation({
            tenantId: tenantB,
            pluginId: '@orbitox/hms',
            runtimeTenantId: sharedRuntime,
            status: 'ACTIVE',
            planId: 'hms-starter',
          });
        },
        (err: any) => {
          return err.code === 'RUNTIME_TENANT_ALREADY_CLAIMED' || /already claimed/i.test(err.message);
        },
        'Second tenant claiming same runtimeTenantId must fail with RUNTIME_TENANT_ALREADY_CLAIMED'
      );
    });

    it('provisioning never overwrites an existing runtimeTenantId', async () => {
      const tenantId = `org/test-org-phase3/project/no-overwrite-${Date.now()}/environment/production`;
      const initialRuntime = `org/test-org-phase3/project/runtime-init-${Date.now()}/environment/production`;
      const alteredRuntime = `org/test-org-phase3/project/runtime-alt-${Date.now()}/environment/production`;

      await platformRepository.provisionPluginInstallation({
        tenantId,
        pluginId: '@orbitox/restaurant',
        runtimeTenantId: initialRuntime,
        status: 'ACTIVE',
        planId: 'restaurant-starter',
      });

      await assert.rejects(
        async () => {
          await platformRepository.provisionPluginInstallation({
            tenantId,
            pluginId: '@orbitox/restaurant',
            runtimeTenantId: alteredRuntime,
            status: 'ACTIVE',
          });
        },
        /cannot overwrite existing runtimeTenantId/i,
        'Must reject attempt to overwrite runtimeTenantId'
      );
    });

    it('provisioning never turns ARCHIVED back to ACTIVE (ARCHIVED_RESURRECTION_REFUSED)', async () => {
      const tenantId = `org/test-org-phase3/project/archive-resurrect-${Date.now()}/environment/production`;

      await platformRepository.provisionPluginInstallation({
        tenantId,
        pluginId: '@orbitox/restaurant',
        runtimeTenantId: tenantId,
        status: 'ACTIVE',
        planId: 'restaurant-starter',
      });

      // Uninstall (archives the row)
      const uninstalled = await platformRepository.uninstallPluginInstallation(tenantId, '@orbitox/restaurant');
      assert.strictEqual(uninstalled.status, 'ARCHIVED');

      // Attempt to re-provision via normal provisioning flow
      await assert.rejects(
        async () => {
          await platformRepository.provisionPluginInstallation({
            tenantId,
            pluginId: '@orbitox/restaurant',
            runtimeTenantId: tenantId,
            status: 'ACTIVE',
          });
        },
        (err: any) => {
          return err.code === 'ARCHIVED_RESURRECTION_REFUSED' || /ARCHIVED/i.test(err.message);
        },
        'Re-provisioning an ARCHIVED installation must be refused with ARCHIVED_RESURRECTION_REFUSED'
      );
    });

    it('explicit audited admin action reactivates ARCHIVED installation to ACTIVE', async () => {
      const tenantId = `org/test-org-phase3/project/admin-reactivate-${Date.now()}/environment/production`;

      await platformRepository.provisionPluginInstallation({
        tenantId,
        pluginId: '@orbitox/hms',
        runtimeTenantId: tenantId,
        status: 'ACTIVE',
        planId: 'hms-starter',
      });

      await platformRepository.uninstallPluginInstallation(tenantId, '@orbitox/hms');
      const archived = await platformRepository.getPluginInstallation(tenantId, '@orbitox/hms');
      assert.strictEqual(archived?.status, 'ARCHIVED');
      const revBefore = archived.entitlementRevision;

      // Reactivate via admin method
      const reactivated = await platformRepository.reactivatePluginInstallation(
        tenantId,
        '@orbitox/hms',
        { actorId: 'admin_123', actorEmail: 'admin@orbitox.io', reason: 'Customer renewed subscription' }
      );

      assert.strictEqual(reactivated.status, 'ACTIVE');
      assert.strictEqual(reactivated.entitlementRevision, revBefore + 1, 'Revision must be bumped');

      // Check outbox row recorded
      const outbox = await platformRepository.listOutboxMessages();
      const reactivationMsg = outbox.find(
        (m) => m.tenantId === tenantId && m.aggregateId === reactivated.id && m.payload.reactivatedBy === 'admin@orbitox.io'
      );
      assert.ok(reactivationMsg, 'Reactivation outbox row must exist with admin metadata');
    });
  });

  describe('Part B: Plan Catalogue', () => {
    it('seeds default plans for HMS and RestaurantOS with correct features and quotas', async () => {
      const hmsStarter = await platformRepository.getPlan('hms-starter');
      assert.ok(hmsStarter, 'hms-starter plan must exist');
      assert.strictEqual(hmsStarter.pluginId, '@orbitox/hms');
      assert.strictEqual(hmsStarter.tier, 'starter');
      assert.ok(hmsStarter.features.some((f) => f.featureKey === 'appointments'), 'Should have appointments feature');
      assert.ok(hmsStarter.quotas.some((q) => q.quotaKey === 'beds' && q.limit === 20), 'Should have 20 beds quota');

      const hmsPro = await platformRepository.getPlan('hms-pro');
      assert.ok(hmsPro, 'hms-pro plan must exist');
      assert.ok(hmsPro.quotas.some((q) => q.quotaKey === 'beds' && q.limit === 500), 'Pro beds quota should be 500');

      const restStarter = await platformRepository.getPlan('restaurant-starter');
      assert.ok(restStarter, 'restaurant-starter plan must exist');
      assert.strictEqual(restStarter.pluginId, '@orbitox/restaurant');
      assert.ok(restStarter.quotas.some((q) => q.quotaKey === 'tables' && q.limit === 15), 'Starter tables quota is 15');

      const restPro = await platformRepository.getPlan('restaurant-pro');
      assert.ok(restPro, 'restaurant-pro plan must exist');
      assert.ok(restPro.quotas.some((q) => q.quotaKey === 'tables' && q.limit === 200), 'Pro tables quota is 200');
    });

    it('updating a plan bumps the revision of every affected installation and writes an outbox row', async () => {
      const tenant1 = `org/test-org-phase3/project/plan-rev-1-${Date.now()}/environment/production`;
      const tenant2 = `org/test-org-phase3/project/plan-rev-2-${Date.now()}/environment/production`;

      // Create a unique plan for testing
      const customPlanId = `custom-plan-${Date.now()}`;
      await platformRepository.createPlan({
        planId: customPlanId,
        pluginId: '@orbitox/restaurant',
        name: 'Custom Test Plan',
        tier: 'starter',
        priceMinor: 499900,
        features: [{ featureKey: 'qr-ordering', enabled: true }],
        quotas: [{ quotaKey: 'tables', limit: 10, window: 'none' }],
      });

      // Install plan onto two tenants
      const inst1 = await platformRepository.provisionPluginInstallation({
        tenantId: tenant1,
        pluginId: '@orbitox/restaurant',
        runtimeTenantId: tenant1,
        status: 'ACTIVE',
        planId: customPlanId,
      });

      const inst2 = await platformRepository.provisionPluginInstallation({
        tenantId: tenant2,
        pluginId: '@orbitox/restaurant',
        runtimeTenantId: tenant2,
        status: 'ACTIVE',
        planId: customPlanId,
      });

      const rev1Before = inst1.entitlementRevision;
      const rev2Before = inst2.entitlementRevision;

      // Admin updates the plan
      await platformRepository.updatePlan(customPlanId, {
        priceMinor: 599900,
        quotas: [{ quotaKey: 'tables', limit: 25, window: 'none' }],
      });

      // Verify both installations had their revisions bumped
      const inst1After = await platformRepository.getPluginInstallation(tenant1, '@orbitox/restaurant');
      const inst2After = await platformRepository.getPluginInstallation(tenant2, '@orbitox/restaurant');

      assert.strictEqual(inst1After?.entitlementRevision, rev1Before + 1, 'Tenant 1 revision must be bumped');
      assert.strictEqual(inst2After?.entitlementRevision, rev2Before + 1, 'Tenant 2 revision must be bumped');

      // Verify outbox rows written for both tenants
      const outbox = await platformRepository.listOutboxMessages();
      const outbox1 = outbox.find((m) => m.tenantId === tenant1 && m.payload.reason === 'plan.updated');
      const outbox2 = outbox.find((m) => m.tenantId === tenant2 && m.payload.reason === 'plan.updated');

      assert.ok(outbox1, 'Outbox message for Tenant 1 must be emitted on plan update');
      assert.ok(outbox2, 'Outbox message for Tenant 2 must be emitted on plan update');
    });

    it('prohibits plan deletion via DELETE endpoint with 405 PLAN_DELETION_PROHIBITED', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/platform/plans/hms-starter', {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${TEST_ADMIN_TOKEN}`,
        },
      });
      const res = await deletePlan(req);
      assert.strictEqual(res.status, 405);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, 'PLAN_DELETION_PROHIBITED');
    });

    it('PATCH /api/v1/platform/plans/[planId] records platform-admin audit with old and new values', async () => {
      const planBefore = await platformRepository.getPlan('restaurant-starter');
      assert.ok(planBefore);

      const req = new NextRequest('http://localhost:3000/api/v1/platform/plans/restaurant-starter', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${TEST_ADMIN_TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          priceMinor: 349900,
        }),
      });
      const res = await patchPlan(req);
      assert.strictEqual(res.status, 200);

      if (platformRepository.isPrismaBacked()) {
        const audits = await listAuditEvents('restaurant-starter');
        const lastAudit: any = audits.find((a: any) => a.action === 'PLAN_UPDATED' && a.entityId === 'restaurant-starter');
        assert.ok(lastAudit, 'Audit record for PLAN_UPDATED must exist');
        assert.ok(lastAudit.metadata?.old, 'Audit record must capture old plan state');
        assert.ok(lastAudit.metadata?.new, 'Audit record must capture new plan state');
        assert.strictEqual(lastAudit.metadata?.new?.priceMinor, 349900);
      } else {
        const audits = PlatformRepository.listAuditEvents();
        const lastAudit: any = audits.find((a: any) => a.action === 'PLAN_UPDATED' && a.entityId === 'restaurant-starter');
        assert.ok(lastAudit, 'Audit record for PLAN_UPDATED must exist');
        assert.ok(lastAudit.metadata?.old, 'Audit record must capture old plan state');
        assert.ok(lastAudit.metadata?.new, 'Audit record must capture new plan state');
        assert.strictEqual(lastAudit.metadata?.new?.priceMinor, 349900);
      }
    });

    it('outbox relay role can list and update outbox messages', async () => {
      if (platformRepository.isPrismaBacked()) {
        const currentUser = await platformRepository.getOutboxRelayCurrentUser?.();
        assert.strictEqual(currentUser, 'orbitox_outbox_relay', 'Existing test must run queries as orbitox_outbox_relay role');
      }

      const msg = await platformRepository.recordOutboxMessage({
        tenantId: `org/test-org-phase3/project/outbox-relay-test/environment/production`,
        eventType: 'entitlement.test',
        aggregateType: 'PluginInstallation',
        aggregateId: 'test-agg-1',
        payload: { test: true },
      });
      assert.ok(msg.id);
      assert.strictEqual(msg.status, 'PENDING');

      const pending = await platformRepository.listOutboxMessages('PENDING');
      const found = pending.find((m: any) => m.id === msg.id);
      assert.ok(found, 'Outbox message must be listed');

      await platformRepository.updateOutboxMessage(msg.id, {
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
      });

      const updatedList = await platformRepository.listOutboxMessages('DISPATCHED');
      const updated = updatedList.find((m: any) => m.id === msg.id);
      assert.ok(updated, 'Outbox message status should be DISPATCHED');
      assert.ok(updated.dispatchedAt, 'Dispatched timestamp should be set');
    });

    it('PostgreSQL RLS: runtime with tenant A set sees only A outbox rows, and sees 0 rows with no tenant set', async () => {
      if (!platformRepository.isPrismaBacked()) return;

      const ownerUrl = process.env.TEST_OWNER_DATABASE_URL || process.env.TEST_DATABASE_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres:') ? process.env.DATABASE_URL : undefined) || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
      const runtimeUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';

      const ownerPrisma = new PrismaClient({ datasources: { db: { url: ownerUrl } } });
      const runtimePrisma = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });

      const tenantA = `org/test-org-phase3/project/rls-tenant-a-${Date.now()}/environment/production`;
      const tenantB = `org/test-org-phase3/project/rls-tenant-b-${Date.now()}/environment/production`;
      const idA = `outbox_rls_a_${crypto.randomUUID()}`;
      const idB = `outbox_rls_b_${crypto.randomUUID()}`;

      try {
        await ownerPrisma.platformOutboxMessage.createMany({
          data: [
            {
              id: idA,
              tenantId: tenantA,
              eventType: 'rls.test.a',
              aggregateType: 'PluginInstallation',
              aggregateId: 'agg-a',
              payload: { tenant: 'A' },
              status: 'PENDING',
              retryCount: 0,
            },
            {
              id: idB,
              tenantId: tenantB,
              eventType: 'rls.test.b',
              aggregateType: 'PluginInstallation',
              aggregateId: 'agg-b',
              payload: { tenant: 'B' },
              status: 'PENDING',
              retryCount: 0,
            },
          ],
        });

        // 1. With NO tenant set: runtime sees 0 rows
        const noTenantRows = await runtimePrisma.platformOutboxMessage.findMany({
          where: { id: { in: [idA, idB] } },
        });
        assert.strictEqual(noTenantRows.length, 0, 'orbitox_runtime with no tenant set must see 0 outbox rows');

        await runtimePrisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '', true);`);
          const rows = await tx.platformOutboxMessage.findMany({
            where: { id: { in: [idA, idB] } },
          });
          assert.strictEqual(rows.length, 0, 'orbitox_runtime with empty tenant context must see 0 outbox rows');
        });

        // 2. With tenant A set: runtime sees only A outbox rows
        await runtimePrisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantA}', true);`);
          const rows = await tx.platformOutboxMessage.findMany({
            where: { id: { in: [idA, idB] } },
          });
          assert.strictEqual(rows.length, 1, 'orbitox_runtime with tenant A set must see only A outbox rows');
          assert.strictEqual(rows[0]?.id, idA);
          assert.strictEqual(rows[0]?.tenantId, tenantA);
        });

        // 3. With tenant B set: runtime sees only B outbox rows
        await runtimePrisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantB}', true);`);
          const rows = await tx.platformOutboxMessage.findMany({
            where: { id: { in: [idA, idB] } },
          });
          assert.strictEqual(rows.length, 1, 'orbitox_runtime with tenant B set must see only B outbox rows');
          assert.strictEqual(rows[0]?.id, idB);
          assert.strictEqual(rows[0]?.tenantId, tenantB);
        });
      } finally {
        await ownerPrisma.platformOutboxMessage.deleteMany({
          where: { id: { in: [idA, idB] } },
        });
        await ownerPrisma.$disconnect();
        await runtimePrisma.$disconnect();
      }
    });

    it('PostgreSQL Permissions: relay role can SELECT all rows and UPDATE status/retryCount/lastError/dispatchedAt', async () => {
      if (!platformRepository.isPrismaBacked()) return;

      const ownerUrl = process.env.TEST_OWNER_DATABASE_URL || process.env.TEST_DATABASE_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres:') ? process.env.DATABASE_URL : undefined) || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
      const relayUrl = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay@127.0.0.1:5432/orbitox_phase2';

      const ownerPrisma = new PrismaClient({ datasources: { db: { url: ownerUrl } } });
      const relayPrisma = new PrismaClient({ datasources: { db: { url: relayUrl } } });

      const tenantA = `org/test-org-phase3/project/relay-b-a-${Date.now()}/environment/production`;
      const tenantB = `org/test-org-phase3/project/relay-b-b-${Date.now()}/environment/production`;
      const idA = `outbox_relay_b_a_${crypto.randomUUID()}`;
      const idB = `outbox_relay_b_b_${crypto.randomUUID()}`;

      try {
        const userRows = await relayPrisma.$queryRaw<Array<{ current_user: string }>>`SELECT current_user`;
        assert.strictEqual(userRows[0]?.current_user, 'orbitox_outbox_relay', 'Must connect as orbitox_outbox_relay');

        await ownerPrisma.platformOutboxMessage.createMany({
          data: [
            {
              id: idA,
              tenantId: tenantA,
              eventType: 'relay.test.a',
              aggregateType: 'PluginInstallation',
              aggregateId: 'agg-a',
              payload: { tenant: 'A' },
              status: 'PENDING',
              retryCount: 0,
            },
            {
              id: idB,
              tenantId: tenantB,
              eventType: 'relay.test.b',
              aggregateType: 'PluginInstallation',
              aggregateId: 'agg-b',
              payload: { tenant: 'B' },
              status: 'PENDING',
              retryCount: 0,
            },
          ],
        });

        // 1. SELECT all rows across tenants without tenant scoping
        const allRows = await relayPrisma.platformOutboxMessage.findMany({
          where: { id: { in: [idA, idB] } },
          orderBy: { id: 'asc' },
        });
        assert.strictEqual(allRows.length, 2, 'orbitox_outbox_relay must be able to SELECT all rows across tenants');

        // 2. UPDATE allowed columns: status, retryCount, lastError, dispatchedAt
        const dispatchedAt = new Date();
        const updatedRow = await relayPrisma.platformOutboxMessage.update({
          where: { id: idA },
          data: {
            status: 'DISPATCHED',
            retryCount: 2,
            lastError: 'Simulated network hiccup',
            dispatchedAt,
          },
        });
        assert.strictEqual(updatedRow.status, 'DISPATCHED');
        assert.strictEqual(updatedRow.retryCount, 2);
        assert.strictEqual(updatedRow.lastError, 'Simulated network hiccup');
        assert.ok(updatedRow.dispatchedAt);
      } finally {
        await ownerPrisma.platformOutboxMessage.deleteMany({
          where: { id: { in: [idA, idB] } },
        });
        await ownerPrisma.$disconnect();
        await relayPrisma.$disconnect();
      }
    });

    it('PostgreSQL Permissions: relay role gets permission denied on INSERT, DELETE and UPDATE of payload', async () => {
      if (!platformRepository.isPrismaBacked()) return;

      const ownerUrl = process.env.TEST_OWNER_DATABASE_URL || process.env.TEST_DATABASE_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres:') ? process.env.DATABASE_URL : undefined) || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
      const relayUrl = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay@127.0.0.1:5432/orbitox_phase2';

      const ownerPrisma = new PrismaClient({ datasources: { db: { url: ownerUrl } } });
      const relayPrisma = new PrismaClient({ datasources: { db: { url: relayUrl } } });

      const tenantA = `org/test-org-phase3/project/relay-c-${Date.now()}/environment/production`;
      const idA = `outbox_relay_c_${crypto.randomUUID()}`;

      try {
        const userRows = await relayPrisma.$queryRaw<Array<{ current_user: string }>>`SELECT current_user`;
        assert.strictEqual(userRows[0]?.current_user, 'orbitox_outbox_relay', 'Must connect as orbitox_outbox_relay');

        // 1. Permission denied on INSERT
        await assert.rejects(
          async () => {
            await relayPrisma.platformOutboxMessage.create({
              data: {
                id: `outbox_illegal_insert_${crypto.randomUUID()}`,
                tenantId: tenantA,
                eventType: 'illegal.insert',
                aggregateType: 'PluginInstallation',
                aggregateId: 'agg-1',
                payload: { malicious: true },
                status: 'PENDING',
                retryCount: 0,
              },
            });
          },
          (err: any) => {
            return err.message?.includes('permission denied') || err.code === '42501';
          },
          'orbitox_outbox_relay must receive permission denied on INSERT'
        );

        await ownerPrisma.platformOutboxMessage.create({
          data: {
            id: idA,
            tenantId: tenantA,
            eventType: 'relay.test.c',
            aggregateType: 'PluginInstallation',
            aggregateId: 'agg-c',
            payload: { safe: true },
            status: 'PENDING',
            retryCount: 0,
          },
        });

        // 2. Permission denied on DELETE
        await assert.rejects(
          async () => {
            await relayPrisma.platformOutboxMessage.delete({
              where: { id: idA },
            });
          },
          (err: any) => {
            return err.message?.includes('permission denied') || err.code === '42501';
          },
          'orbitox_outbox_relay must receive permission denied on DELETE'
        );

        // 3. Permission denied on UPDATE of payload
        await assert.rejects(
          async () => {
            await relayPrisma.platformOutboxMessage.update({
              where: { id: idA },
              data: {
                payload: { tampered: true },
              },
            });
          },
          (err: any) => {
            return err.message?.includes('permission denied') || err.code === '42501';
          },
          'orbitox_outbox_relay must receive permission denied on UPDATE of payload'
        );
      } finally {
        await ownerPrisma.platformOutboxMessage.deleteMany({
          where: { id: idA },
        });
        await ownerPrisma.$disconnect();
        await relayPrisma.$disconnect();
      }
    });
  });

  describe('Part C: Entitlement Engine & State Transitions', () => {
    it('validates legal lifecycle transitions: REQUESTED -> PROVISIONING -> ACTIVE -> READ_ONLY -> SUSPENDED -> DEPROVISIONING -> ARCHIVED', async () => {
      const tenantId = `org/test-org-phase3/project/state-machine-${Date.now()}/environment/production`;

      // 1. Initial creation as REQUESTED
      const s1 = await platformRepository.provisionPluginInstallation({
        tenantId,
        pluginId: '@orbitox/restaurant',
        runtimeTenantId: tenantId,
        status: 'REQUESTED',
        planId: 'restaurant-starter',
      });
      assert.strictEqual(s1.status, 'REQUESTED');
      assert.strictEqual(s1.entitlementRevision, 1);

      // 2. REQUESTED -> PROVISIONING
      const s2 = await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/restaurant', 'PROVISIONING');
      assert.strictEqual(s2.status, 'PROVISIONING');
      assert.strictEqual(s2.entitlementRevision, 2);

      // 3. PROVISIONING -> ACTIVE
      const s3 = await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/restaurant', 'ACTIVE');
      assert.strictEqual(s3.status, 'ACTIVE');
      assert.strictEqual(s3.entitlementRevision, 3);

      // 4. ACTIVE -> READ_ONLY (e.g. payment grace period)
      const s4 = await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/restaurant', 'READ_ONLY');
      assert.strictEqual(s4.status, 'READ_ONLY');
      assert.strictEqual(s4.entitlementRevision, 4);

      // 5. READ_ONLY -> ACTIVE (payment recovered)
      const s5 = await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/restaurant', 'ACTIVE');
      assert.strictEqual(s5.status, 'ACTIVE');
      assert.strictEqual(s5.entitlementRevision, 5);

      // 6. ACTIVE -> SUSPENDED (payment failed after grace period)
      const s6 = await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/restaurant', 'SUSPENDED');
      assert.strictEqual(s6.status, 'SUSPENDED');
      assert.strictEqual(s6.entitlementRevision, 6);

      // 7. SUSPENDED -> DEPROVISIONING
      const s7 = await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/restaurant', 'DEPROVISIONING');
      assert.strictEqual(s7.status, 'DEPROVISIONING');
      assert.strictEqual(s7.entitlementRevision, 7);

      // 8. DEPROVISIONING -> ARCHIVED
      const s8 = await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/restaurant', 'ARCHIVED');
      assert.strictEqual(s8.status, 'ARCHIVED');
      assert.strictEqual(s8.entitlementRevision, 8);
    });

    it('checkQuotaUsage fails closed on missing installation, missing plan, or non-active status', async () => {
      const nonExistentTenant = `org/test-org-phase3/project/non-existent-${Date.now()}/environment/production`;

      // 1. Missing installation fails closed
      const uninstalledCheck = await platformRepository.checkQuotaUsage(
        nonExistentTenant,
        '@orbitox/hms',
        'beds',
        0,
        1
      );
      assert.strictEqual(uninstalledCheck.allowed, false, 'Uninstalled plugin must fail closed');
      assert.strictEqual(uninstalledCheck.reason, 'NOT_INSTALLED');

      // 2. Suspended installation fails closed
      const suspendedTenant = `org/test-org-phase3/project/suspended-check-${Date.now()}/environment/production`;
      await platformRepository.provisionPluginInstallation({
        tenantId: suspendedTenant,
        pluginId: '@orbitox/hms',
        runtimeTenantId: suspendedTenant,
        status: 'ACTIVE',
        planId: 'hms-starter',
      });
      await platformRepository.updatePluginInstallationStatus(suspendedTenant, '@orbitox/hms', 'SUSPENDED');

      const suspendedCheck = await platformRepository.checkQuotaUsage(
        suspendedTenant,
        '@orbitox/hms',
        'beds',
        5,
        1
      );
      assert.strictEqual(suspendedCheck.allowed, false, 'Suspended installation must fail closed');
      assert.strictEqual(suspendedCheck.reason, 'INSTALLATION_SUSPENDED');

      // 3. READ_ONLY installation allows read (+0) but blocks write (+1)
      const readOnlyTenant = `org/test-org-phase3/project/readonly-check-${Date.now()}/environment/production`;
      await platformRepository.provisionPluginInstallation({
        tenantId: readOnlyTenant,
        pluginId: '@orbitox/hms',
        runtimeTenantId: readOnlyTenant,
        status: 'ACTIVE',
        planId: 'hms-starter',
      });
      await platformRepository.updatePluginInstallationStatus(readOnlyTenant, '@orbitox/hms', 'READ_ONLY');

      const readOnlyWriteCheck = await platformRepository.checkQuotaUsage(
        readOnlyTenant,
        '@orbitox/hms',
        'beds',
        5,
        1
      );
      assert.strictEqual(readOnlyWriteCheck.allowed, false, 'READ_ONLY write must fail closed');
      assert.strictEqual(readOnlyWriteCheck.reason, 'READ_ONLY');

      const readOnlyReadCheck = await platformRepository.checkQuotaUsage(
        readOnlyTenant,
        '@orbitox/hms',
        'beds',
        5,
        0
      );
      assert.strictEqual(readOnlyReadCheck.allowed, true, 'READ_ONLY read must succeed');
    });

    it('rejects illegal state transitions with InvalidStateTransitionError', async () => {
      const tenantId = `org/test-org-phase3/project/illegal-transition-${Date.now()}/environment/production`;

      await platformRepository.provisionPluginInstallation({
        tenantId,
        pluginId: '@orbitox/hms',
        runtimeTenantId: tenantId,
        status: 'REQUESTED',
        planId: 'hms-starter',
      });

      // Illegal: REQUESTED -> ACTIVE directly (skipping PROVISIONING)
      await assert.rejects(
        async () => {
          await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/hms', 'ACTIVE');
        },
        (err: any) => {
          return err instanceof InvalidStateTransitionError || err.code === 'INVALID_STATE_TRANSITION' || /Illegal/i.test(err.message);
        },
        'REQUESTED -> ACTIVE without PROVISIONING must be rejected'
      );

      // Transition to PROVISIONING then ACTIVE
      await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/hms', 'PROVISIONING');
      await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/hms', 'ACTIVE');
      await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/hms', 'SUSPENDED');

      // Illegal: SUSPENDED -> READ_ONLY (must resume to ACTIVE first)
      await assert.rejects(
        async () => {
          await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/hms', 'READ_ONLY');
        },
        (err: any) => {
          return err instanceof InvalidStateTransitionError || err.code === 'INVALID_STATE_TRANSITION' || /Illegal/i.test(err.message);
        },
        'SUSPENDED -> READ_ONLY directly must be rejected'
      );
    });

    it('downgrade keeps existing data, bumps revision, and blocks over-limit writes while reads still succeed', async () => {
      const tenantId = `org/test-org-phase3/project/downgrade-quota-${Date.now()}/environment/production`;

      // Start on hms-pro (beds limit: 500)
      const inst = await platformRepository.provisionPluginInstallation({
        tenantId,
        pluginId: '@orbitox/hms',
        runtimeTenantId: tenantId,
        status: 'ACTIVE',
        planId: 'hms-pro',
      });

      const revBefore = inst.entitlementRevision;

      // Simulate tenant already having 35 beds in their system
      const currentBeds = 35;

      // Check quota under Pro plan: write 1 bed should be allowed
      const checkUnderPro = await platformRepository.checkQuotaUsage(
        tenantId,
        '@orbitox/hms',
        'beds',
        currentBeds,
        1
      );
      assert.strictEqual(checkUnderPro.allowed, true, 'Write under pro plan must be allowed');

      // Downgrade tenant to hms-starter (beds limit: 20)
      const downgraded = await platformRepository.changePluginInstallationPlan(tenantId, '@orbitox/hms', 'hms-starter');
      assert.strictEqual(downgraded.planId, 'hms-starter');
      assert.strictEqual(downgraded.entitlementRevision, revBefore + 1, 'Downgrade must bump revision');

      // Part C: Downgrades never delete data. Over-limit writes are refused, and reads still work.
      // 1. Over-limit write (current: 35, limit: 20, requested: +1)
      const checkWriteOverLimit = await platformRepository.checkQuotaUsage(
        tenantId,
        '@orbitox/hms',
        'beds',
        currentBeds,
        1
      );
      assert.strictEqual(checkWriteOverLimit.allowed, false, 'Over-limit write must be refused');
      assert.ok(checkWriteOverLimit.reason?.includes('QUOTA_EXCEEDED'), 'Reason should be QUOTA_EXCEEDED');

      // 2. Read operation (requestedIncrement = 0)
      const checkReadOverLimit = await platformRepository.checkQuotaUsage(
        tenantId,
        '@orbitox/hms',
        'beds',
        currentBeds,
        0
      );
      assert.strictEqual(checkReadOverLimit.allowed, true, 'Reads must still succeed when over quota');
    });
  });
});
