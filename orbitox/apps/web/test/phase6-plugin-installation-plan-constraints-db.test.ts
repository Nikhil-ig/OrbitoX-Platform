import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';

function hasPostgresConstraintError(error: unknown, sqlState: string, message: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const knownError = error as {
    code?: unknown;
    meta?: { code?: unknown; message?: unknown };
  };
  return knownError.code === 'P2010' &&
    knownError.meta?.code === sqlState &&
    typeof knownError.meta.message === 'string' &&
    knownError.meta.message.includes(message);
}

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

    it('rejects unknown plan IDs with the catalogue foreign key', async () => {
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
        prisma.$executeRaw`
          UPDATE "PluginInstallation" SET "planId" = ${'growth'} WHERE "id" = ${id}
        `,
        (error) => hasPostgresConstraintError(
          error,
          '23503',
          'PluginInstallation_planId_fkey',
        ),
      );
    });

    it('rejects a plan owned by another plugin with the installation trigger', async () => {
      await assert.rejects(
        prisma.$executeRaw`
          UPDATE "PluginInstallation" SET "planId" = ${'hms-starter'} WHERE "id" = ${id}
        `,
        (error) => hasPostgresConstraintError(
          error,
          '23514',
          'Plan hms-starter belongs to plugin @orbitox/hms, not installation plugin @orbitox/restaurant',
        ),
      );

      const installation = await prisma.pluginInstallation.findUniqueOrThrow({ where: { id } });
      assert.equal(installation.planId, 'restaurant-starter');
    });
  });
}
