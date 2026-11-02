/**
 * 🪐 OrbitoX Phase 5: MRN Concurrency & Parallel Patient Creation Test
 *
 * Verifies (Q2):
 * MRN default uses random suffix, not Date.now().
 * 50 parallel creates without MRN -> 50 patients created without collision.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { withTenantTx } from '../lib/tenant-db';
import { getPhiKeyRing } from '../lib/phi-crypto';
import { createPatient, generateMrn } from '../lib/hms-repository';

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';

describe('🪐 Phase 5 (Q2): MRN Generator & 50 Parallel Patient Creates', () => {
  let pool: Pool;
  const tenantId = `org/test-mrn-org-${crypto.randomBytes(4).toString('hex')}/project/hosp-${crypto.randomBytes(4).toString('hex')}/environment/production`;
  const ring = getPhiKeyRing();

  before(async () => {
    pool = new Pool({ connectionString: databaseUrl, max: 20 });
    // Verify connection
    await pool.query('SELECT 1');
  });

  after(async () => {
    // Clean up test tenant records
    try {
      await pool.query(`DELETE FROM "HmsPatient" WHERE "tenantId" = $1`, [tenantId]);
      await pool.query(`DELETE FROM "TenantOutbox" WHERE "topic" LIKE 'hms.%' AND "payload"->>'tenantId' = $1`, [tenantId]);
    } catch {
      // Ignore cleanup error
    }
    await pool.end();
  });

  it('generateMrn produces valid format matching CHECK constraint ^[A-Z0-9-]{4,32}$', () => {
    for (let i = 0; i < 100; i++) {
      const mrn = generateMrn();
      assert.match(mrn, /^[A-Z0-9-]{4,32}$/, `MRN ${mrn} must satisfy SQL constraint`);
      assert.match(mrn, /^MRN-[A-Z0-9]+-[A-F0-9]{10}$/, `MRN ${mrn} must match high-entropy format`);
    }
  });

  it('50 parallel creates without MRN produce 50 distinct patients with zero collisions', async () => {
    // Execute 50 parallel creates concurrently across multiple pool connections
    const parallelCount = 50;
    const promises = Array.from({ length: parallelCount }, (_, i) =>
      withTenantTx(pool, tenantId, async (tx) => {
        return await createPatient(tx, ring, {
          name: `Parallel Concurrency Patient ${i + 1}`,
          gender: 'OTHER',
          bloodGroup: 'O+',
        });
      })
    );

    const created = await Promise.all(promises);

    assert.equal(created.length, parallelCount, 'All 50 patient creations must resolve successfully');

    const ids = new Set(created.map((c) => c.id));
    const mrns = new Set(created.map((c) => c.mrn));

    assert.equal(ids.size, parallelCount, 'All 50 patients must have unique IDs');
    assert.equal(mrns.size, parallelCount, 'All 50 patients must have unique MRNs without collisions');

    // Verify all 50 patients actually exist in database
    const { rows } = await withTenantTx(pool, tenantId, async (tx) => {
      return await tx.query(`SELECT "id", "mrn" FROM "HmsPatient" WHERE "tenantId" = $1`, [tenantId]);
    });

    assert.equal(rows.length, parallelCount, `Database must contain exactly 50 rows, found ${rows.length}`);
  });
});
