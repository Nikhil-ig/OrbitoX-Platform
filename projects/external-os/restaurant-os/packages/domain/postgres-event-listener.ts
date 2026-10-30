/**
 * 🛰️ PostgreSQL Outbox LISTEN/NOTIFY Event Listener for RestaurantOS
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-server event distribution:
 * When Server 1 commits an event into DomainEvent, PostgreSQL trigger fires
 * NOTIFY restaurant_kds_events.
 * Server 2 receives the notification on this dedicated pg connection and
 * broadcasts it to connected KDS screens within 1 second.
 */

import { RealtimeEventBus } from './event-bus';

interface PgNotification {
  channel: string;
  payload?: string;
}

interface PgClientLike {
  connect(): Promise<void>;
  query(sql: string): Promise<any>;
  on(event: 'notification', listener: (msg: PgNotification) => void): this;
  on(event: 'error', listener: (err: any) => void): this;
  end(): Promise<void>;
}

function loadPgClientClass(): any {
  try {
    return require('pg').Client;
  } catch {
    try {
      const path = require('path');
      const searchPaths = [
        path.resolve(process.cwd(), '../../../orbitox/apps/web'),
        path.resolve(process.cwd(), '../../../orbitox'),
        path.resolve(__dirname, '../../../../orbitox/apps/web'),
        path.resolve(__dirname, '../../../../orbitox'),
        path.resolve(process.cwd(), 'node_modules'),
      ];
      const pgPath = require.resolve('pg', { paths: searchPaths });
      return require(pgPath).Client;
    } catch {
      return null;
    }
  }
}

export class PostgresEventListener {
  private client: PgClientLike | null = null;
  private isRunning = false;

  constructor(
    private readonly connectionString: string,
    private readonly eventBus: RealtimeEventBus
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const ClientClass = loadPgClientClass();
      if (!ClientClass) {
        console.warn('[PostgresEventListener] pg module not found; skipping outbox listener');
        return;
      }
      this.client = new ClientClass({ connectionString: this.connectionString });
      await this.client!.connect();

      await this.client!.query('LISTEN restaurant_kds_events');

      this.client!.on('notification', (msg: PgNotification) => {
        if (msg.channel === 'restaurant_kds_events' && msg.payload) {
          try {
            const raw = JSON.parse(msg.payload);
            const domainEvent = {
              id: raw.id || `evt_${Date.now()}`,
              tenantId: raw.tenantId,
              sequence: raw.sequence || 0,
              type: raw.type || 'order.updated',
              timestamp: new Date().toISOString(),
              producer: raw.producer || 'postgres-notify',
              branchId: raw.branchId || 'main',
              floorId: raw.floorId,
              tableNumber: raw.tableNumber,
              payload: raw.payload || {},
            };
            this.eventBus.broadcast(domainEvent);
          } catch (err: any) {
            console.error('[PostgresEventListener] Failed to parse event payload:', err.message);
          }
        }
      });

      this.client.on('error', (err) => {
        console.warn('[PostgresEventListener] Listener connection error:', err.message);
      });
    } catch (err: any) {
      console.warn('[PostgresEventListener] Could not establish LISTEN connection (non-fatal in test):', err.message);
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.client) {
      try {
        await this.client.end();
      } catch {}
      this.client = null;
    }
  }
}
