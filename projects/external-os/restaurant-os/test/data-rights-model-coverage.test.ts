import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  RESTAURANT_EXPORTED_MODELS,
  RESTAURANT_MODEL_DATA_RIGHTS,
  RESTAURANT_NON_CASCADE_TENANT_TABLES,
  RESTAURANT_REVIEWED_MODEL_EXCLUSIONS,
  TENANT_CASCADE_TABLES,
} from '../src/data-rights';

interface ParsedSchemaModel {
  name: string;
  hasTenantIdField: boolean;
  cascadesFromTenant: boolean;
}

function parsePrismaModels(schemaSource: string): ParsedSchemaModel[] {
  const models: ParsedSchemaModel[] = [];
  const regex = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(schemaSource)) !== null) {
    const name = match[1]!;
    const body = match[2]!;
    const hasTenantIdField = /^\s*tenantId\s+String\b/m.test(body);
    const cascadesFromTenant =
      /fields:\s*\[tenantId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade/.test(body);
    models.push({ name, hasTenantIdField, cascadesFromTenant });
  }
  return models;
}

const SECRET_COLUMN_DENY_LIST = new Set([
  'passwordhash',
  'pinhash',
  'salt',
  'mfatotpsealed',
  'mfatotppendingsealed',
  'tokenhash',
  'csrftokenhash',
  'sessiontoken',
  'authverifier',
  'secretfingerprint',
  'encryptedkeyid',
  'encryptedkeysecret',
  'encryptedwebhooksecret',
  'verificationtoken',
  'guestcapabilitytokens',
  'ordertoken',
  'razorpaysignature',
  'lastlifecyclekey',
]);

describe('RestaurantOS 6G G-2 Model Export & Erasure Completeness', () => {
  it('accounts for 100% of Prisma schema models from the single source of truth without secret columns', () => {
    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    const schemaSource = fs.readFileSync(schemaPath, 'utf8');
    const schemaModels = parsePrismaModels(schemaSource);
    assert.ok(schemaModels.length >= 25, `Expected at least 25 models in schema.prisma, found ${schemaModels.length}`);

    const registryByModel = new Map(RESTAURANT_MODEL_DATA_RIGHTS.map((m) => [m.model, m]));
    assert.equal(
      registryByModel.size,
      RESTAURANT_MODEL_DATA_RIGHTS.length,
      'Duplicate model names found in RESTAURANT_MODEL_DATA_RIGHTS',
    );

    const exportedSet = new Set(RESTAURANT_EXPORTED_MODELS);
    const cascadeSet = new Set<string>(TENANT_CASCADE_TABLES);
    const nonCascadeTenantSet = new Set<string>(RESTAURANT_NON_CASCADE_TENANT_TABLES);

    // 1. Every Prisma model must be registered cleanly
    for (const model of schemaModels) {
      const spec = registryByModel.get(model.name);
      assert.ok(spec, `Model "${model.name}" in schema.prisma is missing from RESTAURANT_MODEL_DATA_RIGHTS`);

      if (model.hasTenantIdField) {
        assert.equal(spec.tenantScoped, true, `Model "${model.name}" has tenantId and must set tenantScoped=true`);
        const isExported = exportedSet.has(model.name);
        const reason = RESTAURANT_REVIEWED_MODEL_EXCLUSIONS[model.name];
        assert.ok(
          isExported || (typeof reason === 'string' && reason.trim().length >= 15),
          `Tenant-linked model "${model.name}" is neither exported nor given a reviewed exclusion reason`,
        );
      }

      if (model.cascadesFromTenant) {
        assert.ok(
          cascadeSet.has(model.name),
          `Cascade model "${model.name}" is missing from TENANT_CASCADE_TABLES derived from RESTAURANT_MODEL_DATA_RIGHTS`,
        );
      } else if (model.hasTenantIdField) {
        assert.ok(
          nonCascadeTenantSet.has(model.name),
          `Non-cascade tenant-linked model "${model.name}" must be tracked in explicit erasure list`,
        );
      }
    }

    // 2. Registry cannot reference nonexistent schema models
    const schemaNameSet = new Set(schemaModels.map((m) => m.name));
    for (const spec of RESTAURANT_MODEL_DATA_RIGHTS) {
      assert.ok(schemaNameSet.has(spec.model), `Stale model "${spec.model}" in RESTAURANT_MODEL_DATA_RIGHTS`);

      if (spec.exportPolicy === 'INCLUDE') {
        assert.ok(
          Array.isArray(spec.exportColumns) && spec.exportColumns.length > 0,
          `Included model "${spec.model}" must declare exportColumns`,
        );
        for (const col of spec.exportColumns) {
          assert.equal(
            SECRET_COLUMN_DENY_LIST.has(col.toLowerCase()),
            false,
            `Included model "${spec.model}" exports forbidden secret column "${col}"`,
          );
        }
      } else {
        assert.ok(
          typeof spec.exclusionReason === 'string' && spec.exclusionReason.trim().length >= 15,
          `Excluded model "${spec.model}" must have a meaningful exclusionReason`,
        );
      }
    }
  });
});
