import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformRepository } from '@orbitox-io/plugin-engine';
import { GET } from '../app/api/health/route';

describe('Control-plane health route', () => {
  it('returns healthy when the repository has a readable store', async () => {
    const originalInitialize = PlatformRepository.initialize;
    const originalAssertHealthy = PlatformRepository.assertPersistenceHealthy;
    PlatformRepository.initialize = () => undefined;
    PlatformRepository.assertPersistenceHealthy = () => undefined;

    try {
      const response = GET();
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true, service: 'orbitox-control-plane' });
    } finally {
      PlatformRepository.initialize = originalInitialize;
      PlatformRepository.assertPersistenceHealthy = originalAssertHealthy;
    }
  });

  it('returns unhealthy when the repository store cannot be loaded', async () => {
    const originalInitialize = PlatformRepository.initialize;
    PlatformRepository.initialize = () => {
      throw new Error('Persistent store is unavailable.');
    };

    try {
      const response = GET();
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { ok: false, service: 'orbitox-control-plane' });
    } finally {
      PlatformRepository.initialize = originalInitialize;
    }
  });

  it('returns unhealthy when storage becomes unavailable after initialization', async () => {
    const originalInitialize = PlatformRepository.initialize;
    const originalAssertHealthy = PlatformRepository.assertPersistenceHealthy;
    PlatformRepository.initialize = () => undefined;
    PlatformRepository.assertPersistenceHealthy = () => {
      throw new Error('No valid persistent store or previous good copy is available.');
    };

    try {
      const response = GET();
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { ok: false, service: 'orbitox-control-plane' });
    } finally {
      PlatformRepository.initialize = originalInitialize;
      PlatformRepository.assertPersistenceHealthy = originalAssertHealthy;
    }
  });
});