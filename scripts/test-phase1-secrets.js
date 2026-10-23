const assert = require('assert');
const path = require('path');

// Test the compiled secrets module or load directly
const { requireSecret } = require('../orbitox/packages/config/dist/secrets');

console.log('Testing requireSecret validator...');

const originalEnv = { ...process.env };

function reset() {
  process.env = { ...originalEnv };
  delete process.env.TEST_SECRET;
  delete process.env.ALLOW_DEV_SECRETS;
}

// 1. Missing secret throws
reset();
let threw = false;
try {
  requireSecret('TEST_SECRET');
} catch (err) {
  threw = true;
  assert.match(err.message, /Required environment secret "TEST_SECRET" is not set/);
}
assert.strictEqual(threw, true, 'Missing secret must throw');
console.log('  ✓ Missing secret throws as expected');

// 2. Short secret throws
reset();
threw = false;
process.env.TEST_SECRET = 'short';
try {
  requireSecret('TEST_SECRET', { minBytes: 16 });
} catch (err) {
  threw = true;
  assert.match(err.message, /does not meet minimum entropy requirement/);
}
assert.strictEqual(threw, true, 'Short secret must throw');
console.log('  ✓ Short secret throws as expected');

// 3. Known bad placeholders throw
const bads = [
  'default_secret',
  'mock',
  'changeme',
  'orbitox_platform_control_secret_2026',
  'orbitox_default_secure_hmac_secret_key_2026'
];

for (const bad of bads) {
  reset();
  threw = false;
  process.env.TEST_SECRET = bad;
  try {
    requireSecret('TEST_SECRET', { minBytes: 4 });
  } catch (err) {
    threw = true;
    assert.match(err.message, /prohibited insecure placeholder/);
  }
  assert.strictEqual(threw, true, `Placeholder "${bad}" must throw`);
}
console.log('  ✓ All prohibited placeholders throw as expected');

// 4. Valid secret succeeds
reset();
const goodSecret = 'd28a3f890c0f9947c61ab12398fa87e4';
process.env.TEST_SECRET = goodSecret;
const res = requireSecret('TEST_SECRET', { minBytes: 16 });
assert.strictEqual(res, goodSecret);
console.log('  ✓ Valid secret succeeds');

// 5. ALLOW_DEV_SECRETS=1 with NODE_ENV=development generates ephemeral secret
reset();
process.env.NODE_ENV = 'development';
process.env.ALLOW_DEV_SECRETS = '1';
delete process.env.TEST_SECRET;
const devSecret1 = requireSecret('TEST_SECRET', { minBytes: 32 });
assert.strictEqual(typeof devSecret1, 'string');
assert.strictEqual(devSecret1.length >= 32, true);
const devSecret2 = requireSecret('TEST_SECRET', { minBytes: 32 });
assert.strictEqual(devSecret1, devSecret2, 'Ephemeral secret must remain stable across process runtime');
console.log('  ✓ ALLOW_DEV_SECRETS=1 generates per-process ephemeral secret in development');

// 6. ALLOW_DEV_SECRETS=1 with NODE_ENV=production refuses to generate and throws
reset();
process.env.NODE_ENV = 'production';
process.env.ALLOW_DEV_SECRETS = '1';
delete process.env.TEST_SECRET;
threw = false;
try {
  requireSecret('TEST_SECRET', { minBytes: 16 });
} catch (err) {
  threw = true;
  assert.match(err.message, /Required environment secret "TEST_SECRET" is not set/);
}
assert.strictEqual(threw, true, 'ALLOW_DEV_SECRETS must be ignored in production mode');
console.log('  ✓ ALLOW_DEV_SECRETS=1 is strictly ignored in production');

console.log('All requireSecret unit tests PASSED successfully!');
