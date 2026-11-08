import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PLATFORM_SERVICE_CONTRACTS } from '../lib/platform-service-contracts';

/**
 * ─────────────────────────────────────────────────────────────
 * OrbitoX Service Environment & Secret Contract Verification (B0-3)
 * ─────────────────────────────────────────────────────────────
 * Statically collects environment variables read across each service's
 * runtime code paths and enforces strict 1:1 parity between:
 * 1. Variables read by code
 * 2. Variables defined in PLATFORM_SERVICE_CONTRACTS
 * 3. Variables injected in Terraform ECS Task Definitions
 * ─────────────────────────────────────────────────────────────
 */

// Explicit, commented ignore list of non-production, dev-only, test-only, and framework internals
const GLOBAL_DEV_TEST_IGNORE = new Set([
  // Development / Local Test Fallbacks & Overrides
  'ALLOW_UNAUTHENTICATED_DEV_MODE', // Bypass auth in local mock testing
  'APP_BASE_URL',                  // Legacy dev fallback for ORBITOX_PUBLIC_BASE_URL
  'DATABASE_URL',                 // Local dev fallback when dedicated role URLs are not supplied
  'DEBUG',                        // Debug log toggle
  'LOG_LEVEL',                    // Log level verbosity
  'OPERATION_LEASE_TTL_SECONDS',  // Dynamic lease tuning with built-in default
  'ORBITOX_DATA_DIR',             // Local dev file store directory
  'ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS', // Feature toggle for experimental dev endpoints
  'ORBITOX_SYNC_SAGA',            // Test harness synchronous saga flag
  'ORBITOX_TEST_STANDALONE',       // Local standalone test harness flag
  'TEST_STEP5_DELAY_MS',          // Test harness latency injection flag
  'TRUSTED_PROXIES',              // Reverse proxy trust list
  'TRUST_PROXY',                  // Reverse proxy trust toggle

  // Ambient Infrastructure / Cloud Environment Variables
  'AWS_ACCESS_KEY_ID',            // Dev credentials; ECS Fargate uses IAM task role
  'AWS_SECRET_ACCESS_KEY',        // Dev credentials; ECS Fargate uses IAM task role
  'AWS_SESSION_TOKEN',            // Dev credentials; ECS Fargate uses IAM task role
  'AWS_REGION',                   // Provided automatically by AWS ECS Fargate execution environment
  'KUBERNETES_SERVICE_HOST',       // Platform detection heuristic
  'VERCEL',                       // Platform detection heuristic

  // Next.js Framework Internal Variables
  'NEXT_PHASE',                   // Next.js build-phase indicator
  'NEXT_RUNTIME',                 // Next.js runtime environment (nodejs/edge)

  // Client SDK and Out-of-Scope Service Endpoints
  'AZURE_OPENAI_API_KEY',         // External plugin optional integration
  'AZURE_OPENAI_MODEL',           // External plugin optional integration
  'GEMINI_API_KEY',               // External plugin optional integration
  'GEMINI_MODEL',                 // External plugin optional integration
  'GOOGLE_AI_API_KEY',            // External plugin optional integration
  'OPENAI_API_KEY',               // External plugin optional integration
  'OPENAI_MODEL',                 // External plugin optional integration
  'ORBITOX_API_KEY',              // Client-side SDK credential
  'ORBITOX_CUSTOMER_API_KEY',     // Client-side SDK credential
  'ORBITOX_BACKEND_URL',          // Dev fallback URL for local multi-service testing
  'ORBITOX_CONTROL_PLANE_PUBLIC_KEY', // Client SDK grant verification key
  'ORBITOX_CONTROL_PLANE_PUBLIC_KEYS', // Client SDK grant verification key
  'ORBITOX_CONTROL_PLANE_URL',    // Dev fallback URL for local multi-service testing
  'ORBITOX_DISABLE_AUTO_RESUME',  // Test runner flag
  'ORBITOX_DISABLE_KEY_USAGE_THROTTLE', // Test runner flag
  'ORBITOX_DISABLE_SAMPLE_PLUGINS',     // Test runner flag
  'ORBITOX_DOMAIN',               // 1-line bootstrapper domain parameter
  'ORBITOX_GRANT_KEY_ID',         // Legacy grant key ID fallback
  'ORBITOX_GRANT_PRIVATE_KEY',    // Legacy single grant private key fallback
  'ORBITOX_GRANT_PUBLIC_KEY',     // Single public key fallback (superseded by ORBITOX_GRANT_PUBLIC_KEYS)
  'ORBITOX_INTERNAL_SECRET',      // Legacy internal token secret (superseded by ORBITOX_CONTROL_SECRET)
  'ORBITOX_LICENSE_KEY',          // 1-line bootstrapper license parameter
  'ORBITOX_SERVER_PEPPERS',       // Pepper ring multi-key map (superseded by ORBITOX_SERVER_PEPPER)
  'ORBITOX_SERVER_PEPPER_ACTIVE', // Pepper ring active key ID
  'ORBITOX_SERVER_PEPPER_SECONDARY', // Legacy dual pepper fallback
  'ORBITOX_URL',                  // Client SDK endpoint URL
  'ORBITOX_WEBHOOK_SECRET',       // Mock sample plugin webhook secret
  'ORBITOX_WEBHOOK_URL',          // Mock sample plugin webhook URL
  'OUTBOX_RELAY_DATABASE_URL',    // Handled by dedicated worker_email service
  'PLATFORM_AUDIT_DATABASE_URL',  // Legacy alias for PLATFORM_ADMIN_AUDIT_DATABASE_URL
  'POSTMARK_SERVER_TOKEN',        // Alternative email provider option
  'REDIS_HOST',                   // Optional Redis cache setting
  'REDIS_PORT',                   // Optional Redis cache setting
  'REDIS_URL',                    // Optional Redis cache setting
  'RESTAURANTOS_PLATFORM_TOKEN',  // Test authentication token
  'RESTAURANTOS_PUBLIC_URL',      // Dev routing URL
  'RESTAURANTOS_RUNTIME_URL',     // Dev routing URL
  'RESTAURANTOS_URL',             // Dev routing URL
  'RESTAURANT_STORE_URL',         // Dev routing URL
  'RESTAURANT_URL',               // Dev routing URL
  'S3_BUCKET_NAME',               // S3 storage bucket name (Phase 6G ObjectStore)
  'JWT_PRIVATE_KEY',              // Legacy test fixture
  'JWT_PUBLIC_KEY',               // Legacy test fixture
]);

const RESTAURANT_OS_DEV_TEST_IGNORE = new Set([
  'ALLOW_DANGEROUS_RESET',        // Forbidden in production (strictly checked at startup)
  'JWT_SECRET',                   // Legacy token secret fallback
  'STAFF_AUTH_SECRET',            // Dev station auth fallback
  'STAFF_JWT_SECRET',             // Dev station auth fallback
  'ORBITOX_PROJECT_ID',           // Client request header fallback
  'ORBITOX_PROJECT_SLUG',         // Client request header fallback
  'ORBITOX_RUNTIME_TOKEN',        // Platform-to-runtime token fallback (superseded by HMAC bridge)
  'ORBITOX_API_KEY',              // Client SDK credential
  'ORBITOX_BACKEND_URL',          // Dev callback URL
  'ORBITOX_CONTROL_PLANE_URL',    // Dev callback URL
  'ORBITOX_GRANT_PUBLIC_KEY',     // Single public key fallback (superseded by ORBITOX_GRANT_PUBLIC_KEYS)
  'PUBLIC_ORIGIN',                // Optional origin override
  'RESTAURANTOS_ORIGIN',          // Optional origin override
  'RESTAURANTOS_ALLOWED_ORIGINS', // Optional CORS list override
  'RESTAURANTOS_BASE_DOMAIN',     // Base domain override
  'RESTAURANTOS_CNAME_TARGET',    // CNAME target override
  'RESTAURANTOS_DISABLE_AUTOLISTEN', // Test runner flag to prevent auto-listen
  'RESTAURANTOS_ENABLE_TEST_ROUTES',  // Test route injection toggle
  'RESTAURANTOS_PLATFORM_TOKEN',  // Dev test token
  'RESTAURANT_GSTIN',             // Invoice header setting with UNREGISTERED fallback
  'RESTAURANT_STATION_SECRETS',   // Offline station cache secrets
  'RELOAD_STATION_SECRETS',       // Offline station cache reload toggle
  'RESTAURANT_STORE_PATH',        // Dev filesystem JSON storage path
  'STORAGE_DRIVER',               // Dev storage driver toggle (prod requires postgres)
  'TENANT_PAYMENT_SECRET',        // Tenant payment signing secret (derived on demand)
  'TRUSTED_PROXIES',              // Reverse proxy trust setting
  'VERBOSE_LOGS',                 // Log verbosity toggle
  'RAZORPAY_BASE_URL',            // Diner direct payment gateway
  'RAZORPAY_KEY_ID',              // Diner direct payment gateway
  'RAZORPAY_KEY_SECRET',          // Diner direct payment gateway
  'RAZORPAY_WEBHOOK_SECRET',      // Diner direct payment gateway
]);

function scanDirectory(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('dist') && file !== 'test' && file !== 'tests') {
        results = results.concat(scanDirectory(full));
      }
    } else if (/\.(ts|js|tsx|jsx)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

function extractEnvReads(filePaths: string[]): Set<string> {
  const vars = new Set<string>();
  const patterns = [
    /process\.env\.([A-Za-z0-9_]+)/g,
    /process\.env\[['"]([A-Za-z0-9_]+)['"]\]/g,
    /\benv\.([A-Za-z0-9_]+)/g,
    /\benv\[['"]([A-Za-z0-9_]+)['"]\]/g,
    /getEnv\(['"]([A-Za-z0-9_]+)['"]\)/g,
    /name:\s*['"]([A-Z0-9_]+)['"]/g,
  ];

  for (const fp of filePaths) {
    const content = fs.readFileSync(fp, 'utf8');
    for (const pat of patterns) {
      let match;
      while ((match = pat.exec(content)) !== null) {
        if (match[1]) {
          vars.add(match[1]);
        }
      }
    }
  }
  return vars;
}

function parseTerraformTaskDefinition(mainTfContent: string, taskFamilySnippet: string): { environment: string[]; secrets: string[] } {
  const taskDefIndex = mainTfContent.indexOf(taskFamilySnippet);
  assert.notEqual(taskDefIndex, -1, `Could not find task definition snippet "${taskFamilySnippet}" in compute/main.tf`);

  const nextTaskDefIndex = mainTfContent.indexOf('resource "aws_ecs_task_definition"', taskDefIndex + 1);
  const block = mainTfContent.slice(taskDefIndex, nextTaskDefIndex !== -1 ? nextTaskDefIndex : undefined);

  const envVars: string[] = [];
  const secretVars: string[] = [];

  const envRegex = /environment\s*=\s*\[([\s\S]*?)\]\s*(secrets\s*=|logConfiguration\s*=)/;
  const envMatch = block.match(envRegex);
  if (envMatch && envMatch[1]) {
    const nameRegex = /name\s*=\s*"([^"]+)"/g;
    let m;
    while ((m = nameRegex.exec(envMatch[1])) !== null) {
      if (m[1]) {
        envVars.push(m[1]);
      }
    }
  }

  const secRegex = /secrets\s*=\s*\[([\s\S]*?)\]\s*logConfiguration\s*=/;
  const secMatch = block.match(secRegex);
  if (secMatch && secMatch[1]) {
    const nameRegex = /name\s*=\s*"([^"]+)"/g;
    let m;
    while ((m = nameRegex.exec(secMatch[1])) !== null) {
      if (m[1]) {
        secretVars.push(m[1]);
      }
    }
  }

  return { environment: envVars.sort(), secrets: secretVars.sort() };
}

describe('Phase 6F B0-3: Service Environment & Secret Static Code Contract Verification', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const mainTfPath = path.resolve(repoRoot, 'infra/modules/compute/main.tf');
  const mainTfContent = fs.readFileSync(mainTfPath, 'utf8');

  it('verifies static code env reads match contract and terraform for web service', () => {
    const webFiles = [
      ...scanDirectory(path.resolve(repoRoot, 'orbitox/apps/web/app')),
      ...scanDirectory(path.resolve(repoRoot, 'orbitox/apps/web/lib')),
      ...fs.readdirSync(path.resolve(repoRoot, 'orbitox/apps/web'))
        .filter((f) => f.startsWith('instrumentation'))
        .map((f) => path.resolve(repoRoot, 'orbitox/apps/web', f)),
      ...scanDirectory(path.resolve(repoRoot, 'orbitox/packages')),
    ];

    const rawReads = extractEnvReads(webFiles);
    const prodCodeReads = Array.from(rawReads).filter((v) => !GLOBAL_DEV_TEST_IGNORE.has(v)).sort();

    const contract = PLATFORM_SERVICE_CONTRACTS.web;
    const contractAll = [...contract.environment, ...contract.secrets].sort();

    const tf = parseTerraformTaskDefinition(mainTfContent, 'family                   = "orbitox-${var.environment}-web"');
    const tfAll = [...tf.environment, ...tf.secrets].sort();

    console.log('\n=================== SERVICE: WEB ===================');
    console.log('Code Runtime Reads (excl. dev/test ignore):', prodCodeReads);
    console.log('Contract (platform-service-contracts.ts):', contractAll);
    console.log('Terraform Task Definition (compute/main.tf):', tfAll);
    console.log('====================================================\n');

    // 1. Every contract variable must be read by code
    for (const name of contractAll) {
      assert.ok(
        rawReads.has(name),
        `Contract variable "${name}" is never read by web runtime code`,
      );
    }

    // 2. Parity between contract and terraform
    assert.deepEqual(contractAll, tfAll, 'Contract and Terraform must match exactly for web');
  });

  it('verifies static code env reads match contract and terraform for worker_email service', () => {
    const emailFiles = [
      path.resolve(repoRoot, 'orbitox/apps/web/scripts/account-email-worker.ts'),
      path.resolve(repoRoot, 'orbitox/apps/web/lib/account-email-worker.ts'),
      path.resolve(repoRoot, 'orbitox/apps/web/lib/account-email.ts'),
      path.resolve(repoRoot, 'orbitox/apps/web/lib/phase6-account-security.ts'),
    ];

    const rawReads = extractEnvReads(emailFiles);
    const contract = PLATFORM_SERVICE_CONTRACTS.worker_email;
    const contractAll = [...contract.environment, ...contract.secrets].sort();

    const tf = parseTerraformTaskDefinition(mainTfContent, 'family                   = "orbitox-${var.environment}-worker-email"');
    const tfAll = [...tf.environment, ...tf.secrets].sort();

    console.log('\n================ SERVICE: WORKER_EMAIL ================');
    console.log('Code Runtime Reads:', Array.from(rawReads).sort());
    console.log('Contract:', contractAll);
    console.log('Terraform Task Definition:', tfAll);
    console.log('=======================================================\n');

    for (const name of contract.secrets) {
      assert.ok(
        rawReads.has(name),
        `Secret "${name}" is not read in worker_email runtime code`,
      );
    }

    assert.deepEqual(contractAll, tfAll, 'Contract and Terraform must match exactly for worker_email');
  });

  it('verifies static code env reads match contract and terraform for worker_sweep service', () => {
    const sweepFiles = [
      path.resolve(repoRoot, 'orbitox/apps/web/scripts/billing-grace-sweep.ts'),
      path.resolve(repoRoot, 'orbitox/apps/web/lib/billing-grace-sweep.ts'),
    ];

    const rawReads = extractEnvReads(sweepFiles);
    const contract = PLATFORM_SERVICE_CONTRACTS.worker_sweep;
    const contractAll = [...contract.environment, ...contract.secrets].sort();

    const tf = parseTerraformTaskDefinition(mainTfContent, 'family                   = "orbitox-${var.environment}-worker-sweep"');
    const tfAll = [...tf.environment, ...tf.secrets].sort();

    console.log('\n================ SERVICE: WORKER_SWEEP ================');
    console.log('Code Runtime Reads:', Array.from(rawReads).sort());
    console.log('Contract:', contractAll);
    console.log('Terraform Task Definition:', tfAll);
    console.log('=======================================================\n');

    for (const name of contract.secrets) {
      assert.ok(
        rawReads.has(name),
        `Secret "${name}" is not read in worker_sweep runtime code`,
      );
    }

    assert.deepEqual(contractAll, tfAll, 'Contract and Terraform must match exactly for worker_sweep');
  });

  it('verifies static code env reads match contract and terraform for restaurant_os service', () => {
    const rosFiles = [
      ...scanDirectory(path.resolve(repoRoot, 'projects/external-os/restaurant-os/src')),
      ...scanDirectory(path.resolve(repoRoot, 'projects/external-os/restaurant-os/packages')),
    ];

    const rawReads = extractEnvReads(rosFiles);
    // Include bridge package reads as restaurant_os relies on @orbitox-io/bridge
    const bridgeFiles = scanDirectory(path.resolve(repoRoot, 'orbitox/packages/bridge/src'));
    for (const v of extractEnvReads(bridgeFiles)) {
      rawReads.add(v);
    }

    const contract = PLATFORM_SERVICE_CONTRACTS.restaurant_os;
    const contractAll = [...contract.environment, ...contract.secrets].sort();

    const tf = parseTerraformTaskDefinition(mainTfContent, 'family                   = "orbitox-${var.environment}-restaurant-os"');
    const tfAll = [...tf.environment, ...tf.secrets].sort();

    console.log('\n=============== SERVICE: RESTAURANT_OS ===============');
    console.log('Code Runtime Reads (excl. dev/test ignore):', Array.from(rawReads).filter((v) => !RESTAURANT_OS_DEV_TEST_IGNORE.has(v) && (!GLOBAL_DEV_TEST_IGNORE.has(v) || v === 'DATABASE_URL')).sort());
    console.log('Contract:', contractAll);
    console.log('Terraform Task Definition:', tfAll);
    console.log('======================================================\n');

    for (const name of contractAll) {
      assert.ok(
        rawReads.has(name),
        `RestaurantOS contract variable "${name}" is not read by RestaurantOS or bridge code`,
      );
    }

    assert.deepEqual(contractAll, tfAll, 'Contract and Terraform must match exactly for restaurant_os');
  });
});
