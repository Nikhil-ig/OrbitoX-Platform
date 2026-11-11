/**
 * Rotation-aware API key verifiers (fixes N1).
 *
 * Config: ORBITOX_SERVER_PEPPERS='{"p2026a":"<secret>","p2025b":"<secret>"}'  ORBITOX_SERVER_PEPPER_ACTIVE=p2026a
 *   - new keys are always derived with the ACTIVE pepper
 *   - lookup tries every configured pepper, so rotating the active pepper breaks nothing
 *   - a key that matched a non-active pepper is reported so ops know when an old pepper can be retired
 * Lookup SQL (one index probe per candidate, max 4 peppers):
 *   SELECT ... FROM "PlatformApiKey" k ... WHERE k."authVerifier" = ANY($1::text[]) LIMIT 2
 * More than one row = verifier collision = fail closed.
 */
import crypto from 'crypto';

export interface PepperRing { active: string; peppers: Map<string, Buffer>; }

const ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
export const MAX_PEPPERS = 4;

export function loadPepperRing(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): PepperRing {
  let raw: Record<string, string>;
  if (!env.ORBITOX_SERVER_PEPPERS && env.ORBITOX_SERVER_PEPPER) {
    raw = { legacy: env.ORBITOX_SERVER_PEPPER };
  } else {
    try { raw = JSON.parse(env.ORBITOX_SERVER_PEPPERS || ''); }
    catch { throw new Error('ORBITOX_SERVER_PEPPERS must be a JSON object of {id: secret}'); }
  }
  const entries = Object.entries(raw);
  if (entries.length === 0 || entries.length > MAX_PEPPERS) throw new Error(`1..${MAX_PEPPERS} peppers required`);
  const peppers = new Map<string, Buffer>();
  const seen = new Set<string>();
  for (const [id, secret] of entries) {
    if (!ID_RE.test(id)) throw new Error(`invalid pepper id ${id}`);
    if (typeof secret !== 'string' || secret.length < 32) throw new Error(`pepper ${id} must be >= 32 chars`);
    if (seen.has(secret)) throw new Error('duplicate pepper values');
    seen.add(secret);
    peppers.set(id, Buffer.from(secret, 'utf8'));
  }
  const active = env.ORBITOX_SERVER_PEPPER_ACTIVE || (peppers.has('legacy') ? 'legacy' : '');
  if (!peppers.has(active)) throw new Error('ORBITOX_SERVER_PEPPER_ACTIVE must name a configured pepper');
  return { active, peppers };
}

export function deriveVerifier(rawSecret: string, pepper: Buffer): string {
  return crypto.createHmac('sha256', pepper).update(rawSecret, 'utf8').digest('hex');
}

/** For key creation. */
export function activeVerifier(ring: PepperRing, rawSecret: string): { verifier: string; pepperId: string } {
  return { verifier: deriveVerifier(rawSecret, ring.peppers.get(ring.active)!), pepperId: ring.active };
}

/** For lookup: all candidates, active first. Pass to `= ANY($1::text[])`. */
export function candidateVerifiers(ring: PepperRing, rawSecret: string): Array<{ verifier: string; pepperId: string }> {
  const ids = [ring.active, ...[...ring.peppers.keys()].filter((k) => k !== ring.active)];
  return ids.map((id) => ({ verifier: deriveVerifier(rawSecret, ring.peppers.get(id)!), pepperId: id }));
}

/** After the DB returns the stored verifier, identify which pepper matched (constant-time). */
export function whichPepper(ring: PepperRing, rawSecret: string, storedVerifier: string): string | null {
  const stored = Buffer.from(storedVerifier, 'hex');
  let match: string | null = null;
  for (const c of candidateVerifiers(ring, rawSecret)) {
    const b = Buffer.from(c.verifier, 'hex');
    if (b.length === stored.length && crypto.timingSafeEqual(b, stored) && match === null) match = c.pepperId;
  }
  return match;
}
