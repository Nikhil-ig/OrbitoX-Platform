import * as fs from 'fs';
import * as path from 'path';
import { generatePrismaSchema } from '../generators/prisma.generator';
import { generateApiRoutes } from '../generators/api.generator';

/**
 * `orbitox generate:<target>`
 * Orchestrates code generation from a manifest.json file.
 */
export function commandGenerate(target: 'db' | 'api', args: string[]): void {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Error: manifest.json not found in the current directory.');
    console.error('   Please run this command from the root of your OrbitoX SaaS project.');
    process.exit(1);
  }

  let manifest: any;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err: any) {
    console.error(`❌ Error parsing manifest.json: ${err.message}`);
    process.exit(1);
  }

  if (!manifest.entities || !Array.isArray(manifest.entities)) {
    console.error('❌ Error: manifest.json must contain an "entities" array.');
    process.exit(1);
  }

  console.log(`\n⚡ OrbitoX Generator: Building [${target.toUpperCase()}] for ${manifest.displayName || manifest.name}...`);

  if (target === 'db') {
    generatePrismaSchema(cwd, manifest);
  } else if (target === 'api') {
    generateApiRoutes(cwd, manifest);
  }

  console.log(`\n🎉 Generation complete!`);
}
