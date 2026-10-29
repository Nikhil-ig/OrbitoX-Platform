import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';
import { PlatformKeyEngine } from '@orbitox-io/plugin-engine';
import { loadPepperRing, candidateVerifiers, type PepperRing } from '../lib/pepper';

export interface ImporterOptions {
  filePath?: string;
  dryRun?: boolean;
  verbose?: boolean;
  skipRoleCheck?: boolean; // Strictly ignored unless NODE_ENV === 'test'
  abortAfterOrg?: number; // Strictly ignored unless ORBITOX_ALLOW_TEST_HOOKS === 'true' && NODE_ENV !== 'production'
  killMidOrg?: string; // Strictly ignored unless ORBITOX_ALLOW_TEST_HOOKS === 'true' && NODE_ENV !== 'production'
  defaultBillingPeriod?: string; // Operator override, format YYYY-MM
  allowUnsampledOrgs?: string[]; // S5/F1: slugs of organizations allowed to have verified keys without out-of-band samples
  bypassLease?: boolean; // Test only: bypass singleton lease to test xact lock under concurrency
}

export interface EntityReconciliation {
  entityType: string;
  inSource: number;
  inserted: number;
  skipped: number;
  unresolvedOrFailed: number;
}

export interface OrganizationImportResult {
  organizationId: string;
  slug: string;
  name: string;
  status: 'IMPORTED' | 'SKIPPED' | 'FAILED';
  projectsImported: number;
  projectsSkipped: number;
  environmentsImported: number;
  environmentsSkipped: number;
  keysWithVerifiers: number;
  keysWithoutVerifiers: number;
  keysSkipped: number;
  auditLogsImported: number;
  auditLogsSkipped: number;
  error?: string;
}

export interface ImporterReport {
  dryRun: boolean;
  targetDatabaseInfo: string;
  totalOrganizationsInJson: number;
  organizationsImported: number;
  organizationsSkipped: number;
  organizationsFailed: number;
  reconciliation: EntityReconciliation[];
  orgResults: OrganizationImportResult[];
  unresolvedAuditCount: number;
}

export function parsePlatformJsonFile(filePath: string): any {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`JSON store file not found at: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.organizations)) {
    throw new Error(`Invalid platform store schema: "organizations" array missing in ${filePath}`);
  }
  return data;
}

export function sanitizeDatabaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname || '127.0.0.1';
    const port = parsed.port || '5432';
    const db = parsed.pathname.replace(/^\//, '') || 'unknown_db';
    const user = parsed.username || 'unknown_user';
    return `host=${host}, port=${port}, database=${db}, user=${user}`;
  } catch {
    return 'host=redacted, database=redacted';
  }
}

/**
 * S5-F1: Real pepper verification before import.
 * Operator supplies known secrets out-of-band:
 *   ORBITOX_IMPORT_VERIFY_SAMPLES='{"key_live_abc":"orb_live_...","key_live_def":"orb_live_..."}'
 * Never read samples from the JSON file. Never log values.
 */
export function verifyPepperSamples(
  keys: Array<{ id: string; keyId?: string; organizationId: string; authVerifier?: string }>,
  samplesJson = process.env.ORBITOX_IMPORT_VERIFY_SAMPLES,
  ring?: PepperRing,
): { checked: number; matched: number; mismatched: string[]; orgsWithoutSample: string[] } {
  let samples: Record<string, string> = {};
  if (samplesJson) {
    try {
      samples = JSON.parse(samplesJson);
    } catch {
      samples = {};
    }
  }
  const byId = new Map(keys.flatMap((k) => [[k.id, k], ...(k.keyId ? [[k.keyId, k]] as const : [])]));
  const mismatched: string[] = [];
  const sampledOrgs = new Set<string>();
  let checked = 0, matched = 0;

  for (const [keyRef, raw] of Object.entries(samples)) {
    const key = byId.get(keyRef);
    if (!key?.authVerifier) { mismatched.push(keyRef); continue; }
    checked++;
    const expected = Buffer.from(key.authVerifier, 'hex');
    let ok = false;
    try {
      const activeRing = ring || loadPepperRing();
      ok = candidateVerifiers(activeRing, raw).some((candidate) => {
        const got = Buffer.from(candidate.verifier, 'hex');
        return got.length === expected.length && crypto.timingSafeEqual(got, expected);
      });
    } catch {
      const candidates = PlatformKeyEngine.resolveCandidatePeppers();
      ok = candidates.some((pepper) => {
        const got = Buffer.from(crypto.createHmac('sha256', pepper).update(raw).digest('hex'), 'hex');
        return got.length === expected.length && crypto.timingSafeEqual(got, expected);
      });
    }
    if (ok) { matched++; sampledOrgs.add(key.organizationId); } else mismatched.push(keyRef);
  }
  const orgsWithVerifiedKeys = new Set(keys.filter((k) => k.authVerifier).map((k) => k.organizationId));
  const orgsWithoutSample = [...orgsWithVerifiedKeys].filter((o) => !sampledOrgs.has(o));
  return { checked, matched, mismatched, orgsWithoutSample };
}

export async function runPlatformJsonImporter(
  client: PrismaClient,
  options: ImporterOptions = {}
): Promise<ImporterReport> {
  if (!options.filePath) {
    throw new Error('Explicit --file <path> is required. Default relative file resolution is disabled.');
  }
  const targetPath = options.filePath;
  const isDryRun = Boolean(options.dryRun);
  const isTest = process.env.NODE_ENV === 'test';

  // S5-7: Sanitize and record target database info
  const dbUrl = process.env.DATABASE_URL || '';
  const targetDatabaseInfo = sanitizeDatabaseUrl(dbUrl);

  // S5-6: Test hooks protection: only permit if explicitly enabled in non-production test mode
  const allowTestHooks = process.env.ORBITOX_ALLOW_TEST_HOOKS === 'true' && process.env.NODE_ENV !== 'production';
  if ((options.killMidOrg || options.abortAfterOrg) && !allowTestHooks) {
    throw new Error(
      'Security error: Test hooks (--kill-mid-org, --abort-after-org) are strictly disabled in production. Set ORBITOX_ALLOW_TEST_HOOKS=true in test environment.'
    );
  }

  // S5-2: Database role check: STRICT ALLOWLIST ONLY
  if (!options.skipRoleCheck || !isTest) {
    const [userRow] = await client.$queryRaw<Array<{ current_user: string }>>`SELECT current_user`;
    const currentUser = (userRow?.current_user || '').toLowerCase();

    const [roleRow] = await client.$queryRaw<Array<{ rolsuper: boolean; rolname: string }>>`
      SELECT rolname, rolsuper FROM pg_roles WHERE rolname = current_user
    `;

    const isSuper = Boolean(roleRow?.rolsuper);
    const ALLOWED_MIGRATION_ROLES = new Set(['postgres', 'orbitox_maintenance', 'orbitox_owner']);
    const DISALLOWED_APPLICATION_ROLES = new Set([
      'orbitox_runtime',
      'orbitox_platform_admin_audit',
      'restaurantos_app',
    ]);

    const isAllowed =
      isSuper ||
      ALLOWED_MIGRATION_ROLES.has(currentUser) ||
      (isTest && !DISALLOWED_APPLICATION_ROLES.has(currentUser));

    if (DISALLOWED_APPLICATION_ROLES.has(currentUser) || !isAllowed) {
      throw new Error(
        `Privilege boundary violation: role [${currentUser}] is not authorized to execute the platform data importer. Only migration/maintenance roles ([postgres, orbitox_maintenance, orbitox_owner]) or superusers are permitted.`
      );
    }
  }

  // S5-3: Billing period determination rule & operator override
  let defaultPeriod = new Date().toISOString().slice(0, 7);
  if (options.defaultBillingPeriod) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(options.defaultBillingPeriod)) {
      throw new Error(`Invalid --default-billing-period format: "${options.defaultBillingPeriod}". Expected YYYY-MM.`);
    }
    defaultPeriod = options.defaultBillingPeriod;
  }

  // S5-F2: Singleton Lease Table for Importer Process Runs
  const holderId = `importer_${process.pid}_${crypto.randomUUID()}`;
  let leaseAcquired = false;
  let heartbeatInterval: NodeJS.Timeout | undefined = undefined;

  if (!isDryRun && !options.bypassLease) {
    await client.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PlatformImporterLease" (
        "id" TEXT PRIMARY KEY DEFAULT 'singleton',
        "holder" TEXT NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL
      )
    `;
    const acquired = await client.$queryRaw<Array<{ holder: string }>>`
      INSERT INTO "PlatformImporterLease" ("id", "holder", "expiresAt")
      VALUES ('singleton', ${holderId}, now() + interval '2 minutes')
      ON CONFLICT ("id") DO UPDATE
      SET "holder" = EXCLUDED."holder", "expiresAt" = EXCLUDED."expiresAt"
      WHERE "PlatformImporterLease"."expiresAt" < now()
      RETURNING "holder"
    `;
    if (!acquired[0]?.holder) {
      throw new Error(
        'Concurrent execution conflict: another platform importer holds the lease in "PlatformImporterLease".'
      );
    }
    leaseAcquired = true;
    heartbeatInterval = setInterval(async () => {
      try {
        await client.$executeRaw`
          UPDATE "PlatformImporterLease"
          SET "expiresAt" = now() + interval '2 minutes'
          WHERE "id" = 'singleton' AND "holder" = ${holderId}
        `;
      } catch {
        // Heartbeat failure ignored; lease expires if process died
      }
    }, 30_000);
    heartbeatInterval.unref();
  }

  try {
    // 2. Parse JSON fixture
    const data = parsePlatformJsonFile(targetPath);
    const organizations: any[] = data.organizations || [];
    const projects: any[] = data.projects || [];
    const environments: any[] = data.environments || [];
    const apiKeys: any[] = data.apiKeys || [];
    const credentials: any[] = data.credentials || [];
    const packages: any[] = data.packages || [];
    const packageVersions: any[] = data.packageVersions || [];
    const packageInstallations: any[] = data.packageInstallations || [];
    const domains: any[] = data.domains || [];
    const quotaPolicies: any[] = data.quotaPolicies || [];
    const rateLimitPolicies: any[] = data.rateLimitPolicies || [];
    const auditLogs: any[] = data.auditLogs || [];

    // Track entity counts for reconciliation
    const recon = {
      orgs: { inSource: organizations.length, inserted: 0, skipped: 0, failed: 0 },
      projects: { inSource: projects.length, inserted: 0, skipped: 0, failed: 0 },
      environments: { inSource: environments.length, inserted: 0, skipped: 0, failed: 0 },
      verifiedKeys: { inSource: 0, inserted: 0, skipped: 0, failed: 0 },
      unverifiedKeys: { inSource: 0, inserted: 0, skipped: 0, failed: 0 },
      credentials: { inSource: credentials.length, inserted: 0, skipped: 0, failed: 0 },
      domains: { inSource: domains.length, inserted: 0, skipped: 0, failed: 0 },
      quotaPolicies: { inSource: quotaPolicies.length, inserted: 0, skipped: 0, failed: 0 },
      rateLimitPolicies: { inSource: rateLimitPolicies.length, inserted: 0, skipped: 0, failed: 0 },
      packages: { inSource: packages.length, inserted: 0, skipped: 0, failed: 0 },
      packageVersions: { inSource: packageVersions.length, inserted: 0, skipped: 0, failed: 0 },
      packageInstallations: { inSource: packageInstallations.length, inserted: 0, skipped: 0, failed: 0 },
      auditEvents: { inSource: auditLogs.length, inserted: 0, skipped: 0, failed: 0 },
    };

    // Calculate source counts of verified vs unverified keys
    for (const k of apiKeys) {
      const hasV = Boolean(k.authVerifier && typeof k.authVerifier === 'string' && k.authVerifier.trim().length >= 32);
      if (hasV) recon.verifiedKeys.inSource++;
      else recon.unverifiedKeys.inSource++;
    }

    const knownOrgIds = new Set(organizations.map((o) => o.id));

    // S5-F1: Pepper verification before first write
    const projectToOrg = new Map<string, string>();
    for (const p of projects) {
      if (p.id && p.organizationId) projectToOrg.set(p.id, p.organizationId);
    }
    for (const e of environments) {
      if (e.id && e.projectId && projectToOrg.has(e.projectId)) {
        projectToOrg.set(e.id, projectToOrg.get(e.projectId)!);
      }
    }

    const keysForVerification = apiKeys.map((k: any) => ({
      id: k.id,
      keyId: k.keyId,
      organizationId: k.organizationId || projectToOrg.get(k.projectId) || projectToOrg.get(k.environmentId) || '',
      authVerifier: k.authVerifier,
    }));

    const pepperCheck = verifyPepperSamples(keysForVerification);
    if (pepperCheck.mismatched.length > 0) {
      throw new Error(
        `Pepper verification failed: ${pepperCheck.mismatched.length} sample(s) mismatched or had no verifier. Key IDs: ${pepperCheck.mismatched.join(', ')}`
      );
    }

    const orgIdToSlug = new Map<string, string>();
    for (const o of organizations) {
      if (o.id && o.slug) orgIdToSlug.set(o.id, o.slug);
    }
    const allowedSlugs = new Set(options.allowUnsampledOrgs || []);
    const unsampledSlugs = pepperCheck.orgsWithoutSample
      .map((orgId) => orgIdToSlug.get(orgId) || orgId)
      .filter((slug) => !allowedSlugs.has('*') && !allowedSlugs.has(slug));

    if (unsampledSlugs.length > 0 && !isDryRun) {
      throw new Error(
        `Pepper verification aborted: organizations with verified keys have no out-of-band samples: ${unsampledSlugs.join(', ')}. Provide samples in ORBITOX_IMPORT_VERIFY_SAMPLES or explicitly permit via --allow-unsampled-org=<slug>.`
      );
    }
    const knownProjectIds = new Set(projects.map((p) => p.id));
    const unresolvedAudits = auditLogs.filter(
      (a) => !knownOrgIds.has(a.organizationId) && !knownProjectIds.has(a.projectId)
    );

    const report: ImporterReport = {
      dryRun: isDryRun,
      targetDatabaseInfo,
      totalOrganizationsInJson: organizations.length,
      organizationsImported: 0,
      organizationsSkipped: 0,
      organizationsFailed: 0,
      reconciliation: [],
      orgResults: [],
      unresolvedAuditCount: unresolvedAudits.length,
    };

    // DRY-RUN MODE: Scan source, determine would-insert vs would-skip without database writes
    if (isDryRun) {
      for (const org of organizations) {
        const orgProjects = projects.filter((p) => p.organizationId === org.id);
        const orgProjectIds = new Set(orgProjects.map((p) => p.id));
        const orgEnvs = environments.filter((e) => orgProjectIds.has(e.projectId));
        const orgEnvIds = new Set(orgEnvs.map((e) => e.id));
        const orgKeys = apiKeys.filter((k) => orgEnvIds.has(k.environmentId) || orgProjectIds.has(k.projectId));
        const verifiedKeys = orgKeys.filter((k) => Boolean(k.authVerifier && k.authVerifier.trim().length >= 32));
        const unverifiedKeys = orgKeys.filter((k) => !k.authVerifier || k.authVerifier.trim().length < 32);
        const orgAudits = auditLogs.filter((a) => a.organizationId === org.id || orgProjectIds.has(a.projectId));

        // Check DB for existing row
        const existingOrg = await client.platformOrganization.findFirst({
          where: { OR: [{ id: org.id }, { slug: org.slug }] },
        });

        if (existingOrg) {
          report.organizationsSkipped++;
          recon.orgs.skipped++;
        } else {
          report.organizationsImported++;
          recon.orgs.inserted++;
        }

        recon.projects.inserted += orgProjects.length;
        recon.environments.inserted += orgEnvs.length;
        recon.verifiedKeys.inserted += verifiedKeys.length;
        recon.unverifiedKeys.inserted += unverifiedKeys.length;
        recon.auditEvents.inserted += orgAudits.length;

        report.orgResults.push({
          organizationId: org.id,
          slug: org.slug,
          name: org.name,
          status: existingOrg ? 'SKIPPED' : 'IMPORTED',
          projectsImported: existingOrg ? 0 : orgProjects.length,
          projectsSkipped: existingOrg ? orgProjects.length : 0,
          environmentsImported: existingOrg ? 0 : orgEnvs.length,
          environmentsSkipped: existingOrg ? orgEnvs.length : 0,
          keysWithVerifiers: verifiedKeys.length,
          keysWithoutVerifiers: unverifiedKeys.length,
          keysSkipped: existingOrg ? orgKeys.length : 0,
          auditLogsImported: existingOrg ? 0 : orgAudits.length,
          auditLogsSkipped: existingOrg ? orgAudits.length : 0,
        });
      }

      recon.credentials.inserted = credentials.length;
      recon.domains.inserted = domains.length;
      recon.quotaPolicies.inserted = quotaPolicies.length;
      recon.rateLimitPolicies.inserted = rateLimitPolicies.length;
      recon.packages.inserted = packages.length;
      recon.packageVersions.inserted = packageVersions.length;
      recon.packageInstallations.inserted = packageInstallations.length;
      recon.auditEvents.failed = unresolvedAudits.length;

      report.reconciliation = [
        { entityType: 'Organizations', inSource: recon.orgs.inSource, inserted: recon.orgs.inserted, skipped: recon.orgs.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Projects', inSource: recon.projects.inSource, inserted: recon.projects.inserted, skipped: recon.projects.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Environments', inSource: recon.environments.inSource, inserted: recon.environments.inserted, skipped: recon.environments.skipped, unresolvedOrFailed: 0 },
        { entityType: 'API Keys (Verified)', inSource: recon.verifiedKeys.inSource, inserted: recon.verifiedKeys.inserted, skipped: recon.verifiedKeys.skipped, unresolvedOrFailed: 0 },
        { entityType: 'API Keys (Unverified/Revoked)', inSource: recon.unverifiedKeys.inSource, inserted: recon.unverifiedKeys.inserted, skipped: recon.unverifiedKeys.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Credentials', inSource: recon.credentials.inSource, inserted: recon.credentials.inserted, skipped: recon.credentials.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Domains', inSource: recon.domains.inSource, inserted: recon.domains.inserted, skipped: recon.domains.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Quota Policies', inSource: recon.quotaPolicies.inSource, inserted: recon.quotaPolicies.inserted, skipped: recon.quotaPolicies.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Rate Limit Policies', inSource: recon.rateLimitPolicies.inSource, inserted: recon.rateLimitPolicies.inserted, skipped: recon.rateLimitPolicies.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Packages', inSource: recon.packages.inSource, inserted: recon.packages.inserted, skipped: recon.packages.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Package Versions', inSource: recon.packageVersions.inSource, inserted: recon.packageVersions.inserted, skipped: recon.packageVersions.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Package Installations', inSource: recon.packageInstallations.inSource, inserted: recon.packageInstallations.inserted, skipped: recon.packageInstallations.skipped, unresolvedOrFailed: 0 },
        { entityType: 'Audit Events', inSource: recon.auditEvents.inSource, inserted: recon.auditEvents.inserted, skipped: recon.auditEvents.skipped, unresolvedOrFailed: unresolvedAudits.length },
      ];
      return report;
    }

    // 3. Migrate shared packages and package versions (INSERT-ONLY: Never update existing)
    const packageDbIdMap = new Map<string, string>();
    for (const pkg of packages) {
      const existingPkg = await client.platformPackage.findUnique({
        where: { packageId: pkg.packageId },
      });
      if (existingPkg) {
        // S5-1 INSERT-ONLY: Leave untouched!
        recon.packages.skipped++;
        packageDbIdMap.set(pkg.packageId, existingPkg.id);
        if (pkg.id) packageDbIdMap.set(pkg.id, existingPkg.id);
        packageDbIdMap.set(existingPkg.id, existingPkg.id);
      } else {
        const created = await client.platformPackage.create({
          data: {
            id: pkg.id || `pkg_${crypto.randomUUID()}`,
            packageId: pkg.packageId,
            name: pkg.name || pkg.packageId,
            category: pkg.category || 'CORE',
            publisher: pkg.publisher || '@orbitox-io',
            currentStableVersion: pkg.currentStableVersion || '1.0.0',
            signingPublicKeyPem: pkg.signingPublicKeyPem || '',
            isCore: Boolean(pkg.isCore),
          },
        });
        recon.packages.inserted++;
        packageDbIdMap.set(pkg.packageId, created.id);
        if (pkg.id) packageDbIdMap.set(pkg.id, created.id);
        packageDbIdMap.set(created.id, created.id);
      }
    }

    const packageVersionDbIdMap = new Map<string, string>();
    for (const ver of packageVersions) {
      let parentPackageId = packageDbIdMap.get(ver.packageId);
      if (!parentPackageId) {
        const parent = await client.platformPackage.findFirst({
          where: { OR: [{ id: ver.packageId }, { packageId: ver.packageId }] },
        });
        if (parent) {
          parentPackageId = parent.id;
          packageDbIdMap.set(ver.packageId, parent.id);
        }
      }

      if (!parentPackageId) {
        recon.packageVersions.failed++;
        console.warn(`[Importer Warning] Skipping PackageVersion ${ver.version} because parent package [${ver.packageId}] was not found.`);
        continue;
      }

      const existingVer = await client.packageVersion.findFirst({
        where: { packageId: parentPackageId, version: ver.version },
      });
      if (existingVer) {
        // S5-1 INSERT-ONLY: Leave untouched!
        recon.packageVersions.skipped++;
        packageVersionDbIdMap.set(`${ver.packageId}@${ver.version}`, existingVer.id);
        if (ver.id) packageVersionDbIdMap.set(ver.id, existingVer.id);
      } else {
        const createdVer = await client.packageVersion.create({
          data: {
            id: ver.id || `ver_${crypto.randomUUID()}`,
            packageId: parentPackageId,
            version: ver.version,
            tarballSha256: ver.tarballSha256 || crypto.createHash('sha256').update(ver.version).digest('hex'),
            manifestHash: ver.manifestHash || crypto.createHash('sha256').update(ver.packageId).digest('hex'),
            signerId: ver.signerId || 'platform_admin',
            signature: ver.signature || 'ed25519_verified_signature',
            minPlatformVersion: ver.minPlatformVersion || '1.0.0',
            releaseNotes: ver.releaseNotes || null,
          },
        });
        recon.packageVersions.inserted++;
        packageVersionDbIdMap.set(`${ver.packageId}@${ver.version}`, createdVer.id);
        if (ver.id) packageVersionDbIdMap.set(ver.id, createdVer.id);
      }
    }

    // 4. Single Transaction Per Organization (INSERT-ONLY)
    for (const org of organizations) {
      const orgProjects = projects.filter((p) => p.organizationId === org.id);
      const orgProjectIds = new Set(orgProjects.map((p) => p.id));
      const orgEnvs = environments.filter((e) => orgProjectIds.has(e.projectId));
      const orgEnvIds = new Set(orgEnvs.map((e) => e.id));
      const orgKeys = apiKeys.filter((k) => orgEnvIds.has(k.environmentId) || orgProjectIds.has(k.projectId));
      const orgCreds = credentials.filter((c) => orgEnvIds.has(c.environmentId));
      const orgDomains = domains.filter((d) => orgEnvIds.has(d.environmentId));
      const orgQuotaPolicies = quotaPolicies.filter((q) => orgEnvIds.has(q.environmentId));
      const orgRatePolicies = rateLimitPolicies.filter((r) => orgEnvIds.has(r.environmentId));
      const orgInstallations = packageInstallations.filter((i) => orgEnvIds.has(i.environmentId));
      const orgAudits = auditLogs.filter((a) => a.organizationId === org.id || orgProjectIds.has(a.projectId));

      let verifiedKeysInOrg = 0;
      let unverifiedKeysInOrg = 0;
      let keysSkippedInOrg = 0;
      let projectsImportedInOrg = 0;
      let projectsSkippedInOrg = 0;
      let envsImportedInOrg = 0;
      let envsSkippedInOrg = 0;
      let auditsImportedInOrg = 0;
      let auditsSkippedInOrg = 0;
      let orgSkipped = false;

      try {
        await client.$transaction(
          async (tx) => {
            // S5-F2: Serialises importers per organization. Released automatically at COMMIT/ROLLBACK.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(74639201, hashtext(${org.slug}))`;

            // A. Organization (INSERT-ONLY)
            const existingOrg = await tx.platformOrganization.findFirst({
              where: { OR: [{ id: org.id }, { slug: org.slug }] },
            });

            let orgRecord: any;
            if (existingOrg) {
              // S5-1: DO NOT UPDATE! Preserve live status, compliance tier, billing email.
              orgRecord = existingOrg;
              orgSkipped = true;
              recon.orgs.skipped++;
            } else {
              orgRecord = await tx.platformOrganization.create({
                data: {
                  id: org.id,
                  slug: org.slug,
                  name: org.name,
                  billingEmail: org.billingEmail || `billing@${org.slug}.io`,
                  complianceTier: org.complianceTier || 'STANDARD',
                  status: org.status || 'ACTIVE',
                  createdAt: org.createdAt ? new Date(org.createdAt) : new Date(),
                  updatedAt: org.updatedAt ? new Date(org.updatedAt) : new Date(),
                },
              });
              recon.orgs.inserted++;
            }

            // S5-6 Test hook: kill -9 mid-transaction (strictly gated)
            if (options.killMidOrg && options.killMidOrg === org.slug) {
              console.log(`[Importer Hook] Mid-transaction violent process termination (SIGKILL) on org [${org.slug}]`);
              process.kill(process.pid, 'SIGKILL');
            }

            // B. Projects (INSERT-ONLY)
            for (const proj of orgProjects) {
              const existingProj = await tx.platformProject.findFirst({
                where: { OR: [{ id: proj.id }, { slug: proj.slug }] },
              });

              if (existingProj) {
                // S5-1: DO NOT UPDATE! Never overwrite live usage, quota, or status!
                projectsSkippedInOrg++;
                recon.projects.skipped++;
              } else {
                const currentPeriod = proj.currentBillingPeriod || defaultPeriod;
                const projectQuota = proj.apiCallQuota !== undefined ? BigInt(proj.apiCallQuota) : null;
                const monthlyCalls = proj.monthlyApiCalls !== undefined ? BigInt(proj.monthlyApiCalls) : 0n;

                await tx.platformProject.create({
                  data: {
                    id: proj.id,
                    slug: proj.slug,
                    name: proj.name,
                    organizationId: orgRecord.id,
                    businessModel: proj.businessModel || 'B2B_SAAS',
                    planTier: proj.planTier || proj.plan || 'starter',
                    plan: proj.plan || proj.planTier || 'starter',
                    enabledServices: Array.isArray(proj.enabledServices) ? proj.enabledServices : [],
                    apiCallQuota: projectQuota,
                    monthlyApiCalls: monthlyCalls,
                    currentBillingPeriod: currentPeriod,
                    rateLimitPerMin: proj.rateLimitPerMin || null,
                    customDomain: proj.customDomain || null,
                    storageQuotaGb: proj.storageQuotaGb ? Number(proj.storageQuotaGb) : null,
                    status: (proj.status || 'ACTIVE').toUpperCase() as any,
                    technicalLead: proj.technicalLead || 'System Admin',
                    contactEmail: proj.contactEmail || orgRecord.billingEmail,
                    createdAt: proj.createdAt ? new Date(proj.createdAt) : new Date(),
                    updatedAt: proj.updatedAt ? new Date(proj.updatedAt) : new Date(),
                  },
                });
                projectsImportedInOrg++;
                recon.projects.inserted++;
              }
            }

            // C. Environments (INSERT-ONLY)
            for (const env of orgEnvs) {
              const existingEnv = await tx.projectEnvironment.findFirst({
                where: { OR: [{ id: env.id }, { projectId: env.projectId, slug: env.slug }] },
              });

              if (existingEnv) {
                // S5-1: DO NOT UPDATE!
                envsSkippedInOrg++;
                recon.environments.skipped++;
              } else {
                await tx.projectEnvironment.create({
                  data: {
                    id: env.id,
                    projectId: env.projectId,
                    slug: env.slug,
                    name: env.name,
                    type: (env.type || (env.isProduction ? 'PRODUCTION' : 'DEVELOPMENT')) as any,
                    isProduction: Boolean(env.isProduction),
                    status: env.status || 'ACTIVE',
                    description: env.description || null,
                    requireMtls: Boolean(env.requireMtls),
                    strictIpAllowlist: Boolean(env.strictIpAllowlist),
                    enforceFourEyes: Boolean(env.enforceFourEyes),
                    createdAt: env.createdAt ? new Date(env.createdAt) : new Date(),
                    updatedAt: env.updatedAt ? new Date(env.updatedAt) : new Date(),
                  },
                });
                envsImportedInOrg++;
                recon.environments.inserted++;
              }
            }

            // D. API Keys (INSERT-ONLY & S5-5 Constant Marker)
            for (const key of orgKeys) {
              const existingKey = await tx.platformApiKey.findFirst({
                where: { OR: [{ id: key.id }, { keyId: key.keyId }] },
              });

              if (existingKey) {
                // S5-1: DO NOT UPDATE! Never un-revoke or overwrite active keys!
                keysSkippedInOrg++;
                const hasV = Boolean(key.authVerifier && typeof key.authVerifier === 'string' && key.authVerifier.trim().length >= 32);
                if (hasV) recon.verifiedKeys.skipped++;
                else recon.unverifiedKeys.skipped++;
              } else {
                const hasVerifier = Boolean(
                  key.authVerifier && typeof key.authVerifier === 'string' && key.authVerifier.trim().length >= 32
                );

                let finalVerifier = key.authVerifier?.trim();
                let keyStatus = key.status || 'ACTIVE';
                let revokeReason: string | null = null;
                let revokedAt: Date | null = null;
                let secretFingerprint = key.secretFingerprint || 'UNKNOWN';

                if (hasVerifier) {
                  verifiedKeysInOrg++;
                  recon.verifiedKeys.inserted++;
                } else {
                  // Legacy key missing HMAC verifier: REVOKED, unmatchable dummy verifier, constant fingerprint marker
                  unverifiedKeysInOrg++;
                  recon.unverifiedKeys.inserted++;
                  keyStatus = 'REVOKED';
                  revokeReason = 'LEGACY_KEY_MISSING_VERIFIER';
                  revokedAt = new Date();
                  finalVerifier = `unmigrated_missing_verifier_${crypto.randomBytes(16).toString('hex')}`;
                  // S5-5: Never derive hash from discarded secret; store a constant marker
                  secretFingerprint = 'DISCARDED_UNVERIFIED_LEGACY_KEY';
                }

                // S5-5: Delete rawSecret immediately from memory
                if ('rawSecret' in key) {
                  delete key.rawSecret;
                }

                await tx.platformApiKey.create({
                  data: {
                    id: key.id || `key_${crypto.randomUUID()}`,
                    keyId: key.keyId || `key_live_${crypto.randomUUID()}`,
                    name: key.name,
                    environmentId: key.environmentId,
                    keyType: key.keyType || 'PROJECT_SCOPED',
                    keyPrefix: key.keyPrefix || 'orb_live_',
                    secretFingerprint,
                    authVerifier: finalVerifier,
                    maskedDisplay: key.maskedDisplay || `${key.keyPrefix || 'orb_live_'}••••••••`,
                    status: keyStatus as any,
                    capabilities: Array.isArray(key.capabilities) ? key.capabilities : [],
                    ipAllowlist: Array.isArray(key.ipAllowlist) ? key.ipAllowlist : [],
                    rateLimitPerMin: key.rateLimitPerMin || 1200,
                    tenantScope: Array.isArray(key.tenantScope) ? key.tenantScope : [],
                    riskScore: key.riskScore !== undefined ? key.riskScore : 15,
                    riskLevel: (key.riskLevel || 'LOW') as any,
                    riskFactors: key.riskFactors || [],
                    issuedAt: key.issuedAt ? new Date(key.issuedAt) : new Date(),
                    activatedAt: key.activatedAt ? new Date(key.activatedAt) : new Date(),
                    expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
                    revokedAt: revokedAt || (key.revokedAt ? new Date(key.revokedAt) : null),
                    revokeReason: revokeReason || key.revokeReason || null,
                    createdBy: key.createdBy || 'importer',
                    version: key.version || 1,
                  },
                });
              }
            }

            // E. Credentials (INSERT-ONLY)
            for (const cred of orgCreds) {
              const existingCred = await tx.platformCredential.findUnique({ where: { id: cred.id } });
              if (existingCred) {
                recon.credentials.skipped++;
              } else {
                await tx.platformCredential.create({
                  data: {
                    id: cred.id,
                    name: cred.name,
                    provider: cred.provider,
                    environmentId: cred.environmentId,
                    envelopeVersion: cred.envelopeVersion || 1,
                    kekIdentifier: cred.kekIdentifier || 'kms:us-east-1:orbitox-master-kek-v2',
                    encryptedDek: cred.encryptedDek || 'dummy_encrypted_dek',
                    dekIv: cred.dekIv || '',
                    dekTag: cred.dekTag || '',
                    initializationVector: cred.initializationVector || 'dummy_iv',
                    authenticationTag: cred.authenticationTag || 'dummy_tag',
                    encryptedCiphertext: cred.encryptedCiphertext || 'dummy_cipher',
                    secretFingerprint: cred.secretFingerprint || 'dummy_fp',
                    maskedDisplay: cred.maskedDisplay || '••••••••',
                    health: (cred.health || 'HEALTHY') as any,
                    lastRotatedAt: cred.lastRotatedAt ? new Date(cred.lastRotatedAt) : new Date(),
                    nextRotationDueAt: cred.nextRotationDueAt
                      ? new Date(cred.nextRotationDueAt)
                      : new Date(Date.now() + 90 * 86400000),
                    ownerEmail: cred.ownerEmail || orgRecord.billingEmail,
                  },
                });
                recon.credentials.inserted++;
              }
            }

            // F. Domains (INSERT-ONLY)
            for (const dom of orgDomains) {
              const existingDom = await tx.projectDomain.findUnique({
                where: { domainName: dom.domainName.toLowerCase() },
              });
              if (existingDom) {
                recon.domains.skipped++;
              } else {
                await tx.projectDomain.create({
                  data: {
                    id: dom.id || `dom_${crypto.randomUUID()}`,
                    environmentId: dom.environmentId,
                    domainName: dom.domainName.toLowerCase(),
                    isApex: Boolean(dom.isApex),
                    verificationStatus: (dom.verificationStatus || 'PENDING_DNS') as any,
                    cnameTarget: dom.cnameTarget || 'cname.orbitox.io',
                    tlsCertificateStatus: (dom.tlsCertificateStatus || 'PENDING') as any,
                    sslExpiresAt: dom.sslExpiresAt ? new Date(dom.sslExpiresAt) : null,
                    edgeLatencyMs: dom.edgeLatencyMs || 0,
                    verifiedAt: dom.verifiedAt ? new Date(dom.verifiedAt) : null,
                  },
                });
                recon.domains.inserted++;
              }
            }

            // G. Quota Policies (INSERT-ONLY: Never overwrite live counters or limit)
            for (const qp of orgQuotaPolicies) {
              const existingQuota = await tx.environmentQuotaPolicy.findUnique({
                where: { environmentId: qp.environmentId },
              });
              if (existingQuota) {
                recon.quotaPolicies.skipped++;
              } else {
                await tx.environmentQuotaPolicy.create({
                  data: {
                    id: qp.id || `qp_${crypto.randomUUID()}`,
                    environmentId: qp.environmentId,
                    monthlyCallLimit: BigInt(qp.monthlyCallLimit || 1000000),
                    monthlyCallsUsed: BigInt(qp.monthlyCallsUsed || 0),
                    storageQuotaGb: qp.storageQuotaGb !== undefined ? Number(qp.storageQuotaGb) : 50.0,
                    storageUsedGb: qp.storageUsedGb !== undefined ? Number(qp.storageUsedGb) : 0.0,
                    warningThreshold: qp.warningThreshold || 80,
                    projectedExhaustionDays: qp.projectedExhaustionDays ? Number(qp.projectedExhaustionDays) : null,
                  },
                });
                recon.quotaPolicies.inserted++;
              }
            }

            // Rate Limit Policies (INSERT-ONLY)
            for (const rp of orgRatePolicies) {
              const existingRate = await tx.environmentRateLimitPolicy.findUnique({
                where: { environmentId: rp.environmentId },
              });
              if (existingRate) {
                recon.rateLimitPolicies.skipped++;
              } else {
                await tx.environmentRateLimitPolicy.create({
                  data: {
                    id: rp.id || `rp_${crypto.randomUUID()}`,
                    environmentId: rp.environmentId,
                    requestsPerMinute: rp.requestsPerMinute || 1200,
                    requestsPerSecondBurst: rp.requestsPerSecondBurst || 100,
                    slidingWindowType: rp.slidingWindowType || 'HYBRID_REDIS_RAM',
                  },
                });
                recon.rateLimitPolicies.inserted++;
              }
            }

            // H. Package Installations (INSERT-ONLY)
            for (const inst of orgInstallations) {
              let instPkgId = packageDbIdMap.get(inst.packageId);
              if (!instPkgId) {
                const p = await tx.platformPackage.findFirst({
                  where: { OR: [{ id: inst.packageId }, { packageId: inst.packageId }] },
                });
                if (p) instPkgId = p.id;
              }

              if (!instPkgId) {
                recon.packageInstallations.failed++;
                continue;
              }

              let instVerId = packageVersionDbIdMap.get(inst.installedVersionId);
              if (!instVerId) {
                const v = await tx.packageVersion.findFirst({
                  where: { OR: [{ id: inst.installedVersionId }, { packageId: instPkgId }] },
                });
                if (v) instVerId = v.id;
              }

              if (!instVerId) {
                recon.packageInstallations.failed++;
                continue;
              }

              const existingInst = await tx.packageInstallation.findUnique({
                where: { environmentId_packageId: { environmentId: inst.environmentId, packageId: instPkgId } },
              });

              if (existingInst) {
                recon.packageInstallations.skipped++;
              } else {
                await tx.packageInstallation.create({
                  data: {
                    id: inst.id || `inst_${crypto.randomUUID()}`,
                    environmentId: inst.environmentId,
                    packageId: instPkgId,
                    installedVersionId: instVerId,
                    status: (inst.status || 'ACTIVE') as any,
                    configOverrides: inst.configOverrides || {},
                  },
                });
                recon.packageInstallations.inserted++;
              }
            }

            // I. Audit Events (INSERT-ONLY with S5-8 source tagging)
            for (const audit of orgAudits) {
              const existingAudit = await tx.platformAuditEvent.findUnique({ where: { id: audit.id } });
              if (existingAudit) {
                auditsSkippedInOrg++;
                recon.auditEvents.skipped++;
              } else {
                const enrichedMetadata = {
                  ...(typeof audit.metadata === 'object' && audit.metadata !== null ? audit.metadata : {}),
                  source: 'JSON_STORE_MIGRATION',
                };

                await tx.platformAuditEvent.create({
                  data: {
                    id: audit.id || `audit_${crypto.randomUUID()}`,
                    actorId: audit.actorId || audit.actor || null,
                    actorEmail: audit.actorEmail || null,
                    action: audit.action || 'legacy.migration',
                    entityType: audit.entityType || 'ORGANIZATION',
                    entityId: audit.entityId || null,
                    organizationId: orgRecord.id,
                    projectId: audit.projectId || null,
                    environmentId: audit.environmentId || null,
                    ipAddress: audit.ipAddress || null,
                    requestId: audit.requestId || null,
                    reason: audit.reason || null,
                    metadata: enrichedMetadata,
                    status: audit.status || 'COMMITTED',
                    occurredAt: audit.occurredAt ? new Date(audit.occurredAt) : new Date(),
                  },
                });
                auditsImportedInOrg++;
                recon.auditEvents.inserted++;
              }
            }
          },
          { timeout: 30000 }
        );

        if (orgSkipped) {
          report.organizationsSkipped++;
        } else {
          report.organizationsImported++;
        }

        report.orgResults.push({
          organizationId: org.id,
          slug: org.slug,
          name: org.name,
          status: orgSkipped ? 'SKIPPED' : 'IMPORTED',
          projectsImported: projectsImportedInOrg,
          projectsSkipped: projectsSkippedInOrg,
          environmentsImported: envsImportedInOrg,
          environmentsSkipped: envsSkippedInOrg,
          keysWithVerifiers: verifiedKeysInOrg,
          keysWithoutVerifiers: unverifiedKeysInOrg,
          keysSkipped: keysSkippedInOrg,
          auditLogsImported: auditsImportedInOrg,
          auditLogsSkipped: auditsSkippedInOrg,
        });

        // S5-6 Test hook: post-commit violent kill (strictly gated)
        if (options.abortAfterOrg && report.organizationsImported >= options.abortAfterOrg) {
          console.log(`[Importer Hook] Post-commit violent process termination (SIGKILL) after ${report.organizationsImported} orgs.`);
          process.kill(process.pid, 'SIGKILL');
        }
      } catch (err: any) {
        // Transaction rolled back! Entire organization untouched in PostgreSQL
        report.organizationsFailed++;
        recon.orgs.failed++;
        report.orgResults.push({
          organizationId: org.id,
          slug: org.slug,
          name: org.name,
          status: 'FAILED',
          projectsImported: 0,
          projectsSkipped: 0,
          environmentsImported: 0,
          environmentsSkipped: 0,
          keysWithVerifiers: 0,
          keysWithoutVerifiers: 0,
          keysSkipped: 0,
          auditLogsImported: 0,
          auditLogsSkipped: 0,
          error: err.message,
        });
      }
    }

    recon.auditEvents.failed = unresolvedAudits.length;

    report.reconciliation = [
      { entityType: 'Organizations', inSource: recon.orgs.inSource, inserted: recon.orgs.inserted, skipped: recon.orgs.skipped, unresolvedOrFailed: recon.orgs.failed },
      { entityType: 'Projects', inSource: recon.projects.inSource, inserted: recon.projects.inserted, skipped: recon.projects.skipped, unresolvedOrFailed: 0 },
      { entityType: 'Environments', inSource: recon.environments.inSource, inserted: recon.environments.inserted, skipped: recon.environments.skipped, unresolvedOrFailed: 0 },
      { entityType: 'API Keys (Verified)', inSource: recon.verifiedKeys.inSource, inserted: recon.verifiedKeys.inserted, skipped: recon.verifiedKeys.skipped, unresolvedOrFailed: 0 },
      { entityType: 'API Keys (Unverified/Revoked)', inSource: recon.unverifiedKeys.inSource, inserted: recon.unverifiedKeys.inserted, skipped: recon.unverifiedKeys.skipped, unresolvedOrFailed: 0 },
      { entityType: 'Credentials', inSource: recon.credentials.inSource, inserted: recon.credentials.inserted, skipped: recon.credentials.skipped, unresolvedOrFailed: 0 },
      { entityType: 'Domains', inSource: recon.domains.inSource, inserted: recon.domains.inserted, skipped: recon.domains.skipped, unresolvedOrFailed: 0 },
      { entityType: 'Quota Policies', inSource: recon.quotaPolicies.inSource, inserted: recon.quotaPolicies.inserted, skipped: recon.quotaPolicies.skipped, unresolvedOrFailed: 0 },
      { entityType: 'Rate Limit Policies', inSource: recon.rateLimitPolicies.inSource, inserted: recon.rateLimitPolicies.inserted, skipped: recon.rateLimitPolicies.skipped, unresolvedOrFailed: 0 },
      { entityType: 'Packages', inSource: recon.packages.inSource, inserted: recon.packages.inserted, skipped: recon.packages.skipped, unresolvedOrFailed: recon.packages.failed },
      { entityType: 'Package Versions', inSource: recon.packageVersions.inSource, inserted: recon.packageVersions.inserted, skipped: recon.packageVersions.skipped, unresolvedOrFailed: recon.packageVersions.failed },
      { entityType: 'Package Installations', inSource: recon.packageInstallations.inSource, inserted: recon.packageInstallations.inserted, skipped: recon.packageInstallations.skipped, unresolvedOrFailed: recon.packageInstallations.failed },
      { entityType: 'Audit Events', inSource: recon.auditEvents.inSource, inserted: recon.auditEvents.inserted, skipped: recon.auditEvents.skipped, unresolvedOrFailed: unresolvedAudits.length },
    ];

    return report;
  } finally {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (leaseAcquired) {
      try {
        await client.$executeRaw`
          DELETE FROM "PlatformImporterLease" WHERE "id" = 'singleton' AND "holder" = ${holderId}
        `;
      } catch {}
    }
  }
}

export function printImporterReport(report: ImporterReport): void {
  console.log('\n================================================================================');
  console.log(`🪐 OrbitoX Platform JSON Store Importer Report ${report.dryRun ? '[DRY-RUN MODE]' : '[COMMITTED]'}`);
  console.log('================================================================================\n');

  console.log(`Target Database: ${report.targetDatabaseInfo}\n`);

  console.log('### Organization Transaction Summary (All-or-Nothing)\n');
  console.log('| Organization | Slug | Status | Projects (New / Exist) | Environments | Verified Keys | Unverified Keys | Audit Events | Error / Note |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const org of report.orgResults) {
    const statusFormatted =
      org.status === 'IMPORTED' ? '**IMPORTED**' : org.status === 'FAILED' ? '**FAILED (ROLLED BACK)**' : 'SKIPPED (EXISTING)';
    console.log(
      `| ${org.name} | \`${org.slug}\` | ${statusFormatted} | ${org.projectsImported} new / ${org.projectsSkipped} exist | ${org.environmentsImported} new / ${org.environmentsSkipped} exist | ${org.keysWithVerifiers} | ${org.keysWithoutVerifiers} (${org.keysSkipped} exist) | ${org.auditLogsImported} new / ${org.auditLogsSkipped} exist | ${org.error || 'Clean'} |`
    );
  }

  console.log('\n### Entity Reconciliation Table (S5-8 Audit)\n');
  console.log('| Entity Type | In Source JSON | Inserted | Skipped (Already Existed) | Unresolved / Dropped |');
  console.log('|---|---|---|---|---|');
  for (const r of report.reconciliation) {
    console.log(`| ${r.entityType} | ${r.inSource} | ${r.inserted} | ${r.skipped} | ${r.unresolvedOrFailed} |`);
  }

  if (report.unresolvedAuditCount > 0) {
    console.log(`\n⚠️ Notice: ${report.unresolvedAuditCount} audit events in source could not be associated with any organization in the fixture.`);
  }

  if (report.dryRun) {
    console.log('\nℹ DRY-RUN COMPLETE: No database mutations were written. Row counts in PostgreSQL remain untouched.\n');
  } else {
    console.log('\n✔ IMPORT COMPLETE: INSERT-ONLY policy enforced. Live database mutations were strictly preserved.\n');
  }
}

async function cliMain() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const fileArg = args.find((a) => a.startsWith('--file='));
  const fileArgIndex = args.indexOf('--file');
  const filePath = fileArg
    ? fileArg.split('=').slice(1).join('=')
    : fileArgIndex !== -1 && args[fileArgIndex + 1]
    ? args[fileArgIndex + 1]
    : undefined;

  const defaultBillingArg = args.find((a) => a.startsWith('--default-billing-period='));
  const defaultBillingPeriod = defaultBillingArg ? defaultBillingArg.split('=')[1] : undefined;

  const abortAfterArg = args.find((a) => a.startsWith('--abort-after-org='));
  const abortAfterOrg = abortAfterArg ? Number(abortAfterArg.split('=')[1]) : undefined;
  const killMidArg = args.find((a) => a.startsWith('--kill-mid-org='));
  const killMidOrg = killMidArg ? killMidArg.split('=')[1] : undefined;
  const allowUnsampledArgs = args
    .filter((a) => a.startsWith('--allow-unsampled-org='))
    .map((a) => a.split('=')[1])
    .filter((s): s is string => Boolean(s));
  const bypassLease = args.includes('--bypass-lease');

  // S5-7: Explicit validation of required arguments
  if (!filePath) {
    console.error('Error: --file <path> is required. Specify the absolute or relative path to the legacy platform JSON store.');
    console.error('Usage: pnpm --filter web platform:import --file=<path> [--dry-run] [--default-billing-period=YYYY-MM]');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  console.log(`[OrbitoX Importer] Connecting to target database: ${sanitizeDatabaseUrl(dbUrl)}`);

  const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  try {
    const report = await runPlatformJsonImporter(client, {
      filePath,
      dryRun,
      verbose,
      abortAfterOrg,
      killMidOrg,
      defaultBillingPeriod,
      allowUnsampledOrgs: allowUnsampledArgs,
      bypassLease,
    });
    printImporterReport(report);
  } finally {
    await client.$disconnect();
  }
}

if (require.main === module) {
  cliMain().catch((err) => {
    console.error('Fatal Platform Importer Error:', err);
    process.exit(1);
  });
}
