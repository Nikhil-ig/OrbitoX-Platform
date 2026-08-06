import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

function toPascalCase(str: string): string {
  return str
    .match(/[a-z]+/gi)
    ?.map((word) => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase())
    .join('') || '';
}

/**
 * `orbitox new <plugin-name>`
 * Scaffolds a zero-complexity OrbitoX Plugin.
 */
export function commandNew(args: string[]): void {
  const pluginName = args.find((a) => !a.startsWith('--'));

  if (!pluginName) {
    console.error('❌ Error: Please specify a plugin name (e.g., orbitox new crm)');
    process.exit(1);
  }

  // Validate name format: lowercase, alphanumeric, hyphens only
  if (!/^[a-z][a-z0-9-]*$/.test(pluginName)) {
    console.error('❌ Error: Plugin name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens.');
    process.exit(1);
  }

  const rootDir = process.cwd();
  const pluginDir = path.join(rootDir, pluginName);

  if (fs.existsSync(pluginDir)) {
    console.error(`❌ Error: Directory already exists at ${pluginDir}`);
    process.exit(1);
  }

  console.log(`\n🚀 Scaffolding Zero-Complexity Plugin: @orbitox/${pluginName}\n`);

  // Create directory structure
  fs.mkdirSync(path.join(pluginDir, 'src'), { recursive: true });
  logCreated('Directory structure');

  // Generate Files
  const pascalName = toPascalCase(pluginName);

  writeFile(pluginDir, 'package.json', generatePackageJson(pluginName));
  logCreated('package.json');

  writeFile(pluginDir, 'tsconfig.json', generateTsconfig());
  logCreated('tsconfig.json');

  writeFile(pluginDir, 'src/plugin.config.ts', generatePluginConfig(pluginName, pascalName));
  logCreated('src/plugin.config.ts');

  writeFile(pluginDir, 'src/index.ts', generateSrcIndex());
  logCreated('src/index.ts');

  console.log(`\n📦 Running pnpm install...`);
  try {
    execSync('pnpm install', { cwd: pluginDir, stdio: 'inherit' });
  } catch (err) {
    console.warn(`⚠️  Could not run pnpm install. You may need to run it manually.`);
  }

  console.log(`\n🎉 Plugin @orbitox/${pluginName} is ready!`);
  console.log(`\n   Next steps:`);
  console.log(`   1. cd ${pluginName}`);
  console.log(`   2. Edit src/plugin.config.ts to define your entities`);
  console.log(`   3. The OrbitoX Plugin Engine will automatically generate the APIs and UI!\n`);
}

// ─── Helpers ──────────────────────────────────────────────────

function writeFile(base: string, relative: string, content: string): void {
  fs.writeFileSync(path.join(base, relative), content, 'utf-8');
}

function logCreated(name: string): void {
  console.log(`   ✅ ${name}`);
}

// ─── Template Generators ──────────────────────────────────────

function generatePluginConfig(pluginName: string, pascalName: string): string {
  return `import { definePlugin } from '@orbitox/sdk';

export default definePlugin({
  id: '${pluginName}',
  name: '${pascalName}',
  version: '1.0.0',
  displayName: '${pascalName} Module',
  description: 'Zero-complexity headless ${pascalName} domain plugin.',
  icon: 'box',
  category: 'business',
  author: 'OrbitoX Developer',
  entities: [
    {
      id: 'example_entity',
      pluginId: '${pluginName}',
      displayName: 'Example Entity',
      displayNamePlural: 'Example Entities',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }] }
      ],
      permissions: {
        create: '${pluginName}.example_entity.create',
        read: '${pluginName}.example_entity.read',
        update: '${pluginName}.example_entity.update',
        delete: '${pluginName}.example_entity.delete'
      },
      ui: {
        defaultView: 'table',
        displayField: 'name'
      }
    }
  ]
});
`;
}

function generatePackageJson(pluginName: string): string {
  return JSON.stringify({
    name: `@orbitox/${pluginName}`,
    version: "0.1.0",
    description: `Zero-complexity ${pluginName} plugin`,
    main: "./dist/index.js",
    types: "./dist/index.d.ts",
    scripts: {
      build: "tsc --build",
      clean: "rm -rf dist"
    },
    dependencies: {
      "@orbitox/sdk": "workspace:*"
    },
    devDependencies: {
      "typescript": "^5.0.0"
    }
  }, null, 2) + "\n";
}

function generateTsconfig(): string {
  return JSON.stringify({
    compilerOptions: {
      outDir: "./dist",
      rootDir: "./src",
      declaration: true,
      target: "ES2022",
      module: "CommonJS",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    },
    include: ["src/**/*"]
  }, null, 2) + "\n";
}

function generateSrcIndex(): string {
  return `export { default as pluginConfig } from './plugin.config';
`;
}
