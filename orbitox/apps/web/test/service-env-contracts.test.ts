import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { PLATFORM_SERVICE_CONTRACTS } from '../lib/platform-service-contracts';

/**
 * ─────────────────────────────────────────────────────────────
 * OrbitoX Service Environment & Secret Static Contract Verification (B0-5)
 * ─────────────────────────────────────────────────────────────
 * Uses the TypeScript Compiler API AST parser to reliably extract
 * environment variable reads across each service's code paths.
 * Enforces strict bidirectional parity:
 * 1. (codeReads − ignore) === contract (no undeclared code reads; no unused contract variables)
 * 2. contract === terraform (1:1 parity with ECS Task Definitions)
 * ─────────────────────────────────────────────────────────────
 */

// Web service ignore list: development fallbacks, ambient cloud runtime indicators, and client SDKs
const GLOBAL_DEV_TEST_IGNORE: ReadonlyMap<string, string> = new Map([
  // Development / Local Test Fallbacks & Overrides
  ['ALLOW_UNAUTHENTICATED_DEV_MODE', 'Dev/test mock authorization bypass; disabled in production.'],
  ['APP_BASE_URL', 'Dev-only alias for ORBITOX_PUBLIC_BASE_URL.'],
  ['DATABASE_URL', 'Dev fallback connection string superseded by dedicated role URLs (APP_DATABASE_URL, etc.).'],
  ['DEBUG', 'Verbose debug logging toggle for local debugging.'],
  ['LOG_LEVEL', 'Runtime log level tuning override with built-in default.'],
  ['OPERATION_LEASE_TTL_SECONDS', 'Test harness operation lease duration override with built-in default.'],
  ['ORBITOX_DATA_DIR', 'Local filesystem data store path used only in offline JSON mode.'],
  ['ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS', 'Feature toggle for experimental development administrative routes.'],
  ['ORBITOX_SYNC_SAGA', 'Test harness flag to execute distributed saga transactions synchronously.'],
  ['ORBITOX_TEST_STANDALONE', 'Standalone local test runner flag bypassing external dependencies.'],
  ['TEST_STEP5_DELAY_MS', 'Test harness latency injection flag; strictly prohibited at production startup.'],
  ['TRUST_PROXY', 'Boolean convenience toggle superseded by explicit CIDR matching in TRUSTED_PROXIES.'],
  ['ORBITOX_ENABLE_DEMO_SEED', 'Dev-only database seeding toggle; strictly rejected at production startup.'],
  ['HOSPITALOS_URL', 'Dev-only route override; HospitalOS executes in-process via Next.js route handlers in production.'],

  // Ambient Infrastructure / Cloud Environment Variables
  ['AWS_ACCESS_KEY_ID', 'Ambient AWS credentials for local dev/testing; staging ECS tasks authenticate via IAM Task Role.'],
  ['AWS_SECRET_ACCESS_KEY', 'Ambient AWS credentials for local dev/testing; staging ECS tasks authenticate via IAM Task Role.'],
  ['AWS_SESSION_TOKEN', 'Ambient AWS credentials for local dev/testing; staging ECS tasks authenticate via IAM Task Role.'],
  ['AWS_REGION', 'Injected automatically into the container environment by AWS ECS Fargate runtime.'],
  ['KUBERNETES_SERVICE_HOST', 'Ambient container orchestration platform detector used in standalone health probes.'],
  ['VERCEL', 'Ambient cloud platform detector used for edge build/deployment compatibility.'],

  // Next.js Framework Internal Variables
  ['NEXT_PHASE', 'Next.js compiler internal phase indicator stripped before standalone runtime launch.'],
  ['NEXT_RUNTIME', 'Next.js server runtime indicator (nodejs vs edge).'],

  // Cluster Test Harness & Docker Compose
  ['CLUSTER_MODE', 'Docker compose multi-node cluster test harness flag; staging ECS uses standalone scaling.'],
  ['ORBITOX_DEPLOYMENT_MODE', 'Docker compose cluster test harness flag; staging ECS uses standalone scaling.'],
  ['NODE_ID', 'Docker compose cluster node identifier; staging ECS uses AWS Fargate task metadata.'],
  ['ORBITOX_LICENSE', 'Legacy admin system endpoint license override; OrbitoX Platform uses embedded license verification.'],
  ['ORBITOX_PUBLIC_KEY', 'Local CLI package release verification key override; production packages use embedded root keys.'],

  // Client SDK and Out-of-Scope Service Endpoints
  ['AZURE_OPENAI_API_KEY', 'Third-party AI model provider credential for external integrations.'],
  ['AZURE_OPENAI_MODEL', 'Third-party AI model configuration for external integrations.'],
  ['GEMINI_API_KEY', 'Third-party AI model provider credential for external integrations.'],
  ['GEMINI_MODEL', 'Third-party AI model configuration for external integrations.'],
  ['GOOGLE_AI_API_KEY', 'Third-party AI model provider credential for external integrations.'],
  ['OPENAI_API_KEY', 'Third-party AI model provider credential for external integrations.'],
  ['OPENAI_MODEL', 'Third-party AI model configuration for external integrations.'],
  ['ORBITOX_API_KEY', 'External client SDK authentication header credential.'],
  ['ORBITOX_CUSTOMER_API_KEY', 'External client SDK authentication header credential.'],
  ['ORBITOX_BACKEND_URL', 'Client SDK routing endpoint override for local multi-service development.'],
  ['ORBITOX_CONTROL_PLANE_PUBLIC_KEY', 'Client SDK single key fallback for standalone runtimes to verify control plane grants.'],
  ['ORBITOX_CONTROL_PLANE_PUBLIC_KEYS', 'Client SDK key ring fallback for standalone runtimes to verify control plane grants.'],
  ['ORBITOX_CONTROL_PLANE_URL', 'Client SDK routing endpoint override for local multi-service development.'],
  ['ORBITOX_DISABLE_AUTO_RESUME', 'Test runner flag to disable automatic tenant saga recovery.'],
  ['ORBITOX_DISABLE_KEY_USAGE_THROTTLE', 'Test runner flag to disable key usage throttling during stress tests.'],
  ['ORBITOX_DISABLE_SAMPLE_PLUGINS', 'Test runner flag to bypass sample plugin registration.'],
  ['ORBITOX_DOMAIN', '1-line bootstrapper domain configuration parameter for embedded apps.'],
  ['ORBITOX_GRANT_KEY_ID', 'Legacy single grant key identifier superseded by ORBITOX_GRANT_SIGNING_KEYS.'],
  ['ORBITOX_GRANT_PRIVATE_KEY', 'Legacy single grant private key superseded by ORBITOX_GRANT_SIGNING_KEYS.'],
  ['ORBITOX_GRANT_PUBLIC_KEY', 'Legacy single grant public key superseded by ORBITOX_GRANT_PUBLIC_KEYS.'],
  ['ORBITOX_INTERNAL_SECRET', 'Legacy token signing secret superseded by ORBITOX_CONTROL_SECRET.'],
  ['ORBITOX_LICENSE_KEY', '1-line bootstrapper license parameter for embedded library applications.'],
  ['ORBITOX_SERVER_PEPPER', 'Legacy single pepper environment variable superseded in production by pepper ring (ORBITOX_SERVER_PEPPERS).'],
  ['ORBITOX_SERVER_PEPPER_SECONDARY', 'Pepper ring secondary key fallback.'],
  ['ORBITOX_URL', 'External client SDK endpoint configuration.'],
  ['ORBITOX_WEBHOOK_SECRET', 'Mock sample plugin webhook verification secret for local test cases.'],
  ['ORBITOX_WEBHOOK_URL', 'Mock sample plugin webhook destination URL for local test cases.'],
  ['OUTBOX_RELAY_DATABASE_URL', 'Dedicated database connection string used exclusively by worker_email task.'],
  ['PLATFORM_AUDIT_DATABASE_URL', 'Legacy connection string alias superseded by PLATFORM_ADMIN_AUDIT_DATABASE_URL.'],
  ['POSTMARK_SERVER_TOKEN', 'Unused email provider option; production email delivery is standardized on Resend.'],
  ['REDIS_HOST', 'Optional Redis cache hostname used only when distributed clustering is enabled.'],
  ['REDIS_PORT', 'Optional Redis cache port used only when distributed clustering is enabled.'],
  ['REDIS_URL', 'Optional Redis cache connection string used only when distributed clustering is enabled.'],
  ['RESTAURANTOS_PLATFORM_TOKEN', 'Dev mock token for local cross-service bridge invocation tests.'],
  ['RESTAURANTOS_PUBLIC_URL', 'Dev routing URL for external OS microservice testing.'],
  ['RESTAURANTOS_RUNTIME_URL', 'Dev routing URL for external OS microservice testing.'],
  ['RESTAURANTOS_URL', 'Dev routing URL for external OS microservice testing.'],
  ['RESTAURANT_STORE_URL', 'Dev routing URL for external OS microservice testing.'],
  ['RESTAURANT_URL', 'Dev routing URL for external OS microservice testing.'],
  ['S3_BUCKET_NAME', 'S3 ObjectStore storage bucket name (used in Phase 6G ObjectStore).'],
  ['JWT_PRIVATE_KEY', 'Test fixture cryptographic key used in local token generation tests.'],
  ['JWT_PUBLIC_KEY', 'Test fixture cryptographic key used in local token generation tests.'],
]);

// Worker Email service ignore list: ambient AWS credentials and alternative providers
const WORKER_EMAIL_DEV_TEST_IGNORE: ReadonlyMap<string, string> = new Map([
  ['AWS_ACCESS_KEY_ID', 'Dev credentials for SES; ECS Fargate uses IAM task role.'],
  ['AWS_SECRET_ACCESS_KEY', 'Dev credentials for SES; ECS Fargate uses IAM task role.'],
  ['AWS_SESSION_TOKEN', 'Dev credentials for SES; ECS Fargate uses IAM task role.'],
  ['AWS_REGION', 'Injected automatically into the container environment by AWS ECS Fargate runtime.'],
  ['POSTMARK_SERVER_TOKEN', 'Unused email provider option; production email delivery is standardized on Resend.'],
]);

// RestaurantOS service ignore list: dev routes, offline station caches, and client header fallbacks
const RESTAURANT_OS_DEV_TEST_IGNORE: ReadonlyMap<string, string> = new Map([
  ['ALLOW_DANGEROUS_RESET', 'Dev/test state purge endpoint toggle; strictly forbidden and rejected at startup.'],
  ['JWT_SECRET', 'Legacy dev token fallback; removed from production code paths.'],
  ['STAFF_JWT_SECRET', 'Legacy dev token fallback; removed from production code paths.'],
  ['ORBITOX_PROJECT_ID', 'Client request header fallback parameter.'],
  ['ORBITOX_PROJECT_SLUG', 'Client request header fallback parameter.'],
  ['ORBITOX_RUNTIME_TOKEN', 'Legacy inter-service token superseded by cryptographic HMAC bridge (ORBITOX_BRIDGE_KEYS).'],
  ['ORBITOX_API_KEY', 'External client SDK authentication header credential.'],
  ['ORBITOX_BACKEND_URL', 'Dev callback URL override for local multi-service development.'],
  ['ORBITOX_CONTROL_PLANE_URL', 'Dev callback URL override for local multi-service development.'],
  ['ORBITOX_GRANT_PUBLIC_KEY', 'Legacy single grant public key superseded by ORBITOX_GRANT_PUBLIC_KEYS.'],
  ['PUBLIC_ORIGIN', 'Optional web origin override for local cross-origin browser testing.'],
  ['RESTAURANTOS_ORIGIN', 'Optional web origin override for local cross-origin browser testing.'],
  ['RESTAURANTOS_DISABLE_AUTOLISTEN', 'Test runner harness flag to prevent HTTP server binding during unit tests.'],
  ['RESTAURANTOS_ENABLE_TEST_ROUTES', 'Test route injection toggle disabled in production.'],
  ['RESTAURANTOS_PLATFORM_TOKEN', 'Dev mock token for local cross-service bridge invocation tests.'],
  ['RELOAD_STATION_SECRETS', 'Hot reload trigger for offline station POS cache.'],
  ['RESTAURANT_STORE_PATH', 'Local filesystem JSON storage path for dev mode without database.'],
  ['STORAGE_DRIVER', 'Dev storage driver toggle (json vs postgres); production enforces PostgreSQL.'],
  ['TENANT_PAYMENT_SECRET', 'Dynamic diner checkout signing secret derived on demand from tenant credentials.'],
  ['VERBOSE_LOGS', 'Verbose debug logging toggle for local debugging.'],
  ['RAZORPAY_BASE_URL', 'Diner direct payment gateway endpoint override for mock test harness.'],
  ['RAZORPAY_KEY_ID', 'Diner direct payment gateway credential handled at tenant level.'],
  ['RAZORPAY_KEY_SECRET', 'Diner direct payment gateway credential handled at tenant level.'],
  ['RAZORPAY_WEBHOOK_SECRET', 'Diner direct payment gateway credential handled at tenant level.'],
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

function isProcessEnv(node: ts.Node): boolean {
  return ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'process' &&
    node.name.text === 'env';
}

/**
 * Extracts environment variable access via TypeScript AST parsing.
 * Eliminates all regex artifacts and matches only genuine property/element
 * access on `process.env` or typed ProcessEnv parameters.
 */
function extractEnvReads(filePaths: string[]): Set<string> {
  const vars = new Set<string>();
  for (const fp of filePaths) {
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf8');
    const sourceFile = ts.createSourceFile(fp, content, ts.ScriptTarget.Latest, true);

    function visit(node: ts.Node) {
      // 1. process.env.NAME
      if (ts.isPropertyAccessExpression(node) && isProcessEnv(node.expression)) {
        vars.add(node.name.text);
      }
      // 2. process.env['NAME'] or process.env["NAME"]
      if (ts.isElementAccessExpression(node) && isProcessEnv(node.expression)) {
        if (node.argumentExpression && ts.isStringLiteral(node.argumentExpression)) {
          vars.add(node.argumentExpression.text);
        }
      }
      // 3. const { A, B: C } = process.env
      if (ts.isVariableDeclaration(node) && node.initializer && isProcessEnv(node.initializer) && ts.isObjectBindingPattern(node.name)) {
        for (const el of node.name.elements) {
          if (el.propertyName && ts.isIdentifier(el.propertyName)) {
            vars.add(el.propertyName.text);
          } else if (el.propertyName && ts.isStringLiteral(el.propertyName)) {
            vars.add(el.propertyName.text);
          } else if (ts.isIdentifier(el.name)) {
            vars.add(el.name.text);
          }
        }
      }
      // 4. env.NAME or env['NAME'] where env is a helper ProcessEnv parameter
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'env') {
        if (/^[A-Z0-9_]+$/.test(node.name.text)) {
          vars.add(node.name.text);
        }
      }
      if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'env') {
        if (node.argumentExpression && ts.isStringLiteral(node.argumentExpression) && /^[A-Z0-9_]+$/.test(node.argumentExpression.text)) {
          vars.add(node.argumentExpression.text);
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
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

describe('Phase 6F B0-5: Service Environment & Secret Static Code Contract Verification', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const mainTfPath = path.resolve(repoRoot, 'infra/modules/compute/main.tf');
  const mainTfContent = fs.readFileSync(mainTfPath, 'utf8');

  it('verifies exact bidirectional parity between code reads, contract, and terraform for web service', () => {
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

    const ignoredBreakdown = Array.from(rawReads)
      .filter((v) => GLOBAL_DEV_TEST_IGNORE.has(v))
      .sort()
      .map((v) => `  - ${v}: ${GLOBAL_DEV_TEST_IGNORE.get(v)}`);

    console.log('\n=================== SERVICE: WEB ===================');
    console.log('Total Raw AST Code Reads:', rawReads.size);
    console.log('Production Code Reads (codeReads - ignore):', prodCodeReads);
    console.log('Contract (platform-service-contracts.ts):', contractAll);
    console.log('Terraform Task Definition (compute/main.tf):', tfAll);
    console.log('Ignored Dev/Ambient Variables with Reasons:\n' + ignoredBreakdown.join('\n'));
    console.log('====================================================\n');

    // 1. Every contract variable must be read by code
    for (const name of contractAll) {
      assert.ok(
        rawReads.has(name),
        `Contract variable "${name}" is never read by web runtime code`,
      );
    }

    // 2. Strict bidirectional equality: (codeReads - ignore) === contract
    assert.deepEqual(prodCodeReads, contractAll, 'All production web code reads must exactly match the contract');

    // 3. 1:1 parity between contract and terraform
    assert.deepEqual(contractAll, tfAll, 'Contract and Terraform must match exactly for web');
  });

  it('verifies exact bidirectional parity between code reads, contract, and terraform for worker_email service', () => {
    const emailFiles = [
      path.resolve(repoRoot, 'orbitox/apps/web/scripts/account-email-worker.ts'),
      path.resolve(repoRoot, 'orbitox/apps/web/lib/account-email-worker.ts'),
      path.resolve(repoRoot, 'orbitox/apps/web/lib/account-email.ts'),
      path.resolve(repoRoot, 'orbitox/apps/web/lib/account-email-payload.ts'),
    ];

    const rawReads = extractEnvReads(emailFiles);
    const prodCodeReads = Array.from(rawReads).filter((v) => !WORKER_EMAIL_DEV_TEST_IGNORE.has(v)).sort();

    const contract = PLATFORM_SERVICE_CONTRACTS.worker_email;
    const contractAll = [...contract.environment, ...contract.secrets].sort();

    const tf = parseTerraformTaskDefinition(mainTfContent, 'family                   = "orbitox-${var.environment}-worker-email"');
    const tfAll = [...tf.environment, ...tf.secrets].sort();

    const ignoredBreakdown = Array.from(rawReads)
      .filter((v) => WORKER_EMAIL_DEV_TEST_IGNORE.has(v))
      .sort()
      .map((v) => `  - ${v}: ${WORKER_EMAIL_DEV_TEST_IGNORE.get(v)}`);

    console.log('\n================ SERVICE: WORKER_EMAIL ================');
    console.log('Total Raw AST Code Reads:', rawReads.size);
    console.log('Production Code Reads (codeReads - ignore):', prodCodeReads);
    console.log('Contract:', contractAll);
    console.log('Terraform Task Definition:', tfAll);
    console.log('Ignored Dev/Ambient Variables with Reasons:\n' + ignoredBreakdown.join('\n'));
    console.log('=======================================================\n');

    for (const name of contractAll) {
      assert.ok(
        rawReads.has(name),
        `Contract variable "${name}" is not read in worker_email runtime code`,
      );
    }

    assert.deepEqual(prodCodeReads, contractAll, 'All production worker_email code reads must exactly match the contract');
    assert.deepEqual(contractAll, tfAll, 'Contract and Terraform must match exactly for worker_email');
  });

  it('verifies exact bidirectional parity between code reads, contract, and terraform for worker_sweep service', () => {
    const sweepFiles = [
      path.resolve(repoRoot, 'orbitox/apps/web/scripts/billing-grace-sweep.ts'),
      path.resolve(repoRoot, 'orbitox/apps/web/lib/billing-grace-sweep.ts'),
    ];

    const rawReads = extractEnvReads(sweepFiles);
    const prodCodeReads = Array.from(rawReads).sort();

    const contract = PLATFORM_SERVICE_CONTRACTS.worker_sweep;
    const contractAll = [...contract.environment, ...contract.secrets].sort();

    const tf = parseTerraformTaskDefinition(mainTfContent, 'family                   = "orbitox-${var.environment}-worker-sweep"');
    const tfAll = [...tf.environment, ...tf.secrets].sort();

    console.log('\n================ SERVICE: WORKER_SWEEP ================');
    console.log('Total Raw AST Code Reads:', rawReads.size);
    console.log('Production Code Reads (codeReads - ignore):', prodCodeReads);
    console.log('Contract:', contractAll);
    console.log('Terraform Task Definition:', tfAll);
    console.log('Ignored Dev/Ambient Variables with Reasons: None (100% pure parity)');
    console.log('=======================================================\n');

    for (const name of contractAll) {
      assert.ok(
        rawReads.has(name),
        `Contract variable "${name}" is not read in worker_sweep runtime code`,
      );
    }

    assert.deepEqual(prodCodeReads, contractAll, 'All production worker_sweep code reads must exactly match the contract');
    assert.deepEqual(contractAll, tfAll, 'Contract and Terraform must match exactly for worker_sweep');
  });

  it('verifies exact bidirectional parity between code reads, contract, and terraform for restaurant_os service', () => {
    const rosFiles = [
      ...scanDirectory(path.resolve(repoRoot, 'projects/external-os/restaurant-os/src')),
      ...scanDirectory(path.resolve(repoRoot, 'projects/external-os/restaurant-os/packages')),
      ...scanDirectory(path.resolve(repoRoot, 'orbitox/packages/bridge/src')),
    ];

    const rawReads = extractEnvReads(rosFiles);
    const prodCodeReads = Array.from(rawReads)
      .filter((v) => !RESTAURANT_OS_DEV_TEST_IGNORE.has(v))
      .sort();

    const contract = PLATFORM_SERVICE_CONTRACTS.restaurant_os;
    const contractAll = [...contract.environment, ...contract.secrets].sort();

    const tf = parseTerraformTaskDefinition(mainTfContent, 'family                   = "orbitox-${var.environment}-restaurant-os"');
    const tfAll = [...tf.environment, ...tf.secrets].sort();

    const ignoredBreakdown = Array.from(rawReads)
      .filter((v) => RESTAURANT_OS_DEV_TEST_IGNORE.has(v))
      .sort()
      .map((v) => `  - ${v}: ${RESTAURANT_OS_DEV_TEST_IGNORE.get(v)}`);

    console.log('\n=============== SERVICE: RESTAURANT_OS ===============');
    console.log('Total Raw AST Code Reads:', rawReads.size);
    console.log('Production Code Reads (codeReads - ignore):', prodCodeReads);
    console.log('Contract:', contractAll);
    console.log('Terraform Task Definition:', tfAll);
    console.log('Ignored Dev/Ambient Variables with Reasons:\n' + ignoredBreakdown.join('\n'));
    console.log('======================================================\n');

    for (const name of contractAll) {
      assert.ok(
        rawReads.has(name),
        `RestaurantOS contract variable "${name}" is not read by RestaurantOS or bridge code`,
      );
    }

    assert.deepEqual(prodCodeReads, contractAll, 'All production restaurant_os code reads must exactly match the contract');
    assert.deepEqual(contractAll, tfAll, 'Contract and Terraform must match exactly for restaurant_os');
  });
});
