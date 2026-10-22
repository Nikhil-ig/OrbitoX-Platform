import * as fs from 'fs';
import * as path from 'path';
import {
  ControlClient,
  OrbitoxProjectManifest,
  SignedRuntimeConfiguration,
  ControlCommand,
} from '../../../../../orbitox/packages/external-runtime-sdk/src';

export class RestaurantRuntimeController {
  public client: ControlClient;
  public manifest: OrbitoxProjectManifest;
  private activeConfig: SignedRuntimeConfiguration | null = null;
  private receivedCommands: ControlCommand[] = [];
  private lastSyncTime: string = new Date().toISOString();

  constructor() {
    const candidates = [
      path.resolve(__dirname, '../../orbitox.project.json'),
      path.resolve(process.cwd(), 'orbitox.project.json'),
      path.resolve(process.cwd(), 'projects/external-os/restaurant-os/orbitox.project.json'),
    ];
    let manifestPath = candidates[0];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        manifestPath = cand;
        break;
      }
    }

    this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    this.client = new ControlClient({
      manifest: this.manifest,
      runtimePort: 4010,
      onConfigUpdated: (newConfig) => {
        console.log(`[RestaurantRuntime] ⚡ Received Desired-State Config Rev #${newConfig.revisionNumber || newConfig.configVersion}`);
        this.activeConfig = newConfig;
        this.lastSyncTime = new Date().toISOString();
      },
      onCommandReceived: async (cmd) => {
        console.log(`[RestaurantRuntime] 📥 Received Authorized Control Command: ${cmd.action} (${cmd.commandId})`);
        this.receivedCommands.unshift(cmd);
        if (this.receivedCommands.length > 50) this.receivedCommands.pop();

        if (cmd.action === 'rotate_qr_locator') {
          const newLocator = Math.random().toString(36).substring(2, 10).toUpperCase();
          return { success: true, result: { table: cmd.parameters?.table || 'T-14', newLocator } };
        }
        if (cmd.action === 'run_health_check') {
          return { success: true, result: { memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), uptime: process.uptime() } };
        }
        if (cmd.action === 'refresh_cache') {
          return { success: true, result: { clearedEntries: 42 } };
        }
        return { success: true, result: { action: cmd.action, defaultExecuted: true } };
      },
    });
  }

  async start(): Promise<void> {
    try {
      console.log(`[RestaurantRuntime] 🛰️ Registering with OrbitoX Control Plane at ${this.manifest.platformController.controlPlaneUrl}...`);
      const res = await this.client.registerRuntime();
      console.log(`[RestaurantRuntime] ✅ Handshake OK! Session: ${res.controlSessionId}`);
      this.activeConfig = res.signedConfig;
      this.lastSyncTime = new Date().toISOString();
    } catch (err: any) {
      console.warn(`[RestaurantRuntime] ⚠️ Control Plane handshake deferred:`, err.message);
    }
  }

  isFeatureEnabled(key: string, defaultValue = true): boolean {
    return this.client.features.isEnabled(key, defaultValue);
  }

  getActiveConfig(): SignedRuntimeConfiguration | null {
    return this.activeConfig;
  }

  getAppliedRevision(): number {
    return this.client.getAppliedRevision();
  }

  getDesiredRevision(): number {
    return this.client.getDesiredRevision();
  }

  getReceivedCommands(): ControlCommand[] {
    return this.receivedCommands;
  }

  getLastSyncTime(): string {
    return this.lastSyncTime;
  }

  async emitAudit(action: string, actor: string, details?: Record<string, any>): Promise<void> {
    try {
      await Promise.race([
        this.client.audit.log(action, actor, 'SUCCESS', details),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    } catch (err) {}
  }
}
