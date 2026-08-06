import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { restaurantTemplate } from '../templates/restaurant';
import { crmTemplate } from '../templates/crm';
import { hmsTemplate } from '../templates/hms';
import { ecommerceTemplate } from '../templates/ecommerce';

/**
 * `orbitox create <app-name> [--template=<template-name>]` 
 * Scaffolds a zero-complexity standalone SaaS project powered by @orbitox/runtime.
 */
export function commandCreate(args: string[]): void {
  const appName = args.find(a => !a.startsWith('--'));
  if (!appName) {
    console.error('❌ Error: Please specify an app name (e.g., orbitox create restaurant-os)');
    process.exit(1);
  }

  const templateArg = args.find(a => a.startsWith('--template='));
  const template = templateArg ? (templateArg.split('=')[1] || 'default') : 'default';

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

  console.log(`\n🚀 Scaffolding Zero-Complexity SaaS: ${appName} (Template: ${template})\n`);

  // Create directory structure
  const dirs = ['', 'src'];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(appDir, dir), { recursive: true });
  }
  logCreated('Directory structure');

  // 1. orbitox.config.ts
  writeFile(appDir, 'orbitox.config.ts', generateConfig(appName, template));
  logCreated('orbitox.config.ts');

  // 2. package.json
  writeFile(appDir, 'package.json', generatePackageJson(appName));
  logCreated('package.json');

  // 3. tsconfig.json
  writeFile(appDir, 'tsconfig.json', generateTsconfig());
  logCreated('tsconfig.json');

  // 4. src/main.ts (3-line entrypoint)
  writeFile(appDir, 'src/main.ts', generateMainTs());
  logCreated('src/main.ts');

  // 5. Run npm install automatically
  console.log(`\n📦 Running npm install...`);
  try {
    execSync('npm install', { cwd: appDir, stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Error running npm install. Please run it manually in ${appDir}.`);
  }

  console.log(`\n🎉 App ${appName} is ready!`);
  console.log(`\n   Launch it now:`);
  console.log(`   cd ${appName}`);
  console.log(`   npm start\n`);
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
  if (template === 'restaurant') return restaurantTemplate.replace('Restaurant OS', appName);
  if (template === 'crm') return crmTemplate.replace('OrbitoX CRM', appName);
  if (template === 'hms') return hmsTemplate.replace('Hospital Management System', appName);
  if (template === 'ecommerce') return ecommerceTemplate.replace('E-Commerce Platform', appName);
  
  // Default minimal template
  return `import { OrbitoXConfig } from '@orbitox/runtime';

const config: OrbitoXConfig = {
  app: {
    name: '${appName}',
    port: 3000
  },
  entities: [
    {
      id: 'example_entity',
      name: 'Example Entity',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'isActive', type: 'boolean', default: true }
      ]
    }
  ]
};

export default config;
`;
}

function generatePackageJson(appName: string): string {
  return JSON.stringify({
    name: appName,
    version: "0.1.0",
    description: "Zero-complexity OrbitoX app",
    main: "src/main.ts",
    scripts: {
      start: "tsx src/main.ts"
    },
    dependencies: {
      "@orbitox/runtime": "latest",
      "express": "^4.18.2"
    },
    devDependencies: {
      "tsx": "^4.7.0",
      "typescript": "^5.0.0"
    }
  }, null, 2) + "\n";
}

function generateTsconfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "CommonJS",
      rootDir: ".",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    }
  }, null, 2) + "\n";
}

function generateMainTs(): string {
  return `import { createOrbitoXApp } from '@orbitox/runtime';
import config from '../orbitox.config';

createOrbitoXApp(config);
`;
}
