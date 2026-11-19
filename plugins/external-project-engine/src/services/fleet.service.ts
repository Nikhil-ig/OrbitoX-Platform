import { PersistentControlStore } from './control-store.service';
import { buildFleetSnapshot, FleetInput, FleetQuery, FleetSnapshot } from './fleet-snapshot';

/** Reads the live control store and returns the current fleet snapshot. */
export class FleetService {
  private store: PersistentControlStore = PersistentControlStore.getInstance();

  snapshot(query: FleetQuery = {}, nowMs: number = Date.now()): FleetSnapshot {
    const projects = Object.values(this.store.getProjects());
    const sessions: FleetInput['sessions'] = {};
    const environments: FleetInput['environments'] = {};
    const plugins: FleetInput['plugins'] = {};
    for (const p of projects) {
      sessions[p.id] = this.store.getSession(p.id);
      environments[p.id] = this.store.getEnvironments(p.id);
      plugins[p.id] = this.store.getPlugins(p.id);
    }
    return buildFleetSnapshot(
      { projects, sessions, environments, plugins, commands: this.store.getCommands(), audits: this.store.getAudits() },
      nowMs,
      query,
    );
  }
}
