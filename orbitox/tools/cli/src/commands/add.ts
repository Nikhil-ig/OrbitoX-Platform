import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * `orbitox add <plugin>` — Installs and scaffolds an OrbitoX plugin in 1 step.
 *
 * Example:
 *   orbitox add crm
 *   orbitox add hms
 */
export function commandAdd(args: string[]): void {
  const pluginName = args.find((a) => !a.startsWith('--'));
  if (!pluginName) {
    console.error('❌ Error: Please specify the plugin to add (e.g., orbitox add crm)');
    process.exit(1);
  }

  const cleanName = pluginName.replace(/^@orbitox(-io)?\//, '').toLowerCase();
  const fullPkgName = `@orbitox-io/${cleanName}`;

  console.log(`\n📦 Adding plugin: ${fullPkgName}...\n`);

  // Detect package manager (pnpm vs npm)
  const isPnpm = fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'));
  const installCmd = isPnpm ? `pnpm add ${fullPkgName}` : `npm install ${fullPkgName}`;

  console.log(`   Executing: ${installCmd}`);
  try {
    execSync(installCmd, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`\n   ✅ Successfully installed ${fullPkgName}!`);
  } catch (err: any) {
    console.error(`\n   ❌ Failed to install ${fullPkgName}: ${err.message}`);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🚀 Ready to Use in Your Application (Copy & Paste):');
  console.log('================================================================\n');

  console.log(`import { createOrbitoX } from '@orbitox-io/plugin-engine';`);
  console.log(`import * as ${cleanName} from '${fullPkgName}';\n`);
  console.log(`async function main() {`);
  console.log(`  const app = await createOrbitoX({`);
  console.log(`    license: process.env.ORBITOX_LICENSE_KEY,`);
  console.log(`    plugins: [${cleanName}]`);
  console.log(`  });\n`);
  console.log(`  // Direct access: app.${cleanName}`);
  console.log(`  console.log('${cleanName.toUpperCase()} Plugin Active:', app.${cleanName});`);
  console.log(`}\nmain();\n`);
}
