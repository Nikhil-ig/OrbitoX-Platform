import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHealthHandler } from '../lib/health-route-handler';

describe('Control-plane health route', () => {
  it('returns healthy when the repository has a readable store', async () => {
    const response = await createHealthHandler(async () => undefined)();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, service: 'orbitox-control-plane' });
  });

  it('returns unhealthy when the database migration version is not ready', async () => {
    const response = await createHealthHandler(async () => {
      throw new Error('The platform database is not at the required migration version.');
    })();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, service: 'orbitox-control-plane' });
  });

  it('returns unhealthy when the database is unavailable', async () => {
    const response = await createHealthHandler(async () => {
      throw new Error('Database connection refused.');
    })();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, service: 'orbitox-control-plane' });
  });
});
