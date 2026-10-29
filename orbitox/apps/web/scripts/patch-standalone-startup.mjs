import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function patchStandaloneStartup(serverFile) {
    if (!fs.existsSync(serverFile)) throw new Error(`Standalone server not found: ${serverFile}`);
    const source = fs.readFileSync(serverFile, 'utf8');
    const anchor = "process.env.NODE_ENV = 'production'";
    if (!source.includes(anchor)) throw new Error('Standalone server startup anchor was not found.');
    const preflight = `${anchor}
delete process.env.NEXT_PHASE;
const requiredProductionSecrets = [
  ['ORBITOX_ADMIN_TOKEN', 'Master credential for control plane & management APIs'],
  ['ORBITOX_RUNTIME_TOKEN', 'Internal inter-service runtime communication token'],
  ['ORBITOX_CONTROL_SECRET', 'Master HMAC signing secret for internal principal tokens'],
  ['ORBITOX_GUEST_SECRET', 'Cryptographic secret for ephemeral guest session signing'],
  ['ORBITOX_SERVER_PEPPER', 'Server pepper for SHA-256 API key verifier derivation'],
  ['ORBITOX_PHI_KEYS', 'JSON map of kid to 32-byte base64 AES keys for PHI field encryption'],
  ['ORBITOX_PHI_ACTIVE_KID', 'Active key identifier for new PHI encryption operations'],
  ['ORBITOX_PHI_INDEX_KEY', '32-byte base64 HMAC key for blind index generation'],
];
const productionConfigurationProblems = requiredProductionSecrets.flatMap(([name, description]) => {
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
    patchStandaloneStartup(path.resolve('.next/standalone/apps/web/server.js'));
}
