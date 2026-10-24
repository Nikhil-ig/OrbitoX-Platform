#!/usr/bin/env node

/**
 * 🪐 OrbitoX Project Scaffold Generator
 *
 * Scaffolds an `orbitox.manifest.json` and `orbitox-client.ts` (or .js)
 * ready to plug into any Node/TypeScript application to join the OrbitoX fleet.
 *
 * Usage:
 *   node scripts/scaffold-project.mjs --name "My SaaS App" --slug "my-saas-app"
 *   node scripts/scaffold-project.mjs --help
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    name: '',
    slug: '',
    url: 'http://localhost:3005',
    port: 4000,
    out: './',
    format: 'ts',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--name' && i + 1 < args.length) {
      options.name = args[++i];
    } else if (arg === '--slug' && i + 1 < args.length) {
      options.slug = args[++i];
    } else if (arg === '--url' && i + 1 < args.length) {
      options.url = args[++i];
    } else if (arg === '--port' && i + 1 < args.length) {
      options.port = parseInt(args[++i], 10) || 4000;
    } else if (arg === '--out' && i + 1 < args.length) {
      options.out = args[++i];
    } else if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i].toLowerCase() === 'js' ? 'js' : 'ts';
    } else if (arg === '--js') {
      options.format = 'js';
    } else if (arg === '--ts') {
      options.format = 'ts';
    }
  }

  return options;
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function promptUser(question, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
🪐 OrbitoX Project Scaffolder

Usage:
  node scripts/scaffold-project.mjs [options]

Options:
  --name <string>     Project display name (e.g. "Restaurant POS Mesh")
  --slug <string>     Project identifier slug (e.g. "restaurant-pos-mesh")
  --url <string>      OrbitoX control plane URL (default: http://localhost:3005)
  --port <number>     Application runtime port (default: 4000)
  --out <directory>   Output directory path (default: current directory)
  --format <ts|js>    Language format for client snippet (default: ts)
  --help, -h          Show this help message
`);
    process.exit(0);
  }

  // Interactive prompts if running in interactive terminal and parameters missing
  if ((!options.name || !options.slug) && process.stdin.isTTY) {
    console.log('\n🪐 OrbitoX Interactive Project Setup\n');
    if (!options.name) {
      options.name = await promptUser('Application Name', 'My Connected App');
    }
    if (!options.slug) {
      const suggestedSlug = slugify(options.name);
      options.slug = await promptUser('Project Slug', suggestedSlug);
    }
    options.url = await promptUser('Control Plane URL', options.url);
    const portStr = await promptUser('Default Runtime Port', String(options.port));
    options.port = parseInt(portStr, 10) || 4000;
  } else {
    // Non-interactive fallbacks
    if (!options.name) options.name = 'My Connected App';
    if (!options.slug) options.slug = slugify(options.name);
  }

  const outDir = path.resolve(process.cwd(), options.out);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Generate orbitox.manifest.json
  const manifest = {
    $schema: 'https://orbitox.io/schemas/manifest.v1.json',
    projectId: options.slug,
    slug: options.slug,
    name: options.name,
    version: '1.0.0',
    type: 'custom-os',
    runtime: {
      type: 'standalone',
      entrypoint: options.format === 'ts' ? 'src/server.ts' : 'src/server.js',
      defaultPort: options.port,
      healthEndpoint: '/health',
    },
    enabledPlugins: [],
    enabledFeatures: ['mcp_copilot', 'dag_prep_scheduler'],
    declaredApis: ['GET /health', 'POST /api/v1/events'],
    planReferences: ['plan_restaurant_growth'],
    environmentMetadata: {
      defaultEnvironment: 'local',
      supportedEnvironments: ['local', 'production'],
    },
    platformController: {
      syncIntervalSeconds: 5,
      requireSignedConfig: false,
    },
    capabilities: ['REALTIME_TELEMETRY_V1', 'REMOTE_COMMANDS_V1'],
  };

  const manifestPath = path.join(outDir, 'orbitox.manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  // 2. Generate client bootstrap code
  const isTs = options.format === 'ts';
  const clientFileName = isTs ? 'orbitox-client.ts' : 'orbitox-client.js';
  const clientPath = path.join(outDir, clientFileName);

  const clientContent = isTs
    ? `import { ControlClient } from '@orbitox/external-runtime-sdk';
import manifest from './orbitox.manifest.json';

const controlPlaneUrl = process.env.ORBITOX_CONTROL_PLANE_URL || process.env.ORBITOX_BACKEND_URL || '${options.url}';
const runtimeToken = process.env.ORBITOX_RUNTIME_TOKEN || '';

if (!runtimeToken) {
  console.warn('[OrbitoX] ⚠️ ORBITOX_RUNTIME_TOKEN is missing. Connected runtimes authenticate with this key.');
}

export const orbitox = new ControlClient({
  manifest: manifest as any,
  controlPlaneUrl,
  apiKey: runtimeToken,
  runtimePort: manifest.runtime?.defaultPort || ${options.port},
  onCommandReceived: async (cmd) => {
    console.log(\`[OrbitoX] Command received: \${cmd.action}\`);
    return {
      success: true,
      result: { executed: cmd.action, acknowledgedAt: new Date().toISOString() },
    };
  },
});

/**
 * Initializes the OrbitoX control plane connection:
 * 1. Registers the runtime manifest
 * 2. Synchronizes active feature flags and live entitlement quotas
 * 3. Starts automatic 10s health and heartbeat reporting
 */
export async function initOrbitoX(): Promise<void> {
  try {
    console.log(\`[OrbitoX] Connecting \${manifest.name} (\${manifest.slug}) to \${controlPlaneUrl}…\`);
    const reg = await orbitox.registerRuntime();
    console.log(\`[OrbitoX] Connected! Active revision: \${reg.revision}\`);

    // Example feature check
    const isAiEnabled = orbitox.features.isEnabled('mcp_copilot');
    console.log(\`[OrbitoX] Feature [mcp_copilot]: \${isAiEnabled ? 'ENABLED' : 'DISABLED'}\`);

    // Example live entitlement usage reporting
    const quota = await orbitox.entitlements.reportUsage('api_calls', 1);
    console.log(\`[OrbitoX] Entitlement [api_calls] report: allowed=\${quota.allowed}, remaining=\${quota.remaining}\`);

    // Heartbeat reporting loop
    setInterval(async () => {
      try {
        await orbitox.sendHeartbeat();
      } catch (err: any) {
        console.error('[OrbitoX] Heartbeat failed:', err.message);
      }
    }, 10000);
  } catch (err: any) {
    console.error('[OrbitoX] Registration failed:', err.message);
  }
}
`
    : `const { ControlClient } = require('@orbitox/external-runtime-sdk');
const manifest = require('./orbitox.manifest.json');

const controlPlaneUrl = process.env.ORBITOX_CONTROL_PLANE_URL || process.env.ORBITOX_BACKEND_URL || '${options.url}';
const runtimeToken = process.env.ORBITOX_RUNTIME_TOKEN || '';

if (!runtimeToken) {
  console.warn('[OrbitoX] ⚠️ ORBITOX_RUNTIME_TOKEN is missing. Connected runtimes authenticate with this key.');
}

const orbitox = new ControlClient({
  manifest,
  controlPlaneUrl,
  apiKey: runtimeToken,
  runtimePort: manifest.runtime?.defaultPort || ${options.port},
  onCommandReceived: async (cmd) => {
    console.log(\`[OrbitoX] Command received: \${cmd.action}\`);
    return {
      success: true,
      result: { executed: cmd.action, acknowledgedAt: new Date().toISOString() },
    };
  },
});

async function initOrbitoX() {
  try {
    console.log(\`[OrbitoX] Connecting \${manifest.name} (\${manifest.slug}) to \${controlPlaneUrl}…\`);
    const reg = await orbitox.registerRuntime();
    console.log(\`[OrbitoX] Connected! Active revision: \${reg.revision}\`);

    const isAiEnabled = orbitox.features.isEnabled('mcp_copilot');
    console.log(\`[OrbitoX] Feature [mcp_copilot]: \${isAiEnabled ? 'ENABLED' : 'DISABLED'}\`);

    const quota = await orbitox.entitlements.reportUsage('api_calls', 1);
    console.log(\`[OrbitoX] Entitlement [api_calls] report: allowed=\${quota.allowed}, remaining=\${quota.remaining}\`);

    setInterval(async () => {
      try {
        await orbitox.sendHeartbeat();
      } catch (err) {
        console.error('[OrbitoX] Heartbeat failed:', err.message);
      }
    }, 10000);
  } catch (err) {
    console.error('[OrbitoX] Registration failed:', err.message);
  }
}

module.exports = { orbitox, initOrbitoX };
`;

  fs.writeFileSync(clientPath, clientContent, 'utf-8');

  // Print summary output
  console.log(`
🪐 OrbitoX Project Scaffolded Successfully!
============================================
Generated files:
  ✔ ${manifestPath}
  ✔ ${clientPath}

Next Steps:
1. Ensure the SDK dependency is installed in your project:
   pnpm add @orbitox/external-runtime-sdk

2. Configure environment variables in your .env:
   ORBITOX_CONTROL_PLANE_URL=${options.url}
   ORBITOX_RUNTIME_TOKEN=<your-runtime-token>

3. Import and initialize in your application bootstrap:
   import { initOrbitoX } from './${path.basename(clientFileName, path.extname(clientFileName))}';
   await initOrbitoX();

4. View and monitor your project in OrbitoX:
   Connect Wizard: ${options.url}/platform/connect?slug=${options.slug}&name=${encodeURIComponent(options.name)}
   Project Detail: ${options.url}/platform/projects/${options.slug}
`);
}

main().catch((err) => {
  console.error('Scaffold failed:', err);
  process.exit(1);
});
