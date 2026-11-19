import * as fs from 'fs';
import * as path from 'path';

/**
 * `orbitox status` — Scans the workspace to display real 
 * platform metadata: package counts, plugin status, etc.
 */
export function commandStatus(): void {
  const rootDir = process.cwd();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║            ORBITOX PLATFORM KERNEL STATUS                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Count packages
  const packagesDir = path.join(rootDir, 'packages');
  let packageCount = 0;
  if (fs.existsSync(packagesDir)) {
    packageCount = fs.readdirSync(packagesDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && fs.existsSync(path.join(packagesDir, d.name, 'package.json')))
      .length;
  }

  // Count plugins
  const pluginsDir = path.join(rootDir, 'plugins');
  let pluginCount = 0;
  const pluginNames: string[] = [];
  if (fs.existsSync(pluginsDir)) {
    const pluginEntries = fs.readdirSync(pluginsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && fs.existsSync(path.join(pluginsDir, d.name, 'manifest.json')));
    pluginCount = pluginEntries.length;
    for (const p of pluginEntries) {
      pluginNames.push(p.name);
    }
  }

  // Count apps
  const appsDir = path.join(rootDir, 'apps');
  let appCount = 0;
  if (fs.existsSync(appsDir)) {
    appCount = fs.readdirSync(appsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && fs.existsSync(path.join(appsDir, d.name, 'package.json')))
      .length;
  }

  // Check core modules
  const coreModules = [
    { name: 'Context Engine', path: 'packages/core/src/context' },
    { name: 'ABAC Security Engine', path: 'packages/core/src/rbac' },
    { name: 'Event Bus', path: 'packages/core/src/events' },
    { name: 'Workflow Engine', path: 'packages/core/src/workflow' },
    { name: 'AI Gateway', path: 'packages/core/src/ai' },
    { name: 'Billing Engine', path: 'packages/core/src/billing' },
    { name: 'Scheduler Engine', path: 'packages/core/src/scheduler' },
    { name: 'Audit Ledger', path: 'packages/core/src/audit' },
    { name: 'Plugin Engine', path: 'packages/plugin-engine' },
  ];

  console.log('   Core Subsystems:');
  for (const mod of coreModules) {
    const exists = fs.existsSync(path.join(rootDir, mod.path));
    console.log(`   ${exists ? '✅' : '❌'} ${mod.name.padEnd(24)} ${exists ? 'ACTIVE' : 'MISSING'}`);
  }

  console.log('');
  console.log(`   📦 Packages:    ${packageCount}`);
  console.log(`   🔌 Plugins:     ${pluginCount} [${pluginNames.join(', ')}]`);
  console.log(`   🖥️  Apps:        ${appCount}`);
  console.log('');
}
