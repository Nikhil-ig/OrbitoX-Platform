import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { platformRepository } from '../lib/platform-repository';

describe('Correction B1.3: Atomic Previous-Value Under Concurrent Billable Load', () => {
  it('captures the exact atomic previous value under concurrent increments', async () => {
    // If not Prisma-backed, test contract on JSON adapter
    if (!platformRepository.isPrismaBacked()) {
      const org = await platformRepository.createOrganization({
        name: 'Concurrent Org JSON',
        slug: `concurrent-org-json-${randomUUID()}`,
        billingEmail: 'test-json@example.com',
      });
      const created = await platformRepository.createProject({
        name: 'Concurrent Project JSON',
        slug: `concurrent-project-json-${randomUUID()}`,
        organizationId: org.id,
        businessModel: 'B2B_SAAS',
        planTier: 'starter',
        technicalLead: 'Test Lead',
        contactEmail: 'test@example.com',
      });
      const projectId = created.project.id;

      // Seed with initial usage
      await platformRepository.recordBillableCall(projectId, 42);

      const intentId = await platformRepository.createPlatformAdminAuditIntent({
        action: 'project.usage.reset',
        entityType: 'PLATFORM_PROJECT_USAGE',
        entityId: projectId,
        organizationId: org.id,
        projectId,
        actorId: 'admin',
        metadata: { initialEstimate: 42, newValue: 0 },
      });

      const updated = await platformRepository.setProjectUsageWithAuditIntent(
        projectId,
        org.id,
        0,
        intentId,
      );

      assert.equal(updated?.monthlyApiCalls, 0);
      assert.equal(updated?.previousMonthlyApiCalls, 42);
      return;
    }

    // Real PostgreSQL concurrent transaction execution
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      return;
    }
    const owner = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

    try {
      const suffix = randomUUID();
      const org = await platformRepository.createOrganization({
        name: `Concurrent Test Org ${suffix}`,
        slug: `concurrent-org-${suffix}`,
        billingEmail: `billing-${suffix}@example.com`,
      });
      const created = await platformRepository.createProject({
        name: `Concurrent Test Project ${suffix}`,
        slug: `concurrent-project-${suffix}`,
        organizationId: org.id,
        businessModel: 'B2B_SAAS',
        planTier: 'enterprise',
        technicalLead: 'Concur Lead',
        contactEmail: `concur-${suffix}@example.com`,
      });
      const projectId = created.project.id;

      // Run 20 rounds of 50 concurrent increments to thoroughly test the race condition window
      for (let round = 1; round <= 20; round++) {
        // Set baseline usage
        await owner.platformProject.update({
          where: { id: projectId },
          data: { monthlyApiCalls: 100n },
        });

        const intentId = await platformRepository.createPlatformAdminAuditIntent({
          action: 'project.usage.reset',
          entityType: 'PLATFORM_PROJECT_USAGE',
          entityId: projectId,
          organizationId: org.id,
          projectId,
          actorId: 'admin-concur-test',
          metadata: { round, newValue: 0 },
        });

        // Launch 50 concurrent billable increments simultaneously with 1 reset operation
        const concurrentIncrements = 50;
        let resetResult: any;

        const incrementPromises = Array.from({ length: concurrentIncrements }, () =>
          platformRepository.recordBillableCall(projectId, 1)
        );

        const resetPromise = (async () => {
          // slight jitter to interleave with the increments
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
          resetResult = await platformRepository.setProjectUsageWithAuditIntent(
            projectId,
            org.id,
            0,
            intentId,
          );
        })();

        await Promise.all([...incrementPromises, resetPromise]);

        assert.ok(resetResult, 'Reset operation must succeed');
        assert.equal(resetResult.monthlyApiCalls, 0);

        // Verification 1: previousMonthlyApiCalls returned by the update must be >= 100
        const recordedPrev = resetResult.previousMonthlyApiCalls;
        assert.ok(
          recordedPrev >= 100 && recordedPrev <= 100 + concurrentIncrements,
          `previousMonthlyApiCalls (${recordedPrev}) must be between 100 and ${100 + concurrentIncrements}`
        );

        // Verification 2: The audit record in PostgreSQL must match the exact atomic previousMonthlyApiCalls
        const auditEvent = await owner.platformAuditEvent.findUnique({
          where: { id: intentId },
        });
        assert.equal(auditEvent?.status, 'COMMITTED');
        const auditPrevValue = (auditEvent?.metadata as any)?.previousValue;
        assert.equal(
          auditPrevValue,
          recordedPrev,
          `Audit ledger previousValue (${auditPrevValue}) must exactly match transaction previousMonthlyApiCalls (${recordedPrev})`
        );

        // Verification 3: The final monthlyApiCalls in the database must match exactly:
        // (total increments executed) - (increments that occurred before the reset lock)
        const finalProject = await owner.platformProject.findUnique({
          where: { id: projectId },
        });
        const finalUsage = Number(finalProject?.monthlyApiCalls);
        const expectedPostResetIncrements = 100 + concurrentIncrements - recordedPrev;
        assert.equal(
          finalUsage,
          expectedPostResetIncrements,
          `Final usage (${finalUsage}) must equal post-reset increments (${expectedPostResetIncrements})`
        );
      }

      // Cleanup
      await owner.platformAuditEvent.deleteMany({ where: { projectId } }).catch(() => undefined);
      await owner.platformProject.delete({ where: { id: projectId } }).catch(() => undefined);
      await owner.platformOrganization.delete({ where: { id: org.id } }).catch(() => undefined);
    } finally {
      await owner.$disconnect();
    }
  });
});
