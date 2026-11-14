import * as fs from 'fs';
import * as path from 'path';

/**
 * `orbitox list` — Scans the plugins/ directory and displays
 * a formatted table of all installed plugins with metadata.
 */
export function commandList(): void {
  const rootDir = process.cwd();
  const pluginsDir = path.join(rootDir, 'plugins');

  if (!fs.existsSync(pluginsDir)) {
    console.error('❌ No plugins/ directory found. Are you in the OrbitoX workspace root?');
    process.exit(1);
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const plugins: Array<{
    id: string;
    displayName: string;
    version: string;
    category: string;
    permissions: number;
    hasBackend: boolean;
  }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const manifestPath = path.join(pluginsDir, entry.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      plugins.push({
        id: manifest.id || entry.name,
        displayName: manifest.displayName || manifest.name || entry.name,
        version: manifest.version || '0.0.0',
        category: manifest.category || 'unknown',
        permissions: Array.isArray(manifest.permissions) ? manifest.permissions.length : 0,
        hasBackend: fs.existsSync(path.join(pluginsDir, entry.name, 'backend')),
      });
    } catch {
      // Skip malformed manifests
    }
  }

  if (plugins.length === 0) {
    console.log('\n📦 No plugins found in the workspace.\n');
    return;
  }

  console.log(`\n📦 Installed Plugins (${plugins.length} found)\n`);
  console.log('  ' + '─'.repeat(78));
  console.log(`  ${'ID'.padEnd(16)} ${'Display Name'.padEnd(18)} ${'Version'.padEnd(10)} ${'Category'.padEnd(12)} ${'Perms'.padEnd(7)} Backend`);
  console.log('  ' + '─'.repeat(78));

  for (const p of plugins) {
    console.log(
      `  ${p.id.padEnd(16)} ${p.displayName.padEnd(18)} ${p.version.padEnd(10)} ${p.category.padEnd(12)} ${String(p.permissions).padEnd(7)} ${p.hasBackend ? '✅' : '—'}`
    );
  }

  console.log('  ' + '─'.repeat(78));
  console.log('');
}
