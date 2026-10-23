/**
 * 🪐 Persistent Control Store
 * Enterprise persistence for OrbitoX Platform Control Plane.
 * Manages atomic disk persistence for projects, revisions, plugins, commands, and audit logs.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ExternalProjectRecord,
  ConfigurationRevision,
  ControlCommand,
  ProjectAuditEntry,
  PlatformPluginRecord,
  EnvironmentRecord,
  RuntimeSessionRecord,
} from '../types';

export interface PersistentStoreData {
  projects: Record<string, ExternalProjectRecord>;
  desiredStates: Record<string, any>;
  revisions: Record<string, ConfigurationRevision[]>;
  commands: ControlCommand[];
  audits: ProjectAuditEntry[];
  plugins: Record<string, PlatformPluginRecord[]>;
  environments: Record<string, EnvironmentRecord[]>;
  sessions: Record<string, RuntimeSessionRecord>;
}

export class PersistentControlStore {
  private static instance: PersistentControlStore;
  private filePath: string;
  private data: PersistentStoreData;
  private saveTimeout: any = null;

  private constructor() {
    // Locate root orbitox data directory
    const candidates = [
      path.resolve(process.cwd(), 'orbitox/data'),
      path.resolve(process.cwd(), 'data'),
      path.resolve(process.cwd(), '../../data'),
      path.resolve(__dirname, '../../../../data'),
    ];

    let dataDir: string = candidates[0] || path.resolve(process.cwd(), 'data');
    for (const cand of candidates) {
      if (fs.existsSync(cand) || cand.includes('data')) {
        dataDir = cand;
        break;
      }
    }

    // An explicit ORBITOX_DATA_DIR always wins, so containers and production
    // hosts can keep control-plane state on a persistent volume.
    const configuredDir = process.env.ORBITOX_DATA_DIR?.trim();
    if (configuredDir) {
      dataDir = path.resolve(configuredDir);
    }

    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // Fallback to /tmp if permissions fail
        dataDir = path.resolve(process.cwd(), '.orbitox_state');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    this.filePath = path.join(dataDir, 'platform-control-store.json');
    this.data = this.loadOrCreateDefault();
  }

  /** Directory holding the control-plane state files. */
  public getDataDir(): string {
    return path.dirname(this.filePath);
  }

  public static getInstance(): PersistentControlStore {
    if (!PersistentControlStore.instance) {
      PersistentControlStore.instance = new PersistentControlStore();
    }
    return PersistentControlStore.instance;
  }

  private loadOrCreateDefault(): PersistentStoreData {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          projects: parsed.projects || {},
          desiredStates: parsed.desiredStates || {},
          revisions: parsed.revisions || {},
          commands: parsed.commands || [],
          audits: parsed.audits || [],
          plugins: parsed.plugins || {},
          environments: parsed.environments || {},
          sessions: parsed.sessions || {},
        };
      } catch (err) {
        console.error('[PersistentControlStore] Error reading file, re-initializing default:', err);
      }
    }

    return {
      projects: {},
      desiredStates: {},
      revisions: {},
      commands: [],
      audits: [],
      plugins: {},
      environments: {},
      sessions: {},
    };
  }

  public saveDebounced(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate();
    }, 150);
  }

  public saveImmediate(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[PersistentControlStore] Failed to save state to disk:', err);
    }
  }

  // --- Projects ---
  getProjects(): Record<string, ExternalProjectRecord> {
    return this.data.projects;
  }

  getProject(id: string): ExternalProjectRecord | undefined {
    return this.data.projects[id];
  }

  saveProject(project: ExternalProjectRecord): void {
    this.data.projects[project.id] = project;
    this.saveDebounced();
  }

  // --- Desired States ---
  getDesiredState(projectId: string): any {
    return this.data.desiredStates[projectId] || {};
  }

  saveDesiredState(projectId: string, state: any): void {
    this.data.desiredStates[projectId] = state;
    this.saveDebounced();
  }

  // --- Revisions ---
  getRevisions(projectId: string): ConfigurationRevision[] {
    return this.data.revisions[projectId] || [];
  }

  saveRevision(projectId: string, revision: ConfigurationRevision): void {
    if (!this.data.revisions[projectId]) {
      this.data.revisions[projectId] = [];
    }
    const list = this.data.revisions[projectId];
    const idx = list.findIndex((r) => r.revisionId === revision.revisionId);
    if (idx >= 0) {
      list[idx] = revision;
    } else {
      list.unshift(revision);
    }
    this.saveDebounced();
  }

  // --- Commands ---
  getCommands(projectId?: string): ControlCommand[] {
    if (projectId) {
      return this.data.commands.filter((c) => c.projectId === projectId);
    }
    return this.data.commands;
  }

  saveCommand(cmd: ControlCommand): void {
    const idx = this.data.commands.findIndex((c) => c.commandId === cmd.commandId);
    if (idx >= 0) {
      this.data.commands[idx] = cmd;
    } else {
      this.data.commands.unshift(cmd);
    }
    if (this.data.commands.length > 500) this.data.commands.pop();
    this.saveDebounced();
  }

  // --- Audits ---
  getAudits(projectId?: string): ProjectAuditEntry[] {
    if (projectId) {
      return this.data.audits.filter((a) => a.projectId === projectId);
    }
    return this.data.audits;
  }

  saveAudit(entry: ProjectAuditEntry): void {
    this.data.audits.unshift(entry);
    if (this.data.audits.length > 1000) this.data.audits.pop();
    this.saveDebounced();
  }

  // --- Plugins ---
  getPlugins(projectId: string): PlatformPluginRecord[] {
    return this.data.plugins[projectId] || [];
  }

  savePlugins(projectId: string, plugins: PlatformPluginRecord[]): void {
    this.data.plugins[projectId] = plugins;
    this.saveDebounced();
  }

  // --- Environments ---
  getEnvironments(projectId: string): EnvironmentRecord[] {
    return this.data.environments[projectId] || [];
  }

  saveEnvironments(projectId: string, envs: EnvironmentRecord[]): void {
    this.data.environments[projectId] = envs;
    this.saveDebounced();
  }

  // --- Sessions ---
  getSession(projectId: string): RuntimeSessionRecord | undefined {
    return this.data.sessions[projectId];
  }

  saveSession(session: RuntimeSessionRecord): void {
    this.data.sessions[session.projectId] = session;
    this.saveDebounced();
  }
}
