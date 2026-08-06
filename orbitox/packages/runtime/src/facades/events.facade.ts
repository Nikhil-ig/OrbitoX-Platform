/**
 * EventsFacade
 * ─────────────────────────────────────────────────────────────
 * Reliable async event bus with automatic Redis/in-memory fallback.
 * 
 * Smart auto-detection:
 * - If Redis is reachable → use BullMQ (durable, retryable, distributed)
 * - If Redis is NOT reachable → automatically use in-memory EventEmitter
 * - Zero manual configuration required
 */

import { EventEmitter } from 'events';

export type EventHandler = (payload: any, meta: EventMeta) => Promise<void> | void;

export interface EventMeta {
  id: string;
  name: string;
  contextId: string;
  source: string;
  occurredAt: Date;
}

export class EventsFacade {
  private readonly emitter = new EventEmitter();
  private readonly handlers = new Map<string, EventHandler[]>();
  private redisAvailable = false;
  private eventBus?: any;

  constructor(eventBusService?: any, private readonly redisConfig?: { host: string; port: number }) {
    this.emitter.setMaxListeners(100);
    this.eventBus = eventBusService;
    // Check Redis in background — don't block
    this.detectRedis();
  }

  private async detectRedis(): Promise<void> {
    // Only attempt Redis if configuration was explicitly provided or env vars are set
    const redisHost = this.redisConfig?.host || process.env.REDIS_HOST;
    if (!redisHost || redisHost === 'localhost') {
      // Try a quick TCP ping
      try {
        await new Promise<void>((resolve, reject) => {
          const net = require('net');
          const host = this.redisConfig?.host || 'localhost';
          const port = this.redisConfig?.port || 6379;
          const socket = net.createConnection({ host, port });
          socket.setTimeout(300);
          socket.on('connect', () => { socket.destroy(); resolve(); });
          socket.on('error', () => { socket.destroy(); reject(new Error('no redis')); });
          socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
        });
        this.redisAvailable = true;
        console.log('[OrbitoX Events] Redis detected — using BullMQ for durable events.');
      } catch {
        this.redisAvailable = false;
        console.log('[OrbitoX Events] Redis not available — using in-memory event bus (development mode).');
      }
    }
  }

  /**
   * Emit an event.
   * Auto-routes to BullMQ (with retries) if Redis is available, else in-memory.
   * 
   * @example
   * await orbitox.events.emit('crm.lead.created', { leadId: 'abc' }, contextId);
   */
  async emit(eventName: string, payload: any, contextId: string = 'global', source: string = 'orbitox'): Promise<void> {
    const meta: EventMeta = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: eventName,
      contextId,
      source,
      occurredAt: new Date(),
    };

    // Try BullMQ if Redis is available
    if (this.redisAvailable && this.eventBus) {
      try {
        await this.eventBus.emit(eventName, { payload, meta }, contextId, source);
      } catch {
        // Fallback gracefully
        this.redisAvailable = false;
      }
    }

    // Always fire local in-memory handlers (supports both dev and real-time UI updates)
    const fullEvent = { ...payload, _meta: meta };
    const handlers = this.handlers.get(eventName) || [];
    const wildcardHandlers = this.handlers.get('*') || [];

    for (const handler of [...handlers, ...wildcardHandlers]) {
      try {
        await handler(payload, meta);
      } catch (err: any) {
        console.error(`[OrbitoX Events] Handler error for '${eventName}': ${err.message}`);
      }
    }

    this.emitter.emit(eventName, fullEvent);
  }

  /**
   * Listen for an event.
   * @example
   * orbitox.events.on('crm.lead.created', async (payload, meta) => {
   *   console.log('Lead created:', payload.leadId);
   * });
   */
  on(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  /**
   * Listen for an event exactly once.
   */
  once(eventName: string, handler: EventHandler): void {
    const wrapper: EventHandler = async (payload, meta) => {
      this.off(eventName, wrapper);
      await handler(payload, meta);
    };
    this.on(eventName, wrapper);
  }

  /**
   * Remove a specific handler.
   */
  off(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName) || [];
    this.handlers.set(eventName, handlers.filter(h => h !== handler));
  }

  /**
   * Listen to ALL events (useful for logging/debugging).
   * @example
   * orbitox.events.onAny((name, payload, meta) => console.log(name, payload));
   */
  onAny(handler: (eventName: string, payload: any, meta: EventMeta) => void): void {
    this.on('*', async (payload, meta) => handler(meta.name, payload, meta));
  }
}
