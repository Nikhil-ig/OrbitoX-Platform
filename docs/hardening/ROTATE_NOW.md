# 🚨 Critical Human Action Checklist: Immediate Secret Rotation

**Document Version:** 1.0.0  
**Phase:** Phase 1 — Secrets & Leak Remediation

Because historical secrets, signing keys, and placeholder credentials were committed to source control or disk stores prior to hardening, the repository owner and infrastructure administrator must execute the following rotation steps immediately.

---

## 1. Rotate Staff Signing Secrets
- [ ] Generate a fresh high-entropy staff signing secret:
  ```bash
  openssl rand -base64 48
  ```
- [ ] Set `STAFF_SIGNING_SECRET` in production runtime environments (Kubernetes Secrets / Docker environment / hosting provider).
- [ ] Invalidate all existing staff sessions and reload the server.

## 2. Rotate Control-Plane HMAC Secrets
- [ ] Generate a new platform control secret:
  ```bash
  openssl rand -base64 48
  ```
- [ ] Set `ORBITOX_CONTROL_PLANE_SECRET` across both central platform web services and external runtime nodes.
- [ ] Confirm mutual runtime registration with `pnpm --filter @orbitox/external-project-engine test`.

## 3. Rotate JWT Asymmetric Keypair
- [ ] Generate a brand-new RS256/Ed25519 keypair:
  ```bash
  openssl genrsa -out jwt_private.pem 2048
  openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
  ```
- [ ] Deploy `JWT_PRIVATE_KEY` to the authentication authority and `JWT_PUBLIC_KEY` to verification services.
- [ ] Never place private keys in repository source trees.

## 4. Rotate Guest Dining HMAC Secret
- [ ] Generate a new guest session HMAC secret:
  ```bash
  openssl rand -base64 48
  ```
- [ ] Deploy `ORBITOX_GUEST_SECRET` to RestaurantOS production instances.
- [ ] Prior table capability tokens will naturally expire and diner sessions will cleanly reconnect.

## 5. Invalidate & Rotate All Seeded API Keys
- [ ] In Phase 2, seeded keys in `mock-data.ts` are deprecated and replaced with hashed root credentials.
- [ ] Run `scripts/security/bootstrap-root-key.ts` once to generate a new primary root key.
- [ ] Immediately revoke and delete any API key generated before Phase 1.

## 6. Revoke All Prior Staff Tokens & Clear Revocation Caches
- [ ] Existing tokens issued under the legacy `.staff_signing_secret` are permanently invalid because the file has been purged and new in-memory/env secrets are active.
- [ ] Flush Redis or local state stores to clear any lingering session metadata.

## 7. History Rewrite & Repository Re-clone
- [ ] Owner executes `scripts/security/purge-history.sh` on an offline backup copy.
- [ ] Force-push rewritten branches to GitHub (`git push --force-with-lease`).
- [ ] All team members and CI runners must perform a fresh `git clone` to eliminate orphan commits.
