# 🪐 OrbitoX Platform — Prioritized Remediation Plan & Discrepancy Register
**Audit Date:** October 25, 2026  
**Status:** DRAFT / PENDING ARCHITECTURAL APPROVAL (STAGE 3 GATE)  
**Target Release:** OrbitoX v1.0.0 Commercial Launch  

---

## 1. Discrepancy Register

| ID | Severity | Evidence / Source Locations | Expected Behavior | Actual Behavior | Impact | Recommended Fix | Dependencies | Verification Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DISC-01** | **Critical** | `projects/external-os/hospital-os/`<br>`npm run build`<br>`src/client/HospitalOSClient.ts:467,522`<br>`src/domain/equipment-catalog.ts:1` | `npm run build` (`tsc -p tsconfig.json`) must compile cleanly with 0 TypeScript errors. | Compiles with **14 TypeScript errors** (duplicate method declaration, unexported types, mismatched interfaces). | Blocks production deployment and Docker containerization of HospitalOS. | Fix duplicate `orderLabTest` overload in client SDK; export missing types in `domain/types.ts`; fix threshold type interfaces. | None | `npm run build` in `projects/external-os/hospital-os` exits with code 0. |
| **DISC-02** | **High** | `orbitox/packages/plugin-engine/src/platform/platform-repository.ts` (L57-L76)<br>`orbitox/apps/web/app/api/v1/platform/projects/route.ts` | Platform Control Center settings, quota overrides, and project metadata must persist to disk or database. | `PlatformRepository` stores data in static in-memory JavaScript arrays (`organizations`, `projects`, `quotaPolicies`). | Any server restart, container redeploy, or multi-worker process loses modified settings. | Wire `PlatformRepository` to read/write through `PersistentControlStore` (`control-plane-store.json`) or Prisma PostgreSQL. | None | Edit quota policy in Control Center, restart server, verify quota value persists. |
| **DISC-03** | **High** | `orbitox/package.json` (`"type-check"`)<br>33 sub-packages without `"type-check"` | `pnpm run type-check` at root must type-check every workspace package and application. | Only 4 packages (`core`, `utils`, `types`, `importer-core`) are inspected. 33 packages are silently skipped. | Type regressions in plugins (`pos`, `crm`) and applications (`web`, `celebrations`) can pass CI undetected. | Add `"type-check": "tsc --noEmit"` to all package manifests and configure `turbo.json`. | None | Run `pnpm run type-check` and verify 37 tasks execute. |
| **DISC-04** | **High** | `projects/external-os/restaurant-os/package.json`<br>`projects/external-os/restaurant-os/scripts/` | RestaurantOS package manifest must provide standard `"test"` and `"type-check"` scripts. | No `"test"` script exists in `package.json`. Developers cannot run `pnpm test` in the product directory. | Breaks developer ergonomics and local pre-commit verification. | Add `"test": "npx tsx scripts/test-event-bus-tenants.ts"` and `"test:all"` to `package.json`. | None | Execute `pnpm test` inside `projects/external-os/restaurant-os`. |
| **DISC-05** | **Medium** | `projects/external-os/restaurant-os/.orbitox/orbitox.project.json`<br>`projects/external-os/restaurant-os/orbitox.project.json`<br>`projects/external-os/restaurant-os/docker-compose.yml` (L45) | A single canonical `projectId` should identify RestaurantOS across all manifests and configs. | Three conflicting IDs: `project_restaurant_os`, `restaurant-os-pilot`, and `restaurant-os-fleet`. | Causes mismatch in fleet telemetry reporting and configuration drift detection. | Standardize canonical `projectId: "restaurant-os"` across all manifests and Docker compose. | None | Inspect fleet cockpit at `/platform/fleet` and verify consistent identification. |
| **DISC-06** | **Medium** | 387 instances across `docs/` and `docs/archive/`<br>(e.g. `docs/RESTAURANTOS_FLOW_FEATURES_AND_USES.md:3`) | Technical documentation must use repository-relative Markdown links. | 387 hardcoded `file:///Users/apple/...` absolute local paths break in GitHub and other environments. | Broken navigation for external developers and operators reviewing documentation. | Execute automated link sanitizer replacing `file:///Users/apple/.../OrbitoX Platform/` with relative paths. | None | Run grep check for `file:///Users/apple` returning 0 matches in active docs. |
| **DISC-07** | **Medium** | `orbitox/apps/celebrations/components/studio-zero/`<br>`docs/archive/celebrations-studio/P27/` | Visual Studio must provide responsive canvas editing, auto-layout, and persistent project state. | Suffers from 28 interactive bugs; raw Tailwind utility classes without PostCSS; missing Prisma models for saved projects. | Celebrations Studio is not production-ready for commercial creative authoring. | Decouple Studio from Phase 1 commercial release; designate as Developer Preview; plan Phase 2 persistence. | None | Forensic inspection of visual canvas interactions. |
| **DISC-08** | **Low** | Root `README.md` | Root README must serve as the authoritative onboarding and launch documentation manual. | Missing database migration workflows, product status breakdown, type-check commands, and security details. | High friction for new developers and platform operators onboarding to the ecosystem. | Rewrite root `README.md` according to the 12-section canonical specification. | DISC-04, DISC-05 | Visual review and end-to-end command execution. |
| **DISC-09** | **Low** | `.github/workflows/ci.yml` (L40-L42) | CI workflow must run unit tests for all core business plugins. | CI only runs tests for `@orbitox/external-project-engine` and RestaurantOS, skipping `core`, `pos`, `crm`, and `plugin-engine`. | Regressions in core domain packages may be merged to main without CI detection. | Expand CI test step to run `turbo run test --filter=!celebrations`. | None | Trigger CI workflow or verify locally with Turborepo test pipeline. |

---

## 2. Prioritized Remediation Roadmap

### Phase P0 — Critical Release Blockers & Build Integrity
**Objective:** Eliminate build breaks, silence no packages during type-checks, and guarantee test commands exist.
1. **Fix HospitalOS TypeScript Compilation (`DISC-01`)**:
   - Resolve duplicate `orderLabTest` function declaration in `src/client/HospitalOSClient.ts`.
   - Export missing `AttachedMedicalDevice` and `MedicalDeviceType` in `src/domain/types.ts`.
   - Fix `minSpO2` and `maxHeartRate` interface properties in `src/automation/triggers.ts` and `src/automation/recipes.ts`.
   - Verify `npm run build` exits with code 0.
2. **Add Missing Scripts to RestaurantOS (`DISC-04`)**:
   - Add `"test": "npx tsx scripts/test-event-bus-tenants.ts"` to `projects/external-os/restaurant-os/package.json`.
   - Add `"test:e2e": "npx tsx scripts/test-safe-tenancy-and-rls.ts"` and `"type-check": "tsc --noEmit"`.
3. **Monorepo Type-Check Coverage (`DISC-03`)**:
   - Add `"type-check": "tsc --noEmit"` to all package manifests in `orbitox/packages/*` and `orbitox/plugins/*`.
   - Update `turbo.json` to ensure `pnpm run type-check` validates the entire monorepo.

### Phase P1 — Platform Correctness & Persistence Alignment
**Objective:** Ensure configuration changes made in the Control Center persist across server restarts.
1. **Persist PlatformRepository (`DISC-02`)**:
   - Wire `PlatformRepository` in `@orbitox/plugin-engine` to load from and save to `PersistentControlStore` (`control-plane-store.json`).
   - Ensure quota adjustments, API keys, and environment settings persist across server reloads.
2. **Harmonize RestaurantOS Identifiers (`DISC-05`)**:
   - Consolidate duplicate manifests: Remove obsolete root copy `projects/external-os/restaurant-os/orbitox.project.json` in favor of canonical `.orbitox/orbitox.project.json`.
   - Standardize `projectId: "restaurant-os"` across manifest, server bridge, and `docker-compose.yml`.
3. **Expand CI Pipeline Coverage (`DISC-09`)**:
   - Update `.github/workflows/ci.yml` to run test suites for `@orbitox/core`, `@orbitox/pos`, `@orbitox/crm`, and `@orbitox/plugin-engine`.

### Phase P2 — Documentation Hygiene & Link Sanitization
**Objective:** Eliminate all broken local machine URLs and establish canonical onboarding documentation.
1. **Sanitize Documentation Links (`DISC-06`)**:
   - Replace 387 `file:///Users/apple/...` URLs with repository-relative Markdown links across `docs/` and `docs/archive/`.
   - Mark `docs/archive/celebrations-studio/` as historical reference.
2. **Author Canonical Root README (`DISC-08`)**:
   - Implement the complete, 12-section canonical `README.md` covering architecture, independent products, database migration workflow, environment setup, and release status.

### Phase P3 — Product Scope Governance & Launch Decoupling
**Objective:** Formally define the commercial boundary for v1.0.0.
1. **Commercial Release Scope**:
   - **Tier 1 (Production Ready)**: Platform Control Plane, Fleet Cockpit, `@orbitox/pos`, `@orbitox/crm`, RestaurantOS Independent Runtime.
   - **Tier 2 (Developer / Technical Preview)**: HospitalOS (prototype validation), Celebrations Studio (awaiting P28 canvas persistence refactor).

---

## 3. Risk and Rollback Strategy

| Action | Risk | Mitigation | Rollback Plan |
| :--- | :--- | :--- | :--- |
| **HospitalOS Type Fixes** | Modifying function signatures could break existing consumer code. | Changes strictly conform to existing interfaces in `domain/types.ts`. | Git revert of targeted commits in `projects/external-os/hospital-os/src/`. |
| **Control Plane Persistence** | Synchronous file I/O could block Next.js API route event loops. | Use existing atomic async write-with-debounce pattern in `PersistentControlStore`. | Retain in-memory cache as primary read layer; fallback to memory-only on disk write error. |
| **Documentation Link Replacement** | Automated regex replace could corrupt code blocks containing URLs. | Restrict string replacement strictly to Markdown link brackets `[`...`](file:///...)`. | Git checkout `docs/` if diff review reveals accidental text alterations. |

---

## 4. Stage 3 Gate: Explicit Approval Request

**The audit and reconciliation phase (Stage 1 & Stage 2) is now 100% complete.**  
No application source code has been modified.

### Decisions Required Before Proceeding to Stage 4 (Implementation):
1. **Approval of Remediation Plan**: Confirm approval of Phases P0, P1, and P2 as structured above.
2. **Product Scope Formalization**: Confirm that the v1.0.0 commercial release focuses on the **Platform Control Plane + RestaurantOS**, while designating HospitalOS and Celebrations Studio as technical previews.
3. **Execution Authorization**: Provide explicit authorization to begin implementing Phase P0 in controlled, verifiable increments.

*(Awaiting your explicit instructions before any application code is modified.)*
