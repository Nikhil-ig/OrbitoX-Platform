import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import {
  generateProjectKey,
  hashProjectKey,
  verifyProjectKey,
  evaluateProjectAccess,
  safeTimingEqual,
  PROJECT_KEY_PREFIX,
} from './project-keys.ts';

test('per-project runtime keys: generation and format', () => {
  const key1 = generateProjectKey();
  const key2 = generateProjectKey();

  assert.ok(key1.startsWith(PROJECT_KEY_PREFIX));
  assert.ok(key2.startsWith(PROJECT_KEY_PREFIX));
  assert.notEqual(key1, key2, 'Generated keys must be distinct');
  assert.equal(key1.length, PROJECT_KEY_PREFIX.length + 48); // 24 bytes in hex = 48 chars
});

test('per-project runtime keys: SHA-256 hashing and verification', () => {
  const key = generateProjectKey();
  const hash = hashProjectKey(key);

  const manualHash = crypto.createHash('sha256').update(key).digest('hex');
  assert.equal(hash, manualHash, 'hashProjectKey must produce exact SHA-256 hex digest');
  assert.notEqual(key, hash, 'Plaintext key must never match hash');

  assert.equal(verifyProjectKey(key, hash), true, 'Valid key must verify against its hash');
  assert.equal(verifyProjectKey('invalid_key', hash), false, 'Wrong key must fail verification');
  assert.equal(verifyProjectKey('', hash), false, 'Empty key must fail verification');
  assert.equal(verifyProjectKey(key, ''), false, 'Empty hash must fail verification');
});

test('timing-safe string comparison', () => {
  assert.equal(safeTimingEqual('token123', 'token123'), true);
  assert.equal(safeTimingEqual('token123', 'token456'), false);
  assert.equal(safeTimingEqual('short', 'longer_string'), false);
  assert.equal(safeTimingEqual('' as any, null as any), false);
});

test('evaluateProjectAccess: admin principal is always authorized', () => {
  const res = evaluateProjectAccess({
    projectId: 'restaurant_os',
    principal: 'admin',
    credential: 'any',
    action: 'REGISTER',
    projectKeyHash: null,
  });
  assert.equal(res.authorized, true);
  assert.equal(res.status, 200);
});

test('evaluateProjectAccess: unauthenticated request is rejected', () => {
  const res = evaluateProjectAccess({
    projectId: 'restaurant_os',
    principal: 'anonymous',
    action: 'HEARTBEAT',
  });
  assert.equal(res.authorized, false);
  assert.equal(res.status, 401);
});

test('evaluateProjectAccess: initial REGISTER with shared token is allowed', () => {
  const shared = 'shared_runtime_token_secret';
  const res = evaluateProjectAccess({
    projectId: 'new_project',
    principal: 'runtime',
    credential: shared,
    action: 'REGISTER',
    sharedRuntimeToken: shared,
    projectKeyHash: null,
  });
  assert.equal(res.authorized, true);
  assert.equal(res.isInitialRegistration, true);
});

test('evaluateProjectAccess: initial REGISTER with bad token is rejected', () => {
  const shared = 'shared_runtime_token_secret';
  const res = evaluateProjectAccess({
    projectId: 'new_project',
    principal: 'runtime',
    credential: 'wrong_token',
    action: 'REGISTER',
    sharedRuntimeToken: shared,
    projectKeyHash: null,
  });
  assert.equal(res.authorized, false);
  assert.equal(res.status, 401);
});

test('evaluateProjectAccess: unregistered project calling non-REGISTER is rejected', () => {
  const shared = 'shared_runtime_token_secret';
  const res = evaluateProjectAccess({
    projectId: 'unregistered_project',
    principal: 'runtime',
    credential: shared,
    action: 'HEARTBEAT',
    sharedRuntimeToken: shared,
    projectKeyHash: null,
  });
  assert.equal(res.authorized, false);
  assert.equal(res.status, 401);
  assert.match(res.error || '', /not registered with a project runtime key/);
});

test('evaluateProjectAccess: registered project rejects shared token and requires project key', () => {
  const shared = 'shared_runtime_token_secret';
  const projectKeyA = generateProjectKey();
  const hashA = hashProjectKey(projectKeyA);

  const projectKeyB = generateProjectKey();

  // 1. Project A presenting its own key -> authorized
  const resValid = evaluateProjectAccess({
    projectId: 'project_a',
    principal: 'runtime',
    credential: projectKeyA,
    action: 'HEARTBEAT',
    sharedRuntimeToken: shared,
    projectKeyHash: hashA,
  });
  assert.equal(resValid.authorized, true);
  assert.equal(resValid.status, 200);

  // 2. Project A presenting the shared token for heartbeat -> REJECTED
  const resShared = evaluateProjectAccess({
    projectId: 'project_a',
    principal: 'runtime',
    credential: shared,
    action: 'HEARTBEAT',
    sharedRuntimeToken: shared,
    projectKeyHash: hashA,
  });
  assert.equal(resShared.authorized, false);
  assert.equal(resShared.status, 401);
  assert.match(resShared.error || '', /Shared runtime token cannot be used/);

  // 3. Project A presenting the shared token for re-register -> REJECTED
  const resSharedRegister = evaluateProjectAccess({
    projectId: 'project_a',
    principal: 'runtime',
    credential: shared,
    action: 'REGISTER',
    sharedRuntimeToken: shared,
    projectKeyHash: hashA,
  });
  assert.equal(resSharedRegister.authorized, false);
  assert.equal(resSharedRegister.status, 401);
  assert.match(resSharedRegister.error || '', /Project is already registered/);

  // 4. Project A presenting Project B's key -> REJECTED
  const resCrossKey = evaluateProjectAccess({
    projectId: 'project_a',
    principal: 'runtime',
    credential: projectKeyB,
    action: 'HEARTBEAT',
    sharedRuntimeToken: shared,
    projectKeyHash: hashA,
  });
  assert.equal(resCrossKey.authorized, false);
  assert.equal(resCrossKey.status, 401);

  // 5. Re-registering with Project A's own key -> authorized
  const resReRegisterValid = evaluateProjectAccess({
    projectId: 'project_a',
    principal: 'runtime',
    credential: projectKeyA,
    action: 'REGISTER',
    sharedRuntimeToken: shared,
    projectKeyHash: hashA,
  });
  assert.equal(resReRegisterValid.authorized, true);
});
