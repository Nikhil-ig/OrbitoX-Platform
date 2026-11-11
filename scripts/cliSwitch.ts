#!/usr/bin/env node
/**
 * 🪐 OrbitoX Instant Architecture Switcher & State Transfer CLI
 *
 * 1-Line Developer Integration & Operator Tool
 * Usage:
 *   npx tsx scripts/cliSwitch.ts --target=standalone
 *   npx tsx scripts/cliSwitch.ts --target=distributed
 *   npx tsx scripts/cliSwitch.ts --export-snapshot
 *   npx tsx scripts/cliSwitch.ts --import-snapshot=./snapshots/snapshot-123.json
 *   npx tsx scripts/cliSwitch.ts --status
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = process.env.ORBITOX_API_URL || 'http://localhost:3000';

interface SwitchResponse {
  success: boolean;
  data: {
    message: string;
    previousMode: string;
    currentMode: string;
    transferReceipt: {
      snapshotId: string;
      itemsTransferred: {
        projects: number;
        apiKeys: number;
        services: number;
        providers: number;
        telemetryLogs: number;
      };
      durationMs: number;
      checksum: string;
      timestamp: string;
    };
    cluster: any;
  };
  error?: any;
}

function printBanner() {
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════════');
  console.log('\x1b[1m\x1b[35m%s\x1b[0m', '  🪐 OrbitoX Engine Architecture Switcher & State Transfer Tool');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════════');
}

async function getStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/system/switch`);
    const json = await res.json();
    if (json.success) {
      console.log('\n\x1b[1mSystem Architecture Status:\x1b[0m');
      console.log(`  • Operational Mode:      \x1b[32m${json.data.currentMode.toUpperCase()}\x1b[0m`);
      console.log(`  • Active Node ID:        ${json.data.nodeId}`);
      console.log(`  • Traffic Draining:      ${json.data.isDraining ? '\x1b[33mACTIVE\x1b[0m' : 'NO'}`);
      console.log(`  • In-Flight Requests:    ${json.data.inFlightRequests}`);
      if (json.data.lastMigrationReceipt) {
        console.log(`  • Last Migration:        ${json.data.lastMigrationReceipt.snapshotId}`);
        console.log(`  • Checksum:              ${json.data.lastMigrationReceipt.checksum.slice(0, 16)}...`);
      }
    } else {
      console.error('\x1b[31mFailed to retrieve status:\x1b[0m', json.error);
    }
  } catch (err: any) {
    console.error(`\x1b[31mError connecting to OrbitoX at ${API_BASE_URL}:\x1b[0m`, err.message);
  }
}

async function exportSnapshot() {
  try {
    console.log('📦 Requesting state snapshot from live OrbitoX engine...');
    const res = await fetch(`${API_BASE_URL}/api/v1/system/switch/snapshot`);
    const json = await res.json();
    if (!json.success || !json.data?.snapshot) {
      throw new Error(json.error?.message || 'Failed to export snapshot');
    }

    const snapshot = json.data.snapshot;
    const snapshotsDir = path.resolve(process.cwd(), 'snapshots');
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }

    const filePath = path.join(snapshotsDir, `orbitox-snapshot-${snapshot.metadata.snapshotId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

    console.log('\x1b[32m%s\x1b[0m', `✅ Snapshot created & saved to: ${filePath}`);
    console.log(`  • Snapshot ID: ${snapshot.metadata.snapshotId}`);
    console.log(`  • SHA-256 Checksum: ${snapshot.metadata.checksum}`);
    console.log(`  • Projects: ${snapshot.metadata.stats.projectsCount}`);
    console.log(`  • API Keys: ${snapshot.metadata.stats.apiKeysCount}`);
    console.log(`  • Services: ${snapshot.metadata.stats.servicesCount}`);
  } catch (err: any) {
    console.error('\x1b[31mExport snapshot failed:\x1b[0m', err.message);
  }
}

async function importSnapshot(filePath: string) {
  try {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found at path: ${resolvedPath}`);
    }

    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
    const snapshot = JSON.parse(fileContent);

    console.log(`📤 Ingesting snapshot [${snapshot.metadata?.snapshotId || 'custom'}] into OrbitoX...`);
    const res = await fetch(`${API_BASE_URL}/api/v1/system/switch/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'Ingestion failed');
    }

    console.log('\x1b[32m%s\x1b[0m', `✅ Snapshot successfully ingested & verified!`);
    console.log(json.data.message);
  } catch (err: any) {
    console.error('\x1b[31mImport snapshot failed:\x1b[0m', err.message);
  }
}

async function executeSwitch(targetMode: string, transferState = true) {
  try {
    console.log(`\n⏳ Initiating architecture switch to [${targetMode.toUpperCase()}]...`);
    console.log('  1. Activating graceful traffic drain (zero dropped requests)...');
    console.log('  2. Extracting live database & memory state with SHA-256 cryptographic seal...');
    console.log(`  3. Reconfiguring runtime bindings for ${targetMode}...`);

    const res = await fetch(`${API_BASE_URL}/api/v1/system/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetMode,
        transferState,
        autoDrain: true,
      }),
    });

    const json: SwitchResponse = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'Switch failed');
    }

    const r = json.data.transferReceipt;
    console.log('\n\x1b[32m%s\x1b[0m', `✅ Mode Switch Completed Successfully!`);
    console.log(`  • Message:              ${json.data.message}`);
    console.log(`  • New Operational Mode: \x1b[1m\x1b[32m${json.data.currentMode.toUpperCase()}\x1b[0m`);
    console.log(`  • Transition Duration:  ${r.durationMs}ms`);
    console.log(`  • Snapshot ID:          ${r.snapshotId}`);
    console.log(`  • SHA-256 Checksum:     ${r.checksum}`);
    console.log(`  • Preserved Projects:   ${r.itemsTransferred.projects}`);
    console.log(`  • Preserved API Keys:   ${r.itemsTransferred.apiKeys}`);
    console.log(`  • Preserved Services:   ${r.itemsTransferred.services}`);
    console.log(`  • Preserved Providers:  ${r.itemsTransferred.providers}`);
    console.log(`  • Sync Protocol:        ${json.data.cluster.syncProtocol}`);
    console.log(`  • Rate Limiter:         ${json.data.cluster.rateLimiter}`);
  } catch (err: any) {
    console.error('\x1b[31mSwitch execution failed:\x1b[0m', err.message);
  }
}

async function main() {
  printBanner();
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  npx tsx scripts/cliSwitch.ts [options]

Options:
  --target=standalone      Switch architecture to Standalone Single Node
  --target=distributed     Switch architecture to Distributed Multi-Server Mesh
  --export-snapshot        Save full state snapshot to ./snapshots directory
  --import-snapshot=<file> Ingest state snapshot from specified JSON file
  --status                 Display current operational mode and cluster metrics
  --no-transfer            Skip state transfer (switch empty mode)
  --help                   Display this help message
`);
    return;
  }

  if (args.includes('--status')) {
    await getStatus();
    return;
  }

  if (args.includes('--export-snapshot')) {
    await exportSnapshot();
    return;
  }

  const importArg = args.find((a) => a.startsWith('--import-snapshot='));
  if (importArg) {
    const filePath = importArg.split('=')[1];
    if (filePath) {
      await importSnapshot(filePath);
      return;
    }
  }

  const targetArg = args.find((a) => a.startsWith('--target='));
  const targetMode = targetArg ? targetArg.split('=')[1]?.toLowerCase() : 'standalone';
  const noTransfer = args.includes('--no-transfer');

  if (targetMode !== 'standalone' && targetMode !== 'distributed') {
    console.error('\x1b[31mInvalid target mode. Must be "standalone" or "distributed".\x1b[0m');
    return;
  }

  await executeSwitch(targetMode, !noTransfer);
}

main().catch(console.error);
