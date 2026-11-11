import * as fs from 'fs';
import * as path from 'path';

/**
 * `orbitox validate <plugin>` — Validates a plugin's manifest.json
 * against the PluginManifest schema rules for correctness.
 */
export function commandValidate(args: string[]): void {
  const pluginName = args[0];
  if (!pluginName) {
    console.error('❌ Error: Please specify a plugin to validate (e.g., orbitox validate crm)');
    process.exit(1);
  }

  const rootDir = process.cwd();
  const manifestPath = path.join(rootDir, 'plugins', pluginName, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Error: manifest.json not found at plugins/${pluginName}/manifest.json`);
    process.exit(1);
  }

  console.log(`\n🔎 Validating plugin: @orbitox/${pluginName}\n`);

  let manifest: any;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err: any) {
    console.error(`   ❌ manifest.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  const requiredFields = ['id', 'name', 'version', 'displayName', 'description', 'category', 'author'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // Version format
  if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push(`Invalid version format: "${manifest.version}" (expected semver, e.g. 1.0.0)`);
  }

  // Permissions format
  if (manifest.permissions && Array.isArray(manifest.permissions)) {
    for (const perm of manifest.permissions) {
      if (typeof perm !== 'string') {
        errors.push(`Permission must be a string, got: ${typeof perm}`);
      } else if (perm.split('.').length < 3) {
        warnings.push(`Permission "${perm}" should follow <domain>.<entity>.<action> format`);
      }
    }
  }

  // Menu structure
  if (manifest.menus && Array.isArray(manifest.menus)) {
    for (const menu of manifest.menus) {
      if (!menu.id) errors.push('Menu item missing "id"');
      if (!menu.label) errors.push('Menu item missing "label"');
      if (menu.children && Array.isArray(menu.children)) {
        for (const child of menu.children) {
          if (!child.id) errors.push('Menu child item missing "id"');
          if (!child.path) errors.push(`Menu child "${child.id || 'unknown'}" missing "path"`);
        }
      }
    }
  }

  // Pages structure
  if (manifest.pages && Array.isArray(manifest.pages)) {
    for (const page of manifest.pages) {
      if (!page.id) errors.push('Page missing "id"');
      if (!page.path) errors.push(`Page "${page.id || 'unknown'}" missing "path"`);
      if (!page.component) errors.push(`Page "${page.id || 'unknown'}" missing "component"`);
    }
  }

  // Widget structure
  if (manifest.widgets && Array.isArray(manifest.widgets)) {
    const validSizes = ['1x1', '2x1', '2x2', '4x2'];
    for (const widget of manifest.widgets) {
      if (!widget.id) errors.push('Widget missing "id"');
      if (!widget.title) errors.push(`Widget "${widget.id || 'unknown'}" missing "title"`);
      if (widget.size && !validSizes.includes(widget.size)) {
        errors.push(`Widget "${widget.id}" has invalid size "${widget.size}". Valid: ${validSizes.join(', ')}`);
      }
    }
  }

  // Check supporting files exist
  const pluginDir = path.join(rootDir, 'plugins', pluginName);
  const expectedFiles = ['package.json', 'tsconfig.json', 'src/index.ts'];
  for (const file of expectedFiles) {
    if (!fs.existsSync(path.join(pluginDir, file))) {
      warnings.push(`Expected file missing: ${file}`);
    }
  }

  // Report
  if (errors.length === 0 && warnings.length === 0) {
    console.log('   ✅ Manifest schema: VALID');
    console.log('   ✅ Permission format: VALID');
    console.log('   ✅ Menu structure: VALID');
    console.log('   ✅ Page definitions: VALID');
    console.log('   ✅ Widget definitions: VALID');
    console.log('   ✅ Workspace files: PRESENT');
    console.log(`\n   🎉 Plugin @orbitox/${pluginName} is fully valid!\n`);
  } else {
    if (errors.length > 0) {
      console.log(`   ❌ ${errors.length} error(s):`);
      for (const err of errors) {
        console.log(`      • ${err}`);
      }
    }
    if (warnings.length > 0) {
      console.log(`   ⚠️  ${warnings.length} warning(s):`);
      for (const warn of warnings) {
        console.log(`      • ${warn}`);
      }
    }
    console.log('');
    if (errors.length > 0) {
      process.exit(1);
    }
  }
}
