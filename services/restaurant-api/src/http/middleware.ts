import * as http from 'http';
import { resolveAllowedOrigin } from '../../packages/domain';
import { SEED_PLANS } from '@orbitox-io/plugin-engine';

export function parseBody(req: http.IncomingMessage): Promise<any> {
  if ((req as any)._parsedBody !== undefined) {
    return Promise.resolve((req as any)._parsedBody);
  }
  if ((req as any)._rawBuffer !== undefined) {
    try {
      const parsed = (req as any)._rawBuffer.length ? JSON.parse((req as any)._rawBuffer.toString('utf8')) : {};
      (req as any)._parsedBody = parsed;
      return Promise.resolve(parsed);
    } catch {
      (req as any)._parsedBody = {};
      return Promise.resolve({});
    }
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      (req as any).rawBody = data;
      (req as any)._rawBuffer = Buffer.from(data);
      try {
        const parsed = data ? JSON.parse(data) : {};
        (req as any)._parsedBody = parsed;
        resolve(parsed);
      } catch (err) {
        (req as any).rawBody = data;
        (req as any)._parsedBody = {};
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

export function readRawBody(req: http.IncomingMessage): Promise<string> {
  if ((req as any).rawBody !== undefined) {
    return Promise.resolve((req as any).rawBody);
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      (req as any).rawBody = data;
      (req as any)._rawBuffer = Buffer.from(data);
      try {
        (req as any)._parsedBody = data ? JSON.parse(data) : {};
      } catch {
        (req as any)._parsedBody = {};
      }
      resolve(data);
    });
    req.on('error', () => resolve(''));
  });
}

export function parseBuffer(req: http.IncomingMessage): Promise<Buffer> {
  if ((req as any)._rawBuffer !== undefined) {
    return Promise.resolve((req as any)._rawBuffer);
  }
  if ((req as any).rawBody !== undefined) {
    const buf = Buffer.from((req as any).rawBody);
    (req as any)._rawBuffer = buf;
    return Promise.resolve(buf);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      (req as any)._rawBuffer = buf;
      (req as any).rawBody = buf.toString('utf8');
      resolve(buf);
    });
    req.on('error', reject);
  });
}

export async function extractImageBuffer(req: http.IncomingMessage): Promise<{ buffer: Buffer; filename: string }> {
  const contentType = (req.headers['content-type'] || '').toLowerCase();

  if (contentType.includes('application/json')) {
    const body = await parseBody(req);
    const dataStr = body.image || body.data || body.file || '';
    if (!dataStr) {
      throw new Error('MISSING_IMAGE_DATA: JSON payload must contain base64 string in image, data, or file field.');
    }
    const cleanBase64 = dataStr.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    return { buffer, filename: body.filename || 'upload.png' };
  }

  const raw = await parseBuffer(req);
  if (contentType.includes('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
    const boundary = boundaryMatch ? boundaryMatch[1].trim().replace(/^"|"$/g, '') : null;
    if (boundary) {
      const boundaryDelimiter = `--${boundary}`;
      const str = raw.toString('binary');
      const startIdx = str.indexOf(boundaryDelimiter);
      if (startIdx !== -1) {
        const headerEnd = str.indexOf('\r\n\r\n', startIdx);
        if (headerEnd !== -1) {
          const headersText = str.slice(startIdx, headerEnd);
          const nextBoundary = str.indexOf(boundaryDelimiter, headerEnd + 4);
          const endIdx = nextBoundary !== -1 ? nextBoundary - 2 : str.length;
          const fileBinary = str.slice(headerEnd + 4, endIdx);
          const buffer = Buffer.from(fileBinary, 'binary');
          const fnMatch = headersText.match(/filename="([^"]+)"/i);
          const filename = fnMatch ? fnMatch[1] : 'upload.png';
          return { buffer, filename };
        }
      }
    }
  }

  return { buffer: raw, filename: 'upload.png' };
}

export function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  const allowedOrigin = resolveAllowedOrigin(res.req);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-idempotency-key, x-session-id, x-order-token, x-request-id, x-correlation-id, x-station-token, x-tenant-id, x-razorpay-signature, x-razorpay-event-id',
    'Access-Control-Expose-Headers': 'x-request-id, x-quota-warning',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  };
  if (res.hasHeader('x-quota-warning')) {
    headers['x-quota-warning'] = String(res.getHeader('x-quota-warning'));
  }
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Vary'] = 'Origin';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(data));
}

export function sendHtml(res: http.ServerResponse, html: string, statusCode: number = 200) {
  const allowedOrigin = resolveAllowedOrigin(res.req);
  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(statusCode, headers);
  res.end(html);
}

export interface RequestIdentity {
  type: 'ANONYMOUS' | 'DINER' | 'STAFF' | 'STATION' | 'ADMIN' | 'REVOKED_CAPABILITY' | 'INVALID_CREDENTIAL' | 'ORDER_TRACKER';
  id: string;
  role?: string;
  station?: string;
  branchId?: string;
  tableNumber?: string;
  sessionId?: string;
  orderId?: string;
  isPrivileged: boolean;
  rawToken?: string;
  authSource?: 'BEARER' | 'COOKIE' | 'STATION' | 'ANONYMOUS';
  error?: string;
}

export function isSameOriginRequest(req: http.IncomingMessage): boolean {
  // 1. Determine expected host from configuration or validated Host header
  let expectedHost = '';
  const configuredOrigin = process.env.RESTAURANTOS_ORIGIN || process.env.PUBLIC_ORIGIN;
  if (configuredOrigin) {
    try {
      expectedHost = new URL(configuredOrigin).host.toLowerCase();
    } catch { }
  }

  if (!expectedHost) {
    const rawHost = (req.headers['host'] as string) || '';
    // Validate host format: alphanumeric, dashes, dots, optional port (no CRLF or injection)
    if (/^[a-zA-Z0-9.-]+(:[0-9]+)?$/.test(rawHost)) {
      expectedHost = rawHost.toLowerCase();
    } else {
      // Malformed or missing host header: fail closed
      return false;
    }
  }

  // 2. Reject explicit cross-site fetch indicator
  const secFetchSite = (req.headers['sec-fetch-site'] as string) || '';
  if (secFetchSite === 'cross-site') {
    return false;
  }

  // 3. Extract Origin and Referer evidence
  const origin = (req.headers['origin'] as string) || '';
  const referer = (req.headers['referer'] as string) || '';

  // Fail closed: cookie mutations MUST have verified origin or referer evidence
  if (!origin && !referer) {
    return false;
  }

  let originMatches = false;
  let refererMatches = false;

  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host.toLowerCase() === expectedHost) {
        originMatches = true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const parsedReferer = new URL(referer);
      if (parsedReferer.host.toLowerCase() === expectedHost) {
        refererMatches = true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }

  return (origin ? originMatches : true) && (referer ? refererMatches : true);
}

export function checkTestKillPoint(req: http.IncomingMessage, stage: 'pre-commit' | 'post-commit'): void {
  if (process.env.NODE_ENV === 'production') return;
  const targetStage = req.headers['x-test-kill-point'] as string | undefined;
  if (!targetStage) return;
  if (targetStage === stage) {
    process.kill(process.pid, 'SIGKILL');
  } else if (targetStage === 'random-timing' && stage === 'pre-commit') {
    setTimeout(() => {
      try { process.kill(process.pid, 'SIGKILL'); } catch { }
    }, Math.floor(Math.random() * 20));
  }
}

export function isActiveRestaurantCataloguePlan(planId: unknown): planId is string {
  return typeof planId === 'string' && SEED_PLANS.some(
    (plan) => plan.planId === planId && plan.pluginId === '@orbitox/restaurant' && plan.status === 'ACTIVE',
  );
}
