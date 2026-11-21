import crypto from 'node:crypto';
import dns from 'node:dns';
import net from 'node:net';
import { prisma } from '@/server/db/prisma';
import { signBridgeRequest, getDefaultBridgeKeys } from '@orbitox-io/bridge';

export type PrinterDriver = 'epson_escpos' | 'star_prnt' | 'web_bridge';

export type PrinterJobStatus =
  | 'CREATED'
  | 'DISPATCHED'
  | 'ACKNOWLEDGED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'REJECTED';

export interface PrinterJobRecord {
  jobId: string;
  tenantId: string;
  actorId: string;
  branchId?: string;
  deviceIdentity?: string;
  driver: PrinterDriver;
  endpoint: string;
  paperWidth: string;
  status: PrinterJobStatus;
  deviceAckId?: string;
  errorMessage?: string;
  isSimulation?: boolean;
  createdAt: string;
  dispatchedAt?: string;
  acknowledgedAt?: string;
  idempotencyKey?: string;
}

// In-process memory store for tests / offline operations without database
const printJobRegistry = new Map<string, PrinterJobRecord>();

export class PrinterSecurityError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'PrinterSecurityError';
  }
}

function isForbiddenIpAddress(ip: string): boolean {
  let cleanIp = ip.trim().toLowerCase();
  // Strip IPv4-mapped IPv6 prefix ::ffff:
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.slice(7);
  }

  // Cloud metadata and special IPs
  if (
    cleanIp === '169.254.169.254' ||
    cleanIp === '100.100.100.200' ||
    cleanIp === '0.0.0.0' ||
    cleanIp === '::'
  ) {
    return true;
  }

  // Link-local IPv4: 169.254.0.0/16
  if (cleanIp.startsWith('169.254.')) {
    return true;
  }

  // Link-local IPv6: fe80::/10
  if (cleanIp.startsWith('fe80:') || cleanIp.startsWith('fe80::')) {
    return true;
  }

  // Multicast IPv4: 224.0.0.0 - 239.255.255.255
  if (/^(22[4-9]|23[0-9])\./.test(cleanIp)) {
    return true;
  }

  // Multicast IPv6: ff00::/8
  if (cleanIp.startsWith('ff') && cleanIp.includes(':')) {
    return true;
  }

  // Loopback: 127.0.0.0/8 or ::1 in production
  if (process.env.NODE_ENV === 'production') {
    if (cleanIp.startsWith('127.') || cleanIp === '::1') {
      return true;
    }
  }

  return false;
}

/**
 * Validates printer endpoint to prevent SSRF and internal cloud metadata traversal.
 * Performs immediate synchronous format/IP checks, and resolves DNS for hostnames.
 */
export function validatePrinterEndpoint(endpoint: string, driver: string): Promise<void> {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    throw new PrinterSecurityError('Printer endpoint cannot be empty.');
  }

  let host = trimmed;
  let port = 9100;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (driver !== 'web_bridge') {
      throw new PrinterSecurityError(`HTTP/HTTPS protocols are only supported for the web_bridge driver, got ${driver}.`);
    }
    try {
      const url = new URL(trimmed);
      host = url.hostname;
      port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
    } catch {
      throw new PrinterSecurityError('Invalid URL format for printer endpoint.');
    }
  } else if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    host = parts[0] || '';
    const parsedPort = parseInt(parts[1] || '0', 10);
    if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      throw new PrinterSecurityError(`Invalid printer TCP port: ${parts[1]}`);
    }
    port = parsedPort;
  }

  // Disallow Cloud Metadata and Link-Local SSRF Targets
  const forbiddenHosts = [
    '169.254.169.254',
    'metadata.google.internal',
    'metadata.goog',
    '100.100.100.200',
    '0.0.0.0',
    '::1',
  ];

  const lowerHost = host.toLowerCase();
  for (const forbidden of forbiddenHosts) {
    if (lowerHost === forbidden || lowerHost.endsWith(`.${forbidden}`)) {
      throw new PrinterSecurityError(`Network target ${host} is forbidden by platform SSRF security policy.`);
    }
  }

  if (lowerHost.startsWith('169.254.')) {
    throw new PrinterSecurityError('Link-local metadata IP addresses are strictly prohibited.');
  }

  if (isForbiddenIpAddress(lowerHost)) {
    throw new PrinterSecurityError(`Target IP ${host} is forbidden by platform SSRF security policy.`);
  }

  // Standard printer ports check for raw TCP drivers
  if (driver === 'epson_escpos' || driver === 'star_prnt') {
    const standardPorts = [9100, 9101, 9102, 9103, 631, 515];
    if (process.env.NODE_ENV === 'production' && !standardPorts.includes(port)) {
      throw new PrinterSecurityError(`Port ${port} is not a recognized ESC/POS raw printer port (standard: 9100-9103, 631).`);
    }
  }

  return (async () => {
    if (!net.isIP(host)) {
      try {
        const records = await dns.promises.lookup(host, { all: true });
        for (const record of records) {
          if (isForbiddenIpAddress(record.address)) {
            throw new PrinterSecurityError(`Resolved destination address ${record.address} for host ${host} is forbidden by SSRF security policy.`);
          }
        }
      } catch (err: any) {
        if (err instanceof PrinterSecurityError) throw err;
        if (process.env.NODE_ENV === 'production') {
          throw new PrinterSecurityError(`Unable to resolve printer host "${host}": ${err.message}`);
        }
      }
    }
  })();
}

/**
 * Persists a printer job record into durable storage and memory registry.
 */
export async function persistPrinterJob(record: PrinterJobRecord): Promise<void> {
  printJobRegistry.set(record.jobId, record);

  if (process.env.DATABASE_URL) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${record.tenantId}, true)`;
        await tx.$executeRaw`
          INSERT INTO public."BillingProviderCache" ("tenantId", "cacheKey", "subscriptionId", "payload", "expiresAt", "updatedAt")
          VALUES (${record.tenantId}, ${`printer_job:${record.jobId}`}, 'devices', ${JSON.stringify(record)}::jsonb, NOW() + interval '30 days', NOW())
          ON CONFLICT ("tenantId", "cacheKey") DO UPDATE
            SET "payload" = ${JSON.stringify(record)}::jsonb,
                "updatedAt" = NOW()
        `;
      });
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'test') {
        throw new Error(`Failed to persist printer job to database: ${err.message}`);
      }
    }
  }
}

/**
 * Retrieves a printer job from durable storage with tenant scoping.
 */
export async function getPrinterJob(tenantId: string, jobId: string): Promise<PrinterJobRecord | null> {
  if (process.env.DATABASE_URL) {
    try {
      const rows = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
        return await tx.$queryRaw<Array<{ payload: any }>>`
          SELECT "payload" FROM public."BillingProviderCache"
          WHERE "tenantId" = ${tenantId} AND "cacheKey" = ${`printer_job:${jobId}`}
          LIMIT 1
        `;
      });
      if (rows.length > 0 && rows[0]?.payload) {
        return rows[0].payload as PrinterJobRecord;
      }
      return null;
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database error retrieving printer job: ${err.message}`);
      }
      // Fall through to memory registry in test/offline fallback
    }
  }

  const memory = printJobRegistry.get(jobId);
  if (memory && memory.tenantId === tenantId) {
    return memory;
  }
  return null;
}

/**
 * Validates whether a given print job exists and was acknowledged by genuine hardware for this exact tenant.
 * Simulated or mock printer jobs are strictly rejected.
 */
export async function verifyServerPrintJob(tenantId: string, jobId: string): Promise<boolean> {
  if (!jobId || typeof jobId !== 'string') return false;
  const record = await getPrinterJob(tenantId, jobId);
  if (!record) return false;
  if (record.tenantId !== tenantId) return false;
  if (record.isSimulation === true) return false;
  return record.status === 'ACKNOWLEDGED' && Boolean(record.deviceAckId);
}

/**
 * Creates and dispatches a server-tracked printer test dispatch job via authenticated runtime bridge.
 */
export async function dispatchPrinterTestJob(input: {
  tenantId: string;
  actorId: string;
  driver: PrinterDriver;
  endpoint: string;
  paperWidth?: string;
  branchId?: string;
  deviceIdentity?: string;
}): Promise<{ ok: boolean; jobId: string; message: string; acknowledged: boolean; deviceAckId?: string }> {
  await validatePrinterEndpoint(input.endpoint, input.driver);

  const jobId = `prn_job_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  const record: PrinterJobRecord = {
    jobId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    branchId: input.branchId,
    deviceIdentity: input.deviceIdentity,
    driver: input.driver,
    endpoint: input.endpoint,
    paperWidth: input.paperWidth || '80mm',
    status: 'DISPATCHED',
    createdAt: now,
    dispatchedAt: now,
  };
  await persistPrinterJob(record);

  const runtimeUrl =
    process.env.RESTAURANTOS_RUNTIME_URL ||
    process.env.RESTAURANT_STORE_URL ||
    'http://127.0.0.1:4010';

  let bridgeResponded = false;
  let ackId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const bridgeKeys = getDefaultBridgeKeys();
    const pathWithQuery = '/api/restaurant/printer/test';
    const requestBody = JSON.stringify({
      endpoint: input.endpoint,
      driver: input.driver,
      tenantId: input.tenantId,
      jobId,
      paperWidth: input.paperWidth || '80mm',
      branchId: input.branchId,
    });
    const signedHeaders = signBridgeRequest(bridgeKeys, {
      method: 'POST',
      pathWithQuery,
      tenantId: input.tenantId,
      principal: { sub: input.actorId, scopes: ['tenant:admin', 'devices:printer'] },
      body: requestBody,
    });

    const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...signedHeaders,
      },
      body: requestBody,
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json.isSimulation === true) {
        bridgeResponded = false;
        errorMessage = 'Printer runtime returned a simulated adapter acknowledgement. Physical hardware or authenticated agent is required.';
      } else if (json.acknowledged === true && json.deviceAckId) {
        bridgeResponded = true;
        ackId = json.deviceAckId;
      } else {
        errorMessage = json.message || 'Printer runtime response lacked authoritative hardware acknowledgement.';
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      errorMessage = errJson.message || `Printer test request failed with status ${res.status}.`;
    }
  } catch (err: any) {
    bridgeResponded = false;
    errorMessage = err.name === 'TimeoutError' || err.name === 'AbortError'
      ? `Printer dispatch timed out connecting to runtime backend.`
      : `Failed to reach restaurant printer dispatch bridge: ${err.message}`;
  }

  if (!bridgeResponded || !ackId) {
    record.status = 'FAILED';
    record.isSimulation = true;
    record.errorMessage = errorMessage || `No ESC/POS printer hardware detected at ${input.endpoint}. Bridge acknowledgement failed.`;
    await persistPrinterJob(record);
    return {
      ok: false,
      jobId,
      acknowledged: false,
      message: record.errorMessage,
    };
  }

  record.status = 'ACKNOWLEDGED';
  record.deviceAckId = ackId;
  record.isSimulation = false;
  record.acknowledgedAt = new Date().toISOString();
  await persistPrinterJob(record);

  return {
    ok: true,
    jobId,
    acknowledged: true,
    deviceAckId: ackId,
    message: `ESC/POS test receipt acknowledged by hardware at ${input.endpoint} (ack: ${ackId}).`,
  };
}

/**
 * For testing purposes: allows populating an acknowledged hardware test job in test environments with durability.
 */
export async function recordHardwarePrintJobAck(
  tenantId: string,
  jobId: string,
  driver: PrinterDriver = 'epson_escpos',
  deviceAckId = `hw_ack_${jobId}`,
): Promise<void> {
  const now = new Date().toISOString();
  const record: PrinterJobRecord = {
    jobId,
    tenantId,
    actorId: 'usr_test',
    driver,
    endpoint: '192.168.1.200:9100',
    paperWidth: '80mm',
    status: 'ACKNOWLEDGED',
    deviceAckId,
    isSimulation: false,
    createdAt: now,
    dispatchedAt: now,
    acknowledgedAt: now,
  };
  await persistPrinterJob(record);
}

/**
 * For testing purposes: allows populating an acknowledged test job in test environments with durability.
 */
export async function recordTestPrintJobAck(
  tenantId: string,
  jobId: string,
  driver: PrinterDriver = 'epson_escpos',
  deviceAckId = `ack_${jobId}`,
): Promise<void> {
  await recordHardwarePrintJobAck(tenantId, jobId, driver, deviceAckId);
}
