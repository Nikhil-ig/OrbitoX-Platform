import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateProjectKey,
  hashProjectKey,
  verifyProjectKey,
  evaluateProjectAccess,
  PROJECT_KEY_PREFIX,
} from './project-keys.ts';

test('template provisioning: scoped project keys and hash isolation', () => {
  const scopedKey = generateProjectKey();
  const keyHash = hashProjectKey(scopedKey);

  assert.ok(scopedKey.startsWith(PROJECT_KEY_PREFIX), 'Scoped key starts with prefix orb_proj_');
  assert.notEqual(scopedKey, keyHash, 'Plaintext scoped key must not equal its hash');
  assert.equal(verifyProjectKey(scopedKey, keyHash), true, 'Key verifies against stored hash');
  assert.equal(verifyProjectKey('orb_proj_tampered', keyHash), false, 'Tampered key is rejected');
});

test('template provisioning: zero-leak project record with scoped key hash', () => {
  const projectId = 'proj_test_cafe_789';
  const scopedKey = generateProjectKey();
  const keyHash = hashProjectKey(scopedKey);

  // Simulated project record as generated during template-provisioning
  const projectRecord = {
    id: projectId,
    slug: 'test-cafe',
    name: 'Test Artisan Cafe',
    status: 'ACTIVE',
    projectKeyHash: keyHash,
    manifest: {
      projectId,
      slug: 'test-cafe',
      name: 'Test Artisan Cafe',
      type: 'restaurant-os',
      enabledPlugins: ['@orbitox/pos'],
      enabledFeatures: ['pos.orders', 'pos.kitchen', 'pos.quotes', 'pos.sessions'],
      planReferences: ['plan_restaurant_growth'],
    },
  };

  assert.equal(projectRecord.manifest.enabledPlugins[0], '@orbitox/pos', 'Composes @orbitox/pos');
  assert.equal(projectRecord.manifest.planReferences[0], 'plan_restaurant_growth', 'Assigned plan_restaurant_growth');

  // Verify secret is NOT stored in plaintext anywhere in the project record
  const serialized = JSON.stringify(projectRecord);
  assert.equal(serialized.includes(scopedKey), false, 'Raw scopedKey secret is NEVER stored or leaked in project record');
  assert.equal(projectRecord.projectKeyHash, keyHash, 'Only the SHA-256 hash is persisted');

  // Verify access control accepts the scoped key
  const authValid = evaluateProjectAccess({
    projectId,
    principal: 'runtime',
    credential: scopedKey,
    action: 'HEARTBEAT',
    projectKeyHash: keyHash,
  });
  assert.equal(authValid.authorized, true, 'Project scoped key is authorized for operations');

  // Verify access control rejects bad / tampered keys
  const authInvalid = evaluateProjectAccess({
    projectId,
    principal: 'runtime',
    credential: 'orb_proj_unauthorized_key_999',
    action: 'HEARTBEAT',
    projectKeyHash: keyHash,
  });
  assert.equal(authInvalid.authorized, false, 'Invalid runtime key is rejected');

  // Verify shared runtime token cannot bypass once project is registered
  const authSharedBypass = evaluateProjectAccess({
    projectId,
    principal: 'runtime',
    credential: 'shared_runtime_token_123',
    sharedRuntimeToken: 'shared_runtime_token_123',
    action: 'HEARTBEAT',
    projectKeyHash: keyHash,
  });
  assert.equal(authSharedBypass.authorized, false, 'Shared runtime token cannot be reused for operations on registered project');
});
