import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * `orbitox doctor` — Runs real environment diagnostics by actually
 * checking installed tool versions and workspace file integrity.
 */
export function commandDoctor(): void {
  console.log('\n🔍 OrbitoX System Diagnostics\n');

  let passed = 0;
  let failed = 0;

  // 1. Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    const major = parseInt(nodeVersion.replace('v', '').split('.')[0] as string, 10);
    if (major >= 18) {
      console.log(`   ✅ Node.js:        ${nodeVersion}`);
      passed++;
    } else {
      console.log(`   ⚠️  Node.js:        ${nodeVersion} (v18+ recommended)`);
      failed++;
    }
  } catch {
    console.log('   ❌ Node.js:        NOT FOUND');
    failed++;
  }

  // 2. pnpm
  try {
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ pnpm:           v${pnpmVersion}`);
    passed++;
  } catch {
    console.log('   ❌ pnpm:           NOT FOUND (install via: npm i -g pnpm)');
    failed++;
  }

  // 3. TypeScript
  try {
    const tscVersion = execSync('npx tsc --version', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ TypeScript:     ${tscVersion}`);
    passed++;
  } catch {
    console.log('   ❌ TypeScript:     NOT FOUND');
    failed++;
  }

  // 4. TurboRepo
  try {
    const turboVersion = execSync('npx turbo --version', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ TurboRepo:      v${turboVersion}`);
    passed++;
  } catch {
    console.log('   ❌ TurboRepo:      NOT FOUND');
    failed++;
  }

  console.log('');

  // 5. Workspace structure checks
  const rootDir = process.cwd();
  const requiredFiles: Array<{ path: string; label: string }> = [
    { path: 'pnpm-workspace.yaml', label: 'pnpm-workspace.yaml' },
    { path: 'turbo.json', label: 'turbo.json' },
    { path: 'tsconfig.base.json', label: 'tsconfig.base.json' },
    { path: 'packages/core/package.json', label: '@orbitox/core' },
    { path: 'packages/sdk/package.json', label: '@orbitox/sdk' },
    { path: 'packages/types/package.json', label: '@orbitox/types' },
  ];

  console.log('   Workspace Integrity:');
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(rootDir, file.path))) {
      console.log(`   ✅ ${file.label}`);
      passed++;
    } else {
      console.log(`   ❌ ${file.label} — MISSING`);
      failed++;
    }
  }

  // 6. Plugin count
  const pluginsDir = path.join(rootDir, 'plugins');
  if (fs.existsSync(pluginsDir)) {
    const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && fs.existsSync(path.join(pluginsDir, d.name, 'manifest.json')));
    console.log(`   ✅ Plugins:        ${pluginDirs.length} installed`);
    passed++;
  }

  console.log('');
  console.log(`   Result: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('   🎉 Environment is HEALTHY & COMPLIANT\n');
  } else {
    console.log('   ⚠️  Some checks failed. Please resolve the issues above.\n');
  }
}
