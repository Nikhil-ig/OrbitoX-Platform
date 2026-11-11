/**
 * 🪐 OrbitoX CLI - Secure Configuration & Keychain Management
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const CONFIG_DIR = path.join(os.homedir(), '.orbitox');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const KEYCHAIN_SERVICE = 'orbitox-cli';
const KEYCHAIN_ACCOUNT = 'default';

export interface CliConfig {
  apiKey?: string;
  url?: string;
}

export function maskApiKey(key?: string): string {
  if (!key) return '(none)';
  if (key.length <= 12) return '••••••••';
  const prefix = key.slice(0, 8);
  const suffix = key.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

export function saveCredentials(config: CliConfig): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  } catch {}

  // Attempt to save secret to OS Keychain if on macOS
  let savedToKeychain = false;
  if (process.platform === 'darwin' && config.apiKey) {
    try {
      // security add-generic-password -U -s <service> -a <account> -w <secret>
      execSync(
        `security add-generic-password -U -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w "${config.apiKey}"`,
        { stdio: 'ignore' }
      );
      savedToKeychain = true;
    } catch {}
  }

  // Also persist non-sensitive or fallback config
  const fileConfig: CliConfig = {
    url: config.url || 'http://127.0.0.1:3005',
    // Only store masked reference in config file if saved in keychain; otherwise save mode 0600
    apiKey: savedToKeychain ? undefined : config.apiKey,
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(fileConfig, null, 2), { mode: 0o600 });
}

export function loadCredentials(): CliConfig {
  let fileConfig: CliConfig = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {}
  }

  // Attempt to read secret from OS Keychain on macOS
  let keychainKey: string | undefined = undefined;
  if (process.platform === 'darwin') {
    try {
      const output = execSync(
        `security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w`,
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
      ).trim();
      if (output) keychainKey = output;
    } catch {}
  }

  return {
    url: fileConfig.url || 'http://127.0.0.1:3005',
    apiKey: keychainKey || fileConfig.apiKey,
  };
}

export function resolveApiKey(explicitKey?: string): string {
  if (explicitKey) return explicitKey.trim();
  if (process.env.ORBITOX_API_KEY) return process.env.ORBITOX_API_KEY.trim();
  if (process.env.ORBITOX_CUSTOMER_API_KEY) return process.env.ORBITOX_CUSTOMER_API_KEY.trim();

  const creds = loadCredentials();
  return creds.apiKey || '';
}

export function resolveUrl(explicitUrl?: string): string {
  if (explicitUrl) return explicitUrl.trim();
  if (process.env.ORBITOX_URL) return process.env.ORBITOX_URL.trim();

  const creds = loadCredentials();
  return creds.url || 'http://127.0.0.1:3005';
}
