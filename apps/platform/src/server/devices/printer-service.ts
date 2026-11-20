import crypto from 'node:crypto';

export type PrinterDriver = 'epson_escpos' | 'star_prnt' | 'web_bridge';

export interface PrinterJobRecord {
  jobId: string;
  tenantId: string;
  actorId: string;
  driver: PrinterDriver;
  endpoint: string;
  paperWidth: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'FAILED' | 'REJECTED';
  deviceAckId?: string;
  errorMessage?: string;
  createdAt: string;
  acknowledgedAt?: string;
}

// In-process server-authoritative print job registry
const printJobRegistry = new Map<string, PrinterJobRecord>();

export class PrinterSecurityError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'PrinterSecurityError';
  }
}

/**
 * Validates printer endpoint to prevent SSRF and internal cloud metadata traversal.
 */
export function validatePrinterEndpoint(endpoint: string, driver: string): void {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    throw new PrinterSecurityError('Printer endpoint cannot be empty.');
  }

  // Parse hostname and port
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

  // Cloud metadata prefixes (e.g. 169.254.x.x link-local)
  if (lowerHost.startsWith('169.254.')) {
    throw new PrinterSecurityError('Link-local metadata IP addresses are strictly prohibited.');
  }

  // Standard printer ports check for raw TCP drivers
  if (driver === 'epson_escpos' || driver === 'star_prnt') {
    const standardPorts = [9100, 9101, 9102, 9103, 631, 515];
    if (process.env.NODE_ENV === 'production' && !standardPorts.includes(port)) {
      throw new PrinterSecurityError(`Port ${port} is not a recognized ESC/POS raw printer port (standard: 9100-9103, 631).`);
    }
  }
}

/**
 * Creates a server-tracked printer test dispatch job.
 */
export async function dispatchPrinterTestJob(input: {
  tenantId: string;
  actorId: string;
  driver: PrinterDriver;
  endpoint: string;
  paperWidth?: string;
}): Promise<{ ok: boolean; jobId: string; message: string; acknowledged: boolean }> {
  validatePrinterEndpoint(input.endpoint, input.driver);

  const jobId = `prn_job_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  const record: PrinterJobRecord = {
    jobId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    driver: input.driver,
    endpoint: input.endpoint,
    paperWidth: input.paperWidth || '80mm',
    status: 'PENDING',
    createdAt: now,
  };
  printJobRegistry.set(jobId, record);

  const runtimeUrl =
    process.env.RESTAURANTOS_RUNTIME_URL ||
    process.env.RESTAURANT_STORE_URL ||
    'http://127.0.0.1:4010';

  let bridgeResponded = false;
  let ackId: string | null = null;

  try {
    const res = await fetch(new URL('/api/restaurant/printer/test', runtimeUrl).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: input.endpoint,
        driver: input.driver,
        tenantId: input.tenantId,
        jobId,
        paperWidth: input.paperWidth,
      }),
      signal: AbortSignal.timeout(2500),
    });

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      // Authoritative verification: bridge must confirm acknowledgement
      if (json.acknowledged === true || json.deviceAckId || json.printId) {
        bridgeResponded = true;
        ackId = json.deviceAckId || json.printId || null;
      }
    }
  } catch {
    bridgeResponded = false;
  }

  if (!bridgeResponded || !ackId) {
    record.status = 'FAILED';
    record.errorMessage = `No ESC/POS printer hardware detected at ${input.endpoint}. Bridge acknowledgement failed.`;
    return {
      ok: false,
      jobId,
      acknowledged: false,
      message: record.errorMessage,
    };
  }

  record.status = 'ACKNOWLEDGED';
  record.deviceAckId = ackId;
  record.acknowledgedAt = new Date().toISOString();

  return {
    ok: true,
    jobId,
    acknowledged: true,
    message: `ESC/POS test receipt acknowledged by hardware at ${input.endpoint} (ack: ${ackId}).`,
  };
}

/**
 * Validates whether a given print job exists and was acknowledged by hardware for this tenant.
 */
export function verifyServerPrintJob(tenantId: string, jobId: string): boolean {
  if (!jobId || typeof jobId !== 'string') return false;
  const record = printJobRegistry.get(jobId);
  if (!record) return false;
  if (record.tenantId !== tenantId) return false;
  return record.status === 'ACKNOWLEDGED';
}

/**
 * For testing purposes: allows populating an acknowledged test job in test environments.
 */
export function recordTestPrintJobAck(tenantId: string, jobId: string, driver: PrinterDriver = 'epson_escpos'): void {
  const now = new Date().toISOString();
  printJobRegistry.set(jobId, {
    jobId,
    tenantId,
    actorId: 'usr_test',
    driver,
    endpoint: '192.168.1.200:9100',
    paperWidth: '80mm',
    status: 'ACKNOWLEDGED',
    deviceAckId: `ack_${jobId}`,
    createdAt: now,
    acknowledgedAt: now,
  });
}
