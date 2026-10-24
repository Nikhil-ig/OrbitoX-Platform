/**
 * 📊 RestaurantOS 3.1 — Structured NDJSON Logging & Observability Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-leakage, high-performance structured logging:
 * - Deterministic JSON output for log aggregators (Elasticsearch / CloudWatch / Datadog)
 * - Cryptographic correlation ID generation and strict validation
 * - Anti-log-injection header sanitization
 * - Recursive credential, token, PIN, and PII masking
 * - Continuous rolling event-loop delay monitoring
 */

import * as crypto from 'crypto';
import { monitorEventLoopDelay, IntervalHistogram } from 'perf_hooks';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  tenantId?: string;
  method?: string;
  pathname?: string;
  status?: number;
  durationMs?: number;
  branchId?: string;
  role?: string;
  meta?: Record<string, any>;
  error?: string;
}

// Keys that must always be redacted in metadata and log payloads
const SENSITIVE_KEY_REGEX = /^(pin|pinhash|salt|password|authorization|cookie|card|cvv|privatekey)$|.*(secret|token|password|salt|credential|pin).*/i;

// Anti-log-injection regex for incoming request/correlation IDs:
// Must be alphanumeric with hyphens or underscores, 8 to 64 chars.
const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_\-]{8,64}$/;

/**
 * Validates an incoming correlation ID or generates a secure fallback.
 * Strictly prevents CRLF and log injection.
 */
export function validateOrGenerateRequestId(incoming?: string | string[]): string {
  const raw = Array.isArray(incoming) ? incoming[0] : incoming;
  if (raw && typeof raw === 'string') {
    const trimmed = raw.trim();
    if (SAFE_REQUEST_ID_REGEX.test(trimmed)) {
      return trimmed;
    }
  }
  return `req_${crypto.randomUUID()}`;
}

/**
 * Masks phone numbers to protect customer privacy (e.g., "+91 98765 43210" -> "+91 ******3210").
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length >= 10) {
    const last4 = digits.slice(-4);
    const prefix = phone.startsWith('+') ? phone.slice(0, phone.indexOf(' ') > 0 ? phone.indexOf(' ') + 1 : 3) : '';
    return `${prefix}******${last4}`.trim();
  }
  return '******';
}

/**
 * Recursively sanitizes objects to redact credentials, secrets, and PII.
 */
export function redactSensitiveData(data: any, seen = new WeakSet()): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') {
    if (typeof data === 'string') {
      const trimmed = data.trim();
      // Redact Authorization headers
      if (trimmed.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED]';
      }
      if (trimmed.toLowerCase().startsWith('basic ')) {
        return 'Basic [REDACTED]';
      }
      // Preserve standard URLs and data URLs
      if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return data;
      }
      // Redact suspected long tokens (Standard Base64 with optional padding = or ==, Base64URL, and JWTs)
      if (/^[a-zA-Z0-9_\-\.\+/]{40,}={0,2}$/.test(trimmed)) {
        return '[REDACTED_TOKEN]';
      }
    }
    return data;
  }

  // Prevent circular reference infinite loops
  if (seen.has(data)) {
    return '[CIRCULAR]';
  }
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, seen));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (key.toLowerCase().includes('phone') && typeof value === 'string') {
      sanitized[key] = maskPhoneNumber(value);
    } else if ((key.toLowerCase().includes('address') || key.toLowerCase().includes('street')) && typeof value === 'string') {
      sanitized[key] = '[PROTECTED_ADDRESS]';
    } else {
      sanitized[key] = redactSensitiveData(value, seen);
    }
  }

  return sanitized;
}

// Continuous Event Loop Latency Monitor
class EventLoopMonitor {
  private histogram: IntervalHistogram | null = null;
  private fallbackSamples: number[] = [];
  private fallbackTimer: NodeJS.Timeout | null = null;
  private maxSamples = 60;

  constructor() {
    try {
      this.histogram = monitorEventLoopDelay({ resolution: 20 });
      this.histogram.enable();
    } catch {
      // Fallback continuous sampling if perf_hooks monitorEventLoopDelay is not supported
      this.startFallbackSampler();
    }
  }

  private startFallbackSampler(): void {
    let lastTime = process.hrtime.bigint();
    this.fallbackTimer = setInterval(() => {
      const now = process.hrtime.bigint();
      const deltaNs = Number(now - lastTime);
      lastTime = now;
      const lagMs = Math.max(0, (deltaNs - 100_000_000) / 1_000_000); // 100ms interval
      this.fallbackSamples.push(lagMs);
      if (this.fallbackSamples.length > this.maxSamples) {
        this.fallbackSamples.shift();
      }
    }, 100);
    this.fallbackTimer.unref();
  }

  public getMetrics(): { p50Ms: number; p99Ms: number; meanMs: number; healthy: boolean } {
    if (this.histogram) {
      const p50Ns = this.histogram.percentile(50);
      const p99Ns = this.histogram.percentile(99);
      const meanNs = this.histogram.mean;

      const p50Ms = Math.round((p50Ns / 1_000_000) * 100) / 100;
      const p99Ms = Math.round((p99Ns / 1_000_000) * 100) / 100;
      const meanMs = Math.round((meanNs / 1_000_000) * 100) / 100;

      // Reset histogram window periodically to avoid stale peak accumulation
      if (this.histogram.exceeds > 1000) {
        this.histogram.reset();
      }

      return {
        p50Ms,
        p99Ms,
        meanMs,
        healthy: p99Ms < 200, // Healthy if 99th percentile lag < 200ms
      };
    }

    if (this.fallbackSamples.length === 0) {
      return { p50Ms: 0, p99Ms: 0, meanMs: 0, healthy: true };
    }

    const sorted = [...this.fallbackSamples].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
    const mean = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;

    return {
      p50Ms: Math.round(p50 * 100) / 100,
      p99Ms: Math.round(p99 * 100) / 100,
      meanMs: Math.round(mean * 100) / 100,
      healthy: p99 < 200,
    };
  }

  public stop(): void {
    if (this.histogram) {
      this.histogram.disable();
    }
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
    }
  }
}

export const eventLoopMonitor = new EventLoopMonitor();

/**
 * Structured Logger emitting newline-delimited JSON.
 */
class StructuredLogger {
  private isTest = process.env.NODE_ENV === 'test';

  public log(entry: StructuredLogEntry): void {
    const sanitizedEntry = {
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level,
      message: entry.message,
      requestId: entry.requestId,
      tenantId: entry.tenantId,
      method: entry.method,
      pathname: entry.pathname,
      status: entry.status,
      durationMs: entry.durationMs,
      branchId: entry.branchId,
      role: entry.role,
      meta: entry.meta ? redactSensitiveData(entry.meta) : undefined,
      error: entry.error,
    };

    // Clean undefined keys
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(sanitizedEntry)) {
      if (v !== undefined) payload[k] = v;
    }

    const ndjson = JSON.stringify(payload);
    if (!this.isTest || process.env.VERBOSE_LOGS === 'true') {
      process.stdout.write(ndjson + '\n');
    }
  }

  public info(message: string, meta?: Record<string, any>): void {
    this.log({ timestamp: new Date().toISOString(), level: 'info', message, meta });
  }

  public warn(message: string, meta?: Record<string, any>): void {
    this.log({ timestamp: new Date().toISOString(), level: 'warn', message, meta });
  }

  public error(message: string, error?: Error | string, meta?: Record<string, any>): void {
    const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
    this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: errorMsg,
      meta,
    });
  }
}

export const logger = new StructuredLogger();
