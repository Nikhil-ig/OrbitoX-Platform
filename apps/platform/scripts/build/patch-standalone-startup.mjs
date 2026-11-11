import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function patchStandaloneStartup(serverFile) {
    if (!fs.existsSync(serverFile)) throw new Error(`Standalone server not found: ${serverFile}`);
    const source = fs.readFileSync(serverFile, 'utf8');
    const anchor = "process.env.NODE_ENV = 'production'";
    if (!source.includes(anchor)) throw new Error('Standalone server startup anchor was not found.');
    const preflight = `process.env.NODE_ENV = process.env.NODE_ENV || 'production';
delete process.env.NEXT_PHASE;
const requiredProductionSecrets = [
  ['ORBITOX_ADMIN_TOKEN', 'Master credential for control plane & management APIs'],
  ['ORBITOX_RUNTIME_TOKEN', 'Internal inter-service runtime communication token'],
  ['ORBITOX_CONTROL_SECRET', 'Master HMAC signing secret for internal principal tokens'],
  ['ORBITOX_GUEST_SECRET', 'Cryptographic secret for ephemeral guest session signing'],
  ['ORBITOX_SERVER_PEPPER', 'Server pepper for SHA-256 API key verifier derivation'],
];
const productionConfigurationProblems = requiredProductionSecrets.flatMap(([name, description]) => {
  if (name === 'ORBITOX_SERVER_PEPPER' && process.env.ORBITOX_SERVER_PEPPERS?.trim()) return [];
  const value = process.env[name]?.trim();
  if (!value) return [\`${'${name}'} is not set (${'${description}'})\`];
  if (value.length < 32) return [\`${'${name}'} must be at least 32 characters (found ${'${value.length}'})\`];
  return [];
});
if (productionConfigurationProblems.length > 0) {
  throw new Error([
    'OrbitoX cannot start: invalid production configuration.',
    ...productionConfigurationProblems.map((problem) => \`  - ${'${problem}'}\`),
    '',
    'Generate strong 32-character secrets using: openssl rand -hex 32',
    'Or run: node scripts/check-production-env.mjs',
  ].join('\\n'));
}`;
    const patched = source.replace(anchor, preflight);
    fs.writeFileSync(serverFile, patched);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
    const candidates = [
        path.resolve('.next/standalone/apps/platform/server.js'),
        path.resolve('.next/standalone/apps/web/server.js'),
        path.resolve('.next/standalone/server.js'),
    ];
    const target = candidates.find((f) => fs.existsSync(f));
    if (target) {
        patchStandaloneStartup(target);
        const appsDir = path.resolve('.next/standalone/apps');
        const platformDir = path.join(appsDir, 'platform');
        const webDir = path.join(appsDir, 'web');
        if (fs.existsSync(platformDir) && !fs.existsSync(webDir)) {
            try {
                fs.symlinkSync('platform', webDir, 'junction');
            } catch {}
        }
    }
}
