import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { signGrant, verifyGrant, MemoryRevisionStore, canUse, GrantError, EntitlementClaims, LicenceClaims } from '../src/entitlement-token';

const k1 = crypto.generateKeyPairSync('ed25519');
const k2 = crypto.generateKeyPairSync('ed25519');
const attacker = crypto.generateKeyPairSync('ed25519');
const T = 'org/city-care/project/main/environment/prod';
const now = Date.now();
const sec = Math.floor(now / 1000);
const ent = (over: Partial<EntitlementClaims> = {}) => ({
  typ: 'orbitox-ent' as const, aud: 'hospital-os', sub: T, plan: 'hms-pro', status: 'ACTIVE' as const,
  features: ['patients', 'labs'], quotas: { patients: { limit: 5000, window: 'none' as const } },
  rev: 7, exp: sec + 900, ...over,
});
const opts = (over: any = {}) => ({ type: 'orbitox-ent' as const, audience: 'hospital-os', subject: T,
  trustedKeys: { k1: k1.publicKey, k2: k2.publicKey }, now, ...over });
const reason = (r: string) => (e: any) => e instanceof GrantError && e.reason === r;

describe('entitlement tokens', () => {
  it('valid token verifies and gates features', async () => {
    const c = await verifyGrant<EntitlementClaims>(signGrant(ent(), k1.privateKey, 'k1', now), opts());
    assert.equal(c.plan, 'hms-pro');
    assert.equal(canUse(c, 'labs', true), 'ALLOW');
    assert.equal(canUse(c, 'pharmacy', false), 'NOT_IN_PLAN');
    assert.equal(canUse({ ...c, status: 'READ_ONLY' }, 'labs', true), 'READ_ONLY');
    assert.equal(canUse({ ...c, status: 'READ_ONLY' }, 'labs', false), 'ALLOW');
    assert.equal(canUse({ ...c, status: 'SUSPENDED' }, 'labs', false), 'SUSPENDED');
  });
  it('rejects forged, tampered, alg-swapped and unknown-key tokens', async () => {
    await assert.rejects(verifyGrant(signGrant(ent(), attacker.privateKey, 'k1', now), opts()), reason('BAD_SIGNATURE'));
    const t = signGrant(ent(), k1.privateKey, 'k1', now).split('.');
    const p = JSON.parse(Buffer.from(t[1], 'base64url').toString()); p.features.push('pharmacy'); p.plan = 'hms-enterprise';
    await assert.rejects(verifyGrant([t[0], Buffer.from(JSON.stringify(p)).toString('base64url'), t[2]].join('.'), opts()), reason('BAD_SIGNATURE'));
    const h = Buffer.from(JSON.stringify({ alg: 'none', kid: 'k1', typ: 'orbitox-ent' })).toString('base64url');
    await assert.rejects(verifyGrant([h, t[1], ''].join('.'), opts()), reason('BAD_ALG'));
    await assert.rejects(verifyGrant(signGrant(ent(), k1.privateKey, 'zz', now), opts()), reason('UNKNOWN_KID'));
    await assert.rejects(verifyGrant(signGrant(ent(), k1.privateKey, '__proto__', now), opts()), reason('UNKNOWN_KID'));
    await assert.rejects(verifyGrant('a.b', opts()), reason('MALFORMED'));
  });
  it('binds to plugin (aud) and tenant (sub)', async () => {
    const tok = signGrant(ent(), k1.privateKey, 'k1', now);
    await assert.rejects(verifyGrant(tok, opts({ audience: 'restaurant-os' })), reason('WRONG_AUDIENCE'));
    await assert.rejects(verifyGrant(tok, opts({ subject: 'org/other/project/main/environment/prod' })), reason('WRONG_SUBJECT'));
  });
  it('expiry, not-before and max lifetime', async () => {
    await assert.rejects(verifyGrant(signGrant(ent({ exp: sec + 900 }), k1.privateKey, 'k1', now), opts({ now: now + 3600_000 })), reason('EXPIRED'));
    await assert.rejects(verifyGrant(signGrant(ent(), k1.privateKey, 'k1', now + 600_000), opts()), reason('NOT_YET_VALID'));
    assert.throws(() => signGrant(ent({ exp: sec + 2 * 86400 }), k1.privateKey, 'k1', now), reason('LIFETIME_TOO_LONG'));
  });
  it('rollback protection: an older, more permissive grant is refused after a downgrade', async () => {
    const store = new MemoryRevisionStore();
    const oldPro = signGrant(ent({ rev: 7 }), k1.privateKey, 'k1', now);
    const newSuspended = signGrant(ent({ rev: 8, status: 'SUSPENDED' }), k1.privateKey, 'k1', now);
    await verifyGrant(oldPro, opts({ revisions: store }));
    await verifyGrant(newSuspended, opts({ revisions: store }));
    await assert.rejects(verifyGrant(oldPro, opts({ revisions: store })), reason('ROLLBACK'));
  });
  it('key rotation: k2 tokens verify while k1 is still trusted; k1 tokens fail after removal', async () => {
    await verifyGrant(signGrant(ent(), k2.privateKey, 'k2', now), opts());
    await assert.rejects(verifyGrant(signGrant(ent(), k1.privateKey, 'k1', now), opts({ trustedKeys: { k2: k2.publicKey } })), reason('UNKNOWN_KID'));
  });
  it('licence files are a separate type and cannot be used as entitlements (or vice versa)', async () => {
    const lic = signGrant({ typ: 'orbitox-lic', aud: 'deploy_acme_01', sub: 'org_acme', plugins: ['hospital-os'], maxTenants: 25, rev: 1, exp: sec + 30 * 86400 } as any, k1.privateKey, 'k1', now);
    const c = await verifyGrant<LicenceClaims>(lic, { type: 'orbitox-lic', audience: 'deploy_acme_01', trustedKeys: { k1: k1.publicKey }, now });
    assert.equal(c.maxTenants, 25);
    await assert.rejects(verifyGrant(lic, opts({ audience: 'deploy_acme_01', subject: undefined })), reason('WRONG_TYPE'));
    await assert.rejects(verifyGrant(signGrant(ent(), k1.privateKey, 'k1', now), { type: 'orbitox-lic', audience: 'hospital-os', trustedKeys: { k1: k1.publicKey }, now }), reason('WRONG_TYPE'));
  });
});
