import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { restaurantTemplate } from '../templates/restaurant';
import { crmTemplate } from '../templates/crm';
import { hmsTemplate } from '../templates/hms';
import { ecommerceTemplate } from '../templates/ecommerce';

/**
 * `orbitox create <app-name> [--template=<template-name>] [--install-mode=<registry|file|workspace>] [--pack-dir=<path>] [--skip-install]` 
 * Scaffolds an OrbitoX composed SaaS application powered by @orbitox/runtime, plugins, tenancy, and platform connection.
 */
export function commandCreate(args: string[]): void {
  const appName = args.find(a => !a.startsWith('--'));
  if (!appName) {
    console.error('❌ Error: Please specify an app name (e.g., orbitox create my-cafe --template=restaurant)');
    process.exit(1);
  }

  const templateArg = args.find(a => a.startsWith('--template='));
  const template = templateArg ? (templateArg.split('=')[1] || 'restaurant') : 'restaurant';

  const installModeArg = args.find(a => a.startsWith('--install-mode='));
  const installMode = installModeArg ? (installModeArg.split('=')[1] || 'registry') : 'registry';

  const packDirArg = args.find(a => a.startsWith('--pack-dir='));
  const packDir = packDirArg ? packDirArg.split('=')[1] : process.env.ORBITOX_PACKAGES_DIR;

  const skipInstall = args.includes('--skip-install');

  // Validate name format: lowercase, alphanumeric, hyphens only
  if (!/^[a-z][a-z0-9-]*$/.test(appName)) {
    console.error('❌ Error: App name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens.');
    process.exit(1);
  }

  const rootDir = process.cwd();
  const appDir = path.join(rootDir, appName);

  if (fs.existsSync(appDir)) {
    console.error(`❌ Error: Directory already exists at ${appDir}`);
    process.exit(1);
  }

  console.log(`\n🪐 Scaffolding Composed OrbitoX SaaS: ${appName}`);
  console.log(`   Template:     ${template}`);
  console.log(`   Install Mode: ${installMode}\n`);

  // Create directory structure
  const dirs = ['', 'src'];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(appDir, dir), { recursive: true });
  }
  logCreated('Directory structure');

  // 1. orbitox.config.ts
  writeFile(appDir, 'orbitox.config.ts', generateConfig(appName, template));
  logCreated('orbitox.config.ts (plugin composition + tenancy + auth + platform connection)');

  // 2. docker-compose.yml
  writeFile(appDir, 'docker-compose.yml', generateDockerCompose(appName));
  logCreated('docker-compose.yml (PostgreSQL zero-config database)');

  // 3. .env.example
  writeFile(appDir, '.env.example', generateEnvExample(appName));
  logCreated('.env.example');

  // 4. package.json
  writeFile(appDir, 'package.json', generatePackageJson(appName, template, installMode, packDir));
  logCreated('package.json');

  // 5. tsconfig.json
  writeFile(appDir, 'tsconfig.json', generateTsconfig());
  logCreated('tsconfig.json');

  // 6. src/main.ts
  writeFile(appDir, 'src/main.ts', generateMainTs(appName));
  logCreated('src/main.ts');

  // 7. Run npm install automatically if not skipped
  if (!skipInstall) {
    console.log(`\n📦 Running npm install...`);
    try {
      execSync('npm install --no-audit --no-fund', { cwd: appDir, stdio: 'inherit' });
    } catch (err) {
      console.error(`⚠️ Notice: npm install had issues. If using private registry or local packages, run install manually in ${appDir}.`);
    }
  }

  console.log(`\n🎉 Composed SaaS app [${appName}] is scaffolded and ready!`);
  console.log(`\n   Next steps:`);
  console.log(`   1. cd ${appName}`);
  console.log(`   2. docker compose up -d`);
  console.log(`   3. npm start`);
  console.log(`   4. curl http://localhost:3000/health\n`);
}

// ─── Helpers ──────────────────────────────────────────────────

function writeFile(base: string, relative: string, content: string): void {
  fs.writeFileSync(path.join(base, relative), content, 'utf-8');
}

function logCreated(name: string): void {
  console.log(`   ✅ ${name}`);
}

// ─── Template Generators ──────────────────────────────────────

function generateConfig(appName: string, template: string): string {
  const dbName = appName.replace(/-/g, '_');
  let content = '';

  if (template === 'restaurant') {
    content = restaurantTemplate;
  } else if (template === 'crm') {
    content = crmTemplate;
  } else if (template === 'hms') {
    content = hmsTemplate;
  } else if (template === 'ecommerce') {
    content = ecommerceTemplate;
  } else {
    content = restaurantTemplate;
  }

  return content
    .replace(/\{\{APP_NAME\}\}/g, appName)
    .replace(/\{\{DB_NAME\}\}/g, dbName);
}

function generateDockerCompose(appName: string): string {
  const dbName = appName.replace(/-/g, '_');
  return `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ${appName}-postgres
    restart: always
    environment:
      POSTGRES_DB: ${dbName}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
`;
}

function generateEnvExample(appName: string): string {
  const dbName = appName.replace(/-/g, '_');
  return `# Runtime configuration
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/${dbName}

# OrbitoX Platform Control Plane connection
ORBITOX_CONTROL_PLANE_URL=http://127.0.0.1:3005
ORBITOX_PROJECT_ID=proj_${appName}
ORBITOX_RUNTIME_TOKEN=tok_${appName}_dev
`;
}

function generatePackageJson(appName: string, template: string, installMode: string, packDir?: string): string {
  const isRestaurant = template === 'restaurant';
  const isCrm = template === 'crm';

  let runtimeDep = '^1.0.0';
  let posDep = '^1.0.0';
  let crmDep = '^1.0.0';
  let sdkDep = '^1.0.0';
  let engineDep = '^1.0.0';

  if (installMode === 'workspace') {
    runtimeDep = 'workspace:*';
    posDep = 'workspace:*';
    crmDep = 'workspace:*';
    sdkDep = 'workspace:*';
    engineDep = 'workspace:*';
  }
  const dependencies: Record<string, string> = {
    '@orbitox/runtime': runtimeDep,
    '@orbitox/external-runtime-sdk': sdkDep,
    '@orbitox/plugin-engine': engineDep,
    'express': '^5.2.1'
  };

  if (isRestaurant) {
    dependencies['@orbitox/pos'] = posDep;
  }
  if (isCrm) {
    dependencies['@orbitox/crm'] = crmDep;
  }

  if (installMode === 'file' && packDir && fs.existsSync(packDir)) {
    const tarballs = fs.readdirSync(packDir).filter(f => f.startsWith('orbitox-') && f.endsWith('.tgz'));
    for (const t of tarballs) {
      const match = t.match(/^orbitox-([a-z-]+)-\d+\.\d+\.\d+.*\.tgz$/);
      if (match && match[1]) {
        const pkgName = `@orbitox/${match[1]}`;
        dependencies[pkgName] = `file:${path.resolve(packDir, t)}`;
      }
    }
  }

  return JSON.stringify({
    name: appName,
    version: '0.1.0',
    description: `OrbitoX Composed SaaS Application (${template})`,
    main: 'src/main.ts',
    scripts: {
      start: 'tsx src/main.ts',
      build: 'tsc'
    },
    dependencies,
    devDependencies: {
      '@types/node': '^20.0.0',
      'tsx': '^4.7.0',
      'typescript': '^5.0.0'
    }
  }, null, 2) + '\n';
}

function generateTsconfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'CommonJS',
      rootDir: '.',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    }
  }, null, 2) + '\n';
}

function generateMainTs(appName: string): string {
  return `import { createOrbitoXApp } from '@orbitox/runtime';
import config from '../orbitox.config';

export async function bootstrap() {
  console.log('🚀 Booting composed SaaS application: ' + config.app.name);
  const result = await createOrbitoXApp(config);
  return result;
}

bootstrap().catch((err) => {
  console.error('Fatal error starting app:', err);
  process.exit(1);
});
`;
}
