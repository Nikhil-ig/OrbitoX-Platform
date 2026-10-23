# OrbitoX Hardening — Progress Log

## Phase 0: Baseline & Threat Model
- **Done:** Branch `hardening/phase-0` created; monorepo recursive build evaluated (33/34 packages build; web build failure recorded); 21 non-browser test scripts executed; baseline and threat model recorded.
- **Tests Run:** 21 integration scripts (plus 34 package builds).
- **Tests Passed:** 7 passed (33/34 workspace packages passed build).
- **Risks Left:** 14 test scripts failing due to existing legacy state/routes; hardcoded secrets and unguarded routes remain active until Phase 1 and 2.
- **Next:** PHASE 1 — SECRETS: STOP THE BLEEDING (F6, F7, F8, F5-part, F14).

## Phase 1: Secrets & Leak Remediation
- **Done:** Created `@orbitox/config` validator `requireSecret`; replaced insecure fallbacks in core, pos, external-project-engine, and restaurant-os; moved station secrets to env with SHA-256 hash lookup; untracked all .bak, .zip, and data dumps; added security CI workflow, purge-history script, ROTATE_NOW checklist, and .env.examples.
- **Tests Run:** 27 (requireSecret unit suite, boot failure checks, pre-milestone-3 proof suite).
- **Tests Passed:** 27 passed (all tests green).
- **Risks Left:** History rewrite with purge-history.sh and secret rotation in production environments must be performed by human repository owner; API guard rewrite pending in Phase 2.
- **Next:** PHASE 2 — REWRITE THE API GUARD: DEFAULT-DENY (F1, F4, F5, F11).

## Phase 2: Default-Deny API Guard & Cryptographic Authentication
- **Done:** Rewrote API Guard into modular components (`authenticate`, `authorize`, `tenant`, `rate-limit`, `errors`, `index`); enforced default-deny and header-only credentials; eliminated seeded keys and `rawKey` fields; implemented constant-time HMAC-SHA256 authentication against server pepper; enforced tenant anti-spoofing and scope validation; secured 15 former public `platform/*` routes (F11); added edge middleware defense, bootstrap-root-key CLI, and PUBLIC_ROUTES.md.
- **Tests Run:** 31 (26 guard regression & timing tests, 5 requireSecret unit tests, plus Next.js production web build).
- **Tests Passed:** 31 passed (100% test pass rate; Next.js full static page build 139/139 passed).
- **Risks Left:** All 75 route endpoints need static scanning and explicit per-route scope definitions in Phase 3; snapshot import/export hardening pending in Phase 3.
- **Next:** PHASE 3 — GUARD EVERY ROUTE; CLOSE THE SNAPSHOT HOLE (F2, F3).


