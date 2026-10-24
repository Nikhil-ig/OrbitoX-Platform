/**
 * ⚡ RestaurantOS 2.x — Realtime Event Bus & SSE Gateway
 * ─────────────────────────────────────────────────────────────────────────────
 * Broadcasts canonical domain events to connected clients in real-time via SSE.
 *
 * Multi-Tenant Guarantees:
 * 1. Strict Tenant Partitioning: Connected SSE streams are keyed by tenantId.
 *    A KDS screen on restaurant A will NEVER receive restaurant B's events.
 * 2. Monotonic ordering: events carry strictly sequential IDs.
 * 3. Scoped routing: filters events by branchId/sessionId/tableNumber.
 * 4. Active heartbeat: 15s ping frames keep proxies and mobile websockets alive.
 * 5. Instant termination: active streams terminated on token revocation or session closure.
 */

import * as http from 'http';
import * as url from 'url';
import { DomainEvent } from '../storage';
import { resolveAllowedOrigin } from './security';
import { tryGetActiveTenant } from './tenancy';

export interface ClientScope {
  tenantId?: string;
  branchId?: string;
  floorId?: string;
  tableNumber?: string;
  sessionId?: string;
  orderId?: string;
}

export interface ClientConnectionInfo {
  tenantId: string;
  scope: ClientScope;
  identity?: any;
  token?: string;
}

export class RealtimeEventBus {
  // Keyed by tenantId -> Map of active client responses
  private tenantClients: Map<string, Map<http.ServerResponse, ClientConnectionInfo>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  public registerClient(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    store?: any,
    identity?: any,
    explicitTenantId?: string
  ): void {
    const tenantId = explicitTenantId || tryGetActiveTenant()?.tenantId;
    if (!tenantId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'TENANT_REQUIRED', message: 'SSE stream requires an active tenant context.' }));
      return;
    }

    const allowedOrigin = resolveAllowedOrigin(req);
    const sseHeaders: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'x-tenant-id': tenantId,
    };
    if (allowedOrigin) {
      sseHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
      sseHeaders['Vary'] = 'Origin';
    }
    res.writeHead(200, sseHeaders);

    const parsed = url.parse(req.url || '', true);
    const scope: ClientScope = {
      tenantId,
      branchId: (parsed.query.branchId as string) || undefined,
      floorId: (parsed.query.floorId as string) || undefined,
      tableNumber: (parsed.query.tableNumber as string) || undefined,
      sessionId: (parsed.query.sessionId as string) || undefined,
      orderId: (parsed.query.orderId as string) || undefined,
    };

    // If client is authenticated as an ORDER_TRACKER, strictly lock scope to their authorized order
    if (identity && identity.type === 'ORDER_TRACKER') {
      if (identity.orderId) scope.orderId = identity.orderId;
    } else if (identity && identity.type === 'DINER') {
      if (identity.tableNumber) scope.tableNumber = identity.tableNumber;
      if (identity.sessionId) scope.sessionId = identity.sessionId;
      if (identity.branchId) scope.branchId = identity.branchId;
    } else if (identity && (identity.type === 'STAFF' || identity.type === 'ADMIN')) {
      if (identity.branchId && identity.branchId !== '*') {
        scope.branchId = identity.branchId;
      }
    } else if (identity && identity.type === 'STATION') {
      if (identity.branchId) scope.branchId = identity.branchId;
    }

    const token = identity?.id || (parsed.query.orderToken as string) || '';

    const connInfo: ClientConnectionInfo = {
      tenantId,
      scope,
      identity,
      token,
    };

    res.write(`: connected at ${new Date().toISOString()} [tenant:${tenantId}] [client_scope:${JSON.stringify(scope)}]\n\n`);

    if (!this.tenantClients.has(tenantId)) {
      this.tenantClients.set(tenantId, new Map());
    }
    const clientMap = this.tenantClients.get(tenantId)!;
    clientMap.set(res, connInfo);

    // Event replay for missed events upon reconnect (if store/repo provides historical replay)
    const lastEventIdHeader = req.headers['last-event-id'] || parsed.query.lastEventId;
    if (lastEventIdHeader && store && typeof store.getEvents === 'function') {
      const sinceSeq = parseInt(lastEventIdHeader as string, 10);
      if (!isNaN(sinceSeq) && sinceSeq >= 0) {
        Promise.resolve(typeof store.getOldestEventSequence === 'function' ? store.getOldestEventSequence() : 0)
          .then(async (oldestSeq) => {
            if (sinceSeq < oldestSeq - 1 && oldestSeq > 1) {
              const resyncData = JSON.stringify({
                code: 'RESYNC_REQUIRED',
                message: `Requested sequence ${sinceSeq} is older than retained history window (oldest sequence available: ${oldestSeq}). Full state resynchronization required.`,
                oldestAvailableSequence: oldestSeq,
                requestedSequence: sinceSeq,
                stateSnapshotUrl: '/api/restaurant/state',
              });
              res.write(`event: resync_required\ndata: ${resyncData}\n\n`);
            } else {
              const missedEvents = await store.getEvents(sinceSeq);
              if (Array.isArray(missedEvents)) {
                for (const evt of missedEvents) {
                  if (this.isEventEligibleForClient(evt, connInfo)) {
                    const data = JSON.stringify(evt);
                    res.write(`event: ${evt.type}\nid: ${evt.sequence}\ndata: ${data}\n\n`);
                  }
                }
              }
            }
          })
          .catch((replayErr) => {
            console.error('[EventBus] Error replaying events for client:', replayErr);
          });
      }
    }

    res.on('close', () => {
      const map = this.tenantClients.get(tenantId);
      if (map) {
        map.delete(res);
        if (map.size === 0) {
          this.tenantClients.delete(tenantId);
        }
      }
    });
  }

  public broadcast(event: DomainEvent): void {
    const eventTenantId = event.tenantId || (event.payload && event.payload.tenantId);
    if (!eventTenantId) {
      // Fail closed: Do NOT broadcast events without an identifiable tenantId
      return;
    }

    const clientMap = this.tenantClients.get(eventTenantId);
    if (!clientMap || clientMap.size === 0) {
      return;
    }

    const data = JSON.stringify(event);
    const message = `event: ${event.type}\nid: ${event.sequence}\ndata: ${data}\n\n`;

    for (const [client, info] of clientMap.entries()) {
      if (this.isEventEligibleForClient(event, info)) {
        try {
          client.write(message);
        } catch (err) {
          clientMap.delete(client);
        }
      }
    }
  }

  /**
   * Terminate active SSE connections holding a revoked credential token.
   */
  public disconnectClientsForToken(token: string, tenantId?: string): number {
    if (!token) return 0;
    let count = 0;

    const mapsToSearch = tenantId && this.tenantClients.has(tenantId)
      ? [this.tenantClients.get(tenantId)!]
      : Array.from(this.tenantClients.values());

    for (const clientMap of mapsToSearch) {
      for (const [client, info] of clientMap.entries()) {
        if (info.token === token || info.identity?.id === token) {
          try {
            client.write(`event: token_revoked\ndata: {"error":"TOKEN_REVOKED"}\n\n`);
            client.end();
          } catch (err) {}
          clientMap.delete(client);
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Terminate active SSE connections for a closed dining session.
   */
  public disconnectClientsForSession(sessionId: string, tenantId?: string): number {
    if (!sessionId) return 0;
    let count = 0;

    const mapsToSearch = tenantId && this.tenantClients.has(tenantId)
      ? [this.tenantClients.get(tenantId)!]
      : Array.from(this.tenantClients.values());

    for (const clientMap of mapsToSearch) {
      for (const [client, info] of clientMap.entries()) {
        if (info.scope.sessionId === sessionId || info.identity?.sessionId === sessionId) {
          try {
            client.write(`event: session_closed\ndata: {"status":"CLOSED"}\n\n`);
            client.end();
          } catch (err) {}
          clientMap.delete(client);
          count++;
        }
      }
    }
    return count;
  }

  public getActiveClientCount(tenantId?: string): number {
    if (tenantId) {
      return this.tenantClients.get(tenantId)?.size ?? 0;
    }
    let total = 0;
    for (const map of this.tenantClients.values()) {
      total += map.size;
    }
    return total;
  }

  public getConnectedClientsCount(tenantId?: string): number {
    return this.getActiveClientCount(tenantId);
  }

  private isEventEligibleForClient(event: DomainEvent, info: ClientConnectionInfo): boolean {
    const scope = info.scope;
    const identity = info.identity;

    // Strict Tenant Boundary Gate
    const eventTenantId = event.tenantId || (event.payload && event.payload.tenantId);
    if (eventTenantId !== info.tenantId) {
      return false;
    }

    // 0. Order tracker client strictly filtered to their order
    if (identity && identity.type === 'ORDER_TRACKER') {
      const allowedOrderId = identity.orderId;
      const evtOrderId =
        event.payload?.orderId ||
        (event.payload?.task && event.payload.task.orderId) ||
        (event.producer === allowedOrderId ? allowedOrderId : undefined);
      if (!evtOrderId || evtOrderId !== allowedOrderId) {
        return false;
      }
      return true;
    }

    // 1. If client is a DINER, strictly enforce session, table, and hide internal operational events
    if (identity && identity.type === 'DINER') {
      if (event.branchId && scope.branchId && event.branchId !== scope.branchId) {
        return false;
      }
      if (!event.tableNumber || event.tableNumber !== scope.tableNumber) {
        return false;
      }
      if (event.payload && event.payload.sessionId && scope.sessionId) {
        if (event.payload.sessionId !== scope.sessionId) {
          return false;
        }
      }
      return true;
    }

    // 2. Staff branch filtering
    if (identity && (identity.type === 'STAFF' || identity.type === 'ADMIN')) {
      if (identity.branchId && identity.branchId !== '*' && event.branchId) {
        if (event.branchId !== identity.branchId) {
          return false;
        }
      }
      return true;
    }

    // 3. Station filtering
    if (identity && identity.type === 'STATION') {
      if (identity.branchId && event.branchId && event.branchId !== identity.branchId) {
        return false;
      }
      if (identity.station && identity.station !== 'ALL') {
        const taskStation = event.payload?.station || (event.payload?.task && event.payload.task.station);
        if (taskStation && taskStation !== identity.station) {
          return false;
        }
      }
      return true;
    }

    // 4. Default: filter by branch/floor/table if client specified them in query params
    if (scope.branchId && event.branchId && scope.branchId !== event.branchId) {
      return false;
    }
    if (scope.floorId && event.floorId && scope.floorId !== event.floorId) {
      return false;
    }
    if (scope.tableNumber && event.tableNumber && scope.tableNumber !== event.tableNumber) {
      return false;
    }

    return true;
  }

  private startHeartbeat(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      const pingFrame = `: ping at ${new Date().toISOString()}\n\n`;
      for (const clientMap of this.tenantClients.values()) {
        for (const [client] of clientMap.entries()) {
          try {
            client.write(pingFrame);
          } catch (err) {
            clientMap.delete(client);
          }
        }
      }
    }, 15000);
    if (this.pingInterval.unref) {
      this.pingInterval.unref();
    }
  }

  public stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const clientMap of this.tenantClients.values()) {
      for (const [client] of clientMap.entries()) {
        try {
          client.end();
        } catch (e) {}
      }
      clientMap.clear();
    }
    this.tenantClients.clear();
  }
}

export const eventBus = new RealtimeEventBus();
