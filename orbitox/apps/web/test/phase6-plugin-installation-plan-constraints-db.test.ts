import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';

if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'prisma') {
  describe('PluginInstallation catalogue plan constraints', () => {
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL is required.');
    }

    const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const id = `plan_constraint_${crypto.randomUUID().replaceAll('-', '')}`;

    after(async () => {
      await prisma.pluginInstallation.deleteMany({ where: { id } });
      await prisma.$disconnect();
    });

    it('rejects unknown and cross-plugin plan IDs at the database boundary', async () => {
      await prisma.pluginInstallation.create({
        data: {
          id,
          tenantId: `org/plan-constraint/project/${id}/environment/test`,
          runtimeTenantId: `plan-constraint-${id}`,
          pluginId: '@orbitox/restaurant',
          planId: 'restaurant-starter',
        },
      });

      await assert.rejects(
        prisma.pluginInstallation.update({
          where: { id },
          data: { planId: 'growth' },
        }),
      );
      await assert.rejects(
        prisma.pluginInstallation.update({
          where: { id },
          data: { planId: 'hms-starter' },
        }),
      );

      const installation = await prisma.pluginInstallation.findUniqueOrThrow({ where: { id } });
      assert.equal(installation.planId, 'restaurant-starter');
    });
  });
}
