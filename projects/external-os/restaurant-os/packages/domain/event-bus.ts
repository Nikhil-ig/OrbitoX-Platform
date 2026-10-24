/**
 * ⚡ RestaurantOS 2.x — Realtime Event Bus & SSE Gateway
 * ─────────────────────────────────────────────────────────────────────────────
 * Broadcasts canonical domain events to all connected clients (Operations, Floor,
 * KDS, Diner Mobile PWA) in real-time via Server-Sent Events (SSE).
 *
 * Invariants:
 * 1. Monotonic ordering: events carry strictly sequential IDs.
 * 2. Replay on reconnect: reads Last-Event-ID or ?lastEventId to replay missed events.
 * 3. Scoped routing: filters events by branchId/sessionId/tableNumber to prevent cross-context leaks.
 * 4. Active heartbeat: 15s ping frames keep proxies and mobile websockets alive.
 * 5. Instant termination: active streams are terminated immediately upon token revocation or session closure.
 */

import * as http from 'http';
import * as url from 'url';
import { DomainEvent, RestaurantRuntimeStore } from '../storage';
import { resolveAllowedOrigin } from './security';

export interface ClientScope {
  branchId?: string;
  floorId?: string;
  tableNumber?: string;
  sessionId?: string;
  orderId?: string;
}

export interface ClientConnectionInfo {
  scope: ClientScope;
  identity?: any;
  token?: string;
}

export class RealtimeEventBus {
  private clients: Map<http.ServerResponse, ClientConnectionInfo> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  public registerClient(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    store?: RestaurantRuntimeStore,
    identity?: any
  ): void {
    const allowedOrigin = resolveAllowedOrigin(req);
    const sseHeaders: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    };
    if (allowedOrigin) {
      sseHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
      sseHeaders['Vary'] = 'Origin';
    }
    res.writeHead(200, sseHeaders);

    const parsed = url.parse(req.url || '', true);
    const scope: ClientScope = {
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
      scope,
      identity,
      token,
    };

    res.write(`: connected at ${new Date().toISOString()} [client_scope:${JSON.stringify(scope)}]\n\n`);
    this.clients.set(res, connInfo);

    // Event replay for missed events upon reconnect
    const lastEventIdHeader = req.headers['last-event-id'] || parsed.query.lastEventId;
    if (lastEventIdHeader && store) {
      const sinceSeq = parseInt(lastEventIdHeader as string, 10);
      if (!isNaN(sinceSeq) && sinceSeq >= 0) {
        const oldestSeq = store.getOldestEventSequence();
        // If client's cursor is older than oldest retained event, gapless replay is impossible
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
          const missedEvents = store.getEvents(sinceSeq);
          for (const evt of missedEvents) {
            if (this.isEventEligibleForClient(evt, connInfo)) {
              const data = JSON.stringify(evt);
              res.write(`event: ${evt.type}\nid: ${evt.sequence}\ndata: ${data}\n\n`);
            }
          }
        }
      }
    }

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  public broadcast(event: DomainEvent): void {
    const data = JSON.stringify(event);
    const message = `event: ${event.type}\nid: ${event.sequence}\ndata: ${data}\n\n`;

    for (const [client, info] of this.clients.entries()) {
      if (this.isEventEligibleForClient(event, info)) {
        try {
          client.write(message);
        } catch (err) {
          this.clients.delete(client);
        }
      }
    }
  }

  /**
   * Terminate active SSE connections holding a revoked credential token.
   */
  public disconnectClientsForToken(token: string): number {
    if (!token) return 0;
    let count = 0;
    for (const [client, info] of this.clients.entries()) {
      if (info.token === token || info.identity?.id === token) {
        try {
          client.write(`event: token_revoked\ndata: {"error":"TOKEN_REVOKED"}\n\n`);
          client.end();
        } catch (err) {}
        this.clients.delete(client);
        count++;
      }
    }
    return count;
  }

  /**
   * Terminate active SSE connections for a closed dining session.
   */
  public disconnectClientsForSession(sessionId: string): number {
    if (!sessionId) return 0;
    let count = 0;
    for (const [client, info] of this.clients.entries()) {
      if (info.scope.sessionId === sessionId || info.identity?.sessionId === sessionId) {
        try {
          client.write(`event: session_closed\ndata: {"status":"CLOSED"}\n\n`);
          client.end();
        } catch (err) {}
        this.clients.delete(client);
        count++;
      }
    }
    return count;
  }

  private isEventEligibleForClient(event: DomainEvent, info: ClientConnectionInfo): boolean {
    const scope = info.scope;
    const identity = info.identity;

    // 0. Order tracker client strictly filtered to their order
    if (identity && identity.type === 'ORDER_TRACKER') {
      const allowedOrderId = identity.orderId;
      const evtOrderId = event.payload?.orderId || (event.payload?.task && event.payload.task.orderId) || (event.producer === allowedOrderId ? allowedOrderId : undefined);
      if (!evtOrderId || evtOrderId !== allowedOrderId) {
        return false;
      }
      return true;
    }

    // 1. If client is a DINER, strictly enforce session, table, and hide internal operational events
    if (identity && identity.type === 'DINER') {
      // Must match branch
      if (event.branchId && scope.branchId && event.branchId !== scope.branchId) {
        return false;
      }
      // Must match table
      if (!event.tableNumber || event.tableNumber !== scope.tableNumber) {
        return false;
      }
      // If event payload has sessionId, it must match diner's session
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
    }

    // 3. Station branch & role filtering
    if (identity && identity.type === 'STATION') {
      if (identity.branchId && event.branchId && event.branchId !== identity.branchId) {
        return false;
      }
    }

    // 4. Client requested specific branch query
    if (scope.branchId && event.branchId && event.branchId !== scope.branchId) {
      return false;
    }

    // 5. Client requested specific table query
    if (scope.tableNumber && event.tableNumber && event.tableNumber !== scope.tableNumber) {
      return false;
    }

    // 6. Client requested specific orderId query
    if (scope.orderId) {
      const evtOrderId = event.payload?.orderId || (event.payload?.task && event.payload.task.orderId);
      if (evtOrderId && evtOrderId !== scope.orderId) {
        return false;
      }
    }

    return true;
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  private startHeartbeat(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      for (const client of this.clients.keys()) {
        try {
          client.write(`: ping ${Date.now()}\n\n`);
        } catch (err) {
          this.clients.delete(client);
        }
      }
    }, 15000);
  }

  public destroy(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    for (const client of this.clients.keys()) {
      try {
        client.end();
      } catch (err) {}
    }
    this.clients.clear();
  }
}
