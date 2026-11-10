import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export type ObjectStoreEncryptionMode = 'kms' | 'client';

export interface ExportEncryptionKeyRing {
  readonly activeKid: string;
  readonly keys: ReadonlyMap<string, Buffer>;
}

const EXPORT_KEY_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const EXPORT_ENVELOPE_MAGIC = Buffer.from('ORBITOX_ENV_V1\0', 'ascii');
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

interface SerializedEnvelopeHeader {
  v: 1;
  alg: 'AES-256-GCM';
  kid: string;
  wrappedDekIv: string;
  wrappedDekTag: string;
  wrappedDek: string;
  payloadIv: string;
  payloadTag: string;
}

export function loadExportEncryptionKeyRingFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ExportEncryptionKeyRing {
  const rawKeys = env.ORBITOX_EXPORT_ENCRYPTION_KEYS?.trim();
  const activeKid = env.ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE?.trim();

  if (!rawKeys) {
    throw new Error(
      'ORBITOX_EXPORT_ENCRYPTION_KEYS is required when ORBITOX_OBJECT_STORE_ENCRYPTION=client.',
    );
  }
  if (!activeKid) {
    throw new Error(
      'ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE is required when ORBITOX_OBJECT_STORE_ENCRYPTION=client.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawKeys);
  } catch {
    throw new Error('ORBITOX_EXPORT_ENCRYPTION_KEYS must be valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('ORBITOX_EXPORT_ENCRYPTION_KEYS must be a JSON object mapping kid to 32-byte base64 key.');
  }

  const keys = new Map<string, Buffer>();
  for (const [kid, b64] of Object.entries(parsed as Record<string, unknown>)) {
    if (!EXPORT_KEY_ID_RE.test(kid)) {
      throw new Error(`Invalid export encryption key ID "${kid}".`);
    }
    if (typeof b64 !== 'string' || !b64.trim()) {
      throw new Error(`Export encryption key "${kid}" must be a non-empty base64 string.`);
    }
    const decoded = Buffer.from(b64.trim(), 'base64');
    if (decoded.length !== 32 || decoded.toString('base64') !== b64.trim()) {
      throw new Error(`Export encryption key "${kid}" must be a canonical base64-encoded 32-byte key.`);
    }
    keys.set(kid, decoded);
  }

  if (keys.size === 0) {
    throw new Error('ORBITOX_EXPORT_ENCRYPTION_KEYS must configure at least one key.');
  }
  if (!keys.has(activeKid)) {
    throw new Error(
      `ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE "${activeKid}" not found in ORBITOX_EXPORT_ENCRYPTION_KEYS.`,
    );
  }

  return { activeKid, keys };
}

function sealExportEnvelope(
  plaintext: Buffer,
  objectKey: string,
  bucket: string,
  ring: ExportEncryptionKeyRing,
): { body: Buffer; kid: string } {
  const kek = ring.keys.get(ring.activeKid);
  if (!kek) {
    throw new Error(`Active export encryption key "${ring.activeKid}" is unavailable.`);
  }

  const dek = crypto.randomBytes(32);
  const payloadIv = crypto.randomBytes(GCM_IV_BYTES);
  const payloadCipher = crypto.createCipheriv('aes-256-gcm', dek, payloadIv);
  payloadCipher.setAAD(Buffer.from(`orbitox:export:payload:v1:${bucket}/${objectKey}`, 'utf8'));
  const payloadCiphertext = Buffer.concat([payloadCipher.update(plaintext), payloadCipher.final()]);
  const payloadTag = payloadCipher.getAuthTag();

  const wrappedDekIv = crypto.randomBytes(GCM_IV_BYTES);
  const dekCipher = crypto.createCipheriv('aes-256-gcm', kek, wrappedDekIv);
  dekCipher.setAAD(Buffer.from(`orbitox:export:dek:v1:${objectKey}:${ring.activeKid}`, 'utf8'));
  const wrappedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
  const wrappedDekTag = dekCipher.getAuthTag();

  const header: SerializedEnvelopeHeader = {
    v: 1,
    alg: 'AES-256-GCM',
    kid: ring.activeKid,
    wrappedDekIv: wrappedDekIv.toString('base64'),
    wrappedDekTag: wrappedDekTag.toString('base64'),
    wrappedDek: wrappedDek.toString('base64'),
    payloadIv: payloadIv.toString('base64'),
    payloadTag: payloadTag.toString('base64'),
  };
  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  const lenPrefix = Buffer.allocUnsafe(4);
  lenPrefix.writeUInt32BE(headerBytes.length, 0);

  return {
    body: Buffer.concat([EXPORT_ENVELOPE_MAGIC, lenPrefix, headerBytes, payloadCiphertext]),
    kid: ring.activeKid,
  };
}

function openExportEnvelope(
  envelope: Buffer,
  objectKey: string,
  bucket: string,
  ring: ExportEncryptionKeyRing,
): Buffer {
  const minLen = EXPORT_ENVELOPE_MAGIC.length + 4;
  if (
    envelope.length < minLen ||
    !envelope.subarray(0, EXPORT_ENVELOPE_MAGIC.length).equals(EXPORT_ENVELOPE_MAGIC)
  ) {
    throw new Error(`Object "${objectKey}" does not contain a valid OrbitoX client-encrypted envelope.`);
  }

  const headerLen = envelope.readUInt32BE(EXPORT_ENVELOPE_MAGIC.length);
  const headerStart = minLen;
  const headerEnd = headerStart + headerLen;
  if (headerLen === 0 || headerLen > 16384 || headerEnd > envelope.length) {
    throw new Error(`Corrupt export encryption envelope header on "${objectKey}".`);
  }

  let header: SerializedEnvelopeHeader;
  try {
    header = JSON.parse(envelope.subarray(headerStart, headerEnd).toString('utf8')) as SerializedEnvelopeHeader;
  } catch {
    throw new Error(`Malformed JSON envelope header on "${objectKey}".`);
  }
  if (header.v !== 1 || header.alg !== 'AES-256-GCM' || !header.kid) {
    throw new Error(`Unsupported export encryption envelope on "${objectKey}".`);
  }

  const kek = ring.keys.get(header.kid);
  if (!kek) {
    throw new Error(`Unknown export encryption key id "${header.kid}" for object "${objectKey}".`);
  }

  const wrappedDekIv = Buffer.from(header.wrappedDekIv, 'base64');
  const wrappedDekTag = Buffer.from(header.wrappedDekTag, 'base64');
  const wrappedDek = Buffer.from(header.wrappedDek, 'base64');
  const payloadIv = Buffer.from(header.payloadIv, 'base64');
  const payloadTag = Buffer.from(header.payloadTag, 'base64');
  if (wrappedDekIv.length !== GCM_IV_BYTES || wrappedDekTag.length !== GCM_TAG_BYTES || payloadIv.length !== GCM_IV_BYTES || payloadTag.length !== GCM_TAG_BYTES) {
    throw new Error(`Invalid AES-GCM envelope parameters on "${objectKey}".`);
  }

  const dekDecipher = crypto.createDecipheriv('aes-256-gcm', kek, wrappedDekIv);
  dekDecipher.setAAD(Buffer.from(`orbitox:export:dek:v1:${objectKey}:${header.kid}`, 'utf8'));
  dekDecipher.setAuthTag(wrappedDekTag);
  const dek = Buffer.concat([dekDecipher.update(wrappedDek), dekDecipher.final()]);

  const payloadDecipher = crypto.createDecipheriv('aes-256-gcm', dek, payloadIv);
  payloadDecipher.setAAD(Buffer.from(`orbitox:export:payload:v1:${bucket}/${objectKey}`, 'utf8'));
  payloadDecipher.setAuthTag(payloadTag);
  return Buffer.concat([
    payloadDecipher.update(envelope.subarray(headerEnd)),
    payloadDecipher.final(),
  ]);
}

export interface ObjectPutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface ObjectStore {
  readonly driver: 'local' | 's3';
  put(key: string, data: Buffer, options?: ObjectPutOptions): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<number>;
  signedDownloadUrl(
    key: string,
    options: { expiresInSeconds: number; baseUrl?: string },
  ): Promise<string>;
}

export interface S3PutObjectInput {
  Bucket: string;
  Key: string;
  Body: Buffer;
  ContentType: string;
  Metadata?: Record<string, string>;
  ServerSideEncryption?: 'aws:kms';
  SSEKMSKeyId?: string;
}

export interface S3CommandExecutor {
  putObject(input: S3PutObjectInput): Promise<void>;
  getObject(input: { Bucket: string; Key: string }): Promise<Buffer | null>;
  deleteObject(input: { Bucket: string; Key: string }): Promise<void>;
  listKeys(input: { Bucket: string; Prefix: string }): Promise<string[]>;
  getPresignedGetUrl(input: { Bucket: string; Key: string; ExpiresIn: number }): Promise<string>;
}

function sanitizeKey(key: string): string {
  if (!key || key.startsWith('/') || key.startsWith('\\') || /^[A-Za-z]:/.test(key)) {
    throw new Error(`Invalid object store key: "${key}"`);
  }
  const normalized = key.replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (
    !normalized ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`Invalid object store key: "${key}"`);
  }
  return normalized;
}

export class LocalObjectStore implements ObjectStore {
  readonly driver = 'local' as const;
  private readonly rootDir: string;
  private readonly signingSecret: string;

  constructor(options: { rootDir?: string; signingSecret?: string } = {}) {
    this.rootDir = path.resolve(
      options.rootDir || path.join(os.tmpdir(), 'orbitox-object-store'),
    );
    this.signingSecret =
      options.signingSecret || crypto.randomBytes(32).toString('hex');
  }

  private resolveSafePath(key: string): string {
    const clean = sanitizeKey(key);
    const fullPath = path.resolve(this.rootDir, clean);
    const rel = path.relative(this.rootDir, fullPath);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Path traversal rejected for key "${key}"`);
    }
    return fullPath;
  }

  async put(key: string, data: Buffer, options?: ObjectPutOptions): Promise<void> {
    const targetPath = this.resolveSafePath(key);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, data);
    if (options?.contentType || options?.metadata) {
      await fs.writeFile(
        `${targetPath}.meta.json`,
        JSON.stringify({
          contentType: options.contentType || 'application/octet-stream',
          metadata: options.metadata || {},
        }),
      );
    }
  }

  async get(key: string): Promise<Buffer | null> {
    const targetPath = this.resolveSafePath(key);
    try {
      return await fs.readFile(targetPath);
    } catch (error: any) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const targetPath = this.resolveSafePath(key);
    await fs.rm(targetPath, { force: true });
    await fs.rm(`${targetPath}.meta.json`, { force: true });
  }

  async deletePrefix(prefix: string): Promise<number> {
    const cleanPrefix = sanitizeKey(prefix.replace(/\/+$/, ''));
    const targetDir = this.resolveSafePath(cleanPrefix);
    let count = 0;

    async function countFiles(dir: string): Promise<number> {
      let total = 0;
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (err: any) {
        if (err?.code === 'ENOENT') return 0;
        throw err;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          total += await countFiles(full);
        } else if (!entry.name.endsWith('.meta.json')) {
          total += 1;
        }
      }
      return total;
    }

    count = await countFiles(targetDir);
    await fs.rm(targetDir, { recursive: true, force: true });
    return count;
  }

  async signedDownloadUrl(
    key: string,
    options: { expiresInSeconds: number; baseUrl?: string },
  ): Promise<string> {
    const clean = sanitizeKey(key);
    const exp = Math.floor(Date.now() / 1000) + Math.max(1, options.expiresInSeconds);
    const sig = crypto
      .createHmac('sha256', this.signingSecret)
      .update(`${clean}:${exp}`)
      .digest('base64url');
    const base = (options.baseUrl || 'https://console.orbitox.internal').replace(/\/+$/, '');
    const url = new URL(`${base}/api/v1/customer/data/export/object`);
    url.searchParams.set('key', clean);
    url.searchParams.set('exp', String(exp));
    url.searchParams.set('sig', sig);
    return url.toString();
  }
}

export function createAwsSdkS3Executor(options: {
  region: string;
  endpoint?: string;
}): S3CommandExecutor {
  const region = options.region?.trim();
  if (!region) {
    throw new Error('createAwsSdkS3Executor requires explicit region (no default us-east-1 allowed).');
  }

  // Resolved through @orbitox/core/s3-client so pnpm isolated node_modules sees @aws-sdk/client-s3 without pulling NestJS.
  const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    getSignedUrl,
  } = require('@orbitox/core/s3-client') as typeof import('@orbitox/core/s3-client');

  const endpoint = options.endpoint?.trim();
  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });

  return {
    async putObject(input) {
      await client.send(new PutObjectCommand(input));
    },
    async getObject(input) {
      try {
        const response = await client.send(new GetObjectCommand(input));
        if (!response.Body) return null;
        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes);
      } catch (error: any) {
        if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
          return null;
        }
        throw error;
      }
    },
    async deleteObject(input) {
      await client.send(new DeleteObjectCommand(input));
    },
    async listKeys(input) {
      const keys: string[] = [];
      let continuationToken: string | undefined;
      do {
        const resp = await client.send(
          new ListObjectsV2Command({
            Bucket: input.Bucket,
            Prefix: input.Prefix,
            ContinuationToken: continuationToken,
          }),
        );
        for (const item of resp.Contents || []) {
          if (item.Key) keys.push(item.Key);
        }
        continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
      } while (continuationToken);
      return keys;
    },
    async getPresignedGetUrl(input) {
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: input.Bucket, Key: input.Key }),
        { expiresIn: input.ExpiresIn },
      );
    },
  };
}

export interface S3ObjectStoreOptions {
  bucket: string;
  region: string;
  encryption?: ObjectStoreEncryptionMode;
  kmsKeyId?: string;
  exportKeys?: ExportEncryptionKeyRing;
  endpoint?: string;
  executor?: S3CommandExecutor;
}

export class S3ObjectStore implements ObjectStore {
  readonly driver = 's3' as const;
  readonly encryption: ObjectStoreEncryptionMode;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly kmsKeyId?: string;
  private readonly exportKeys?: ExportEncryptionKeyRing;
  private readonly executor: S3CommandExecutor;

  constructor(options: S3ObjectStoreOptions) {
    if (!options.bucket?.trim()) {
      throw new Error('S3ObjectStore requires bucket (S3_BUCKET_NAME).');
    }
    if (!options.region?.trim()) {
      throw new Error(
        'S3ObjectStore requires explicit region (ORBITOX_OBJECT_STORE_REGION); default region fallback is prohibited.',
      );
    }

    const encryption: ObjectStoreEncryptionMode | undefined =
      options.encryption ?? (options.kmsKeyId !== undefined ? 'kms' : options.exportKeys ? 'client' : undefined);
    if (encryption !== 'kms' && encryption !== 'client') {
      throw new Error(
        'S3ObjectStore requires explicit encryption mode ("kms" or "client").',
      );
    }

    if (encryption === 'kms' && !options.kmsKeyId?.trim()) {
      throw new Error('S3ObjectStore requires SSE-KMS key id (ORBITOX_OBJECT_STORE_KMS_KEY_ID) when encryption="kms".');
    }
    if (encryption === 'client' && (!options.exportKeys || options.exportKeys.keys.size === 0)) {
      throw new Error(
        'S3ObjectStore requires ExportEncryptionKeyRing (ORBITOX_EXPORT_ENCRYPTION_KEYS) when encryption="client".',
      );
    }

    this.bucket = options.bucket.trim();
    this.region = options.region.trim();
    this.endpoint = options.endpoint?.trim() || undefined;
    this.encryption = encryption;
    this.kmsKeyId = options.kmsKeyId?.trim() || undefined;
    this.exportKeys = options.exportKeys;
    this.executor =
      options.executor ??
      createAwsSdkS3Executor({
        region: this.region,
        ...(this.endpoint ? { endpoint: this.endpoint } : {}),
      });
  }

  async put(key: string, data: Buffer, options?: ObjectPutOptions): Promise<void> {
    const cleanKey = sanitizeKey(key);
    if (this.encryption === 'client') {
      const sealed = sealExportEnvelope(data, cleanKey, this.bucket, this.exportKeys!);
      await this.executor.putObject({
        Bucket: this.bucket,
        Key: cleanKey,
        Body: sealed.body,
        ContentType: 'application/octet-stream',
        Metadata: {
          ...(options?.metadata || {}),
          'orbitox-encryption': 'client-aes-256-gcm-v1',
          'orbitox-encryption-kid': sealed.kid,
        },
      });
      return;
    }

    await this.executor.putObject({
      Bucket: this.bucket,
      Key: cleanKey,
      Body: data,
      ContentType: options?.contentType || 'application/zip',
      ...(options?.metadata ? { Metadata: options.metadata } : {}),
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: this.kmsKeyId!,
    });
  }

  async get(key: string): Promise<Buffer | null> {
    const cleanKey = sanitizeKey(key);
    const raw = await this.executor.getObject({ Bucket: this.bucket, Key: cleanKey });
    if (!raw) return null;
    if (this.encryption === 'client') {
      return openExportEnvelope(raw, cleanKey, this.bucket, this.exportKeys!);
    }
    return raw;
  }

  async delete(key: string): Promise<void> {
    const cleanKey = sanitizeKey(key);
    await this.executor.deleteObject({ Bucket: this.bucket, Key: cleanKey });
  }

  async deletePrefix(prefix: string): Promise<number> {
    const cleanPrefix = sanitizeKey(prefix.replace(/\/+$/, ''));
    const keys = await this.executor.listKeys({
      Bucket: this.bucket,
      Prefix: `${cleanPrefix}/`,
    });
    for (const key of keys) {
      await this.executor.deleteObject({ Bucket: this.bucket, Key: key });
    }
    return keys.length;
  }

  async signedDownloadUrl(
    key: string,
    options: { expiresInSeconds: number },
  ): Promise<string> {
    if (this.encryption === 'client') {
      throw new Error(
        'Direct S3 presigned URLs are disabled when ORBITOX_OBJECT_STORE_ENCRYPTION=client; stream decrypted downloads through the control plane.',
      );
    }
    const cleanKey = sanitizeKey(key);
    return this.executor.getPresignedGetUrl({
      Bucket: this.bucket,
      Key: cleanKey,
      ExpiresIn: Math.max(1, options.expiresInSeconds),
    });
  }
}

export function createObjectStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ObjectStore {
  const nodeEnv = (env.NODE_ENV || '').trim();
  const isProduction = nodeEnv === 'production' || !nodeEnv;
  const configuredDriver = (env.ORBITOX_OBJECT_STORE_DRIVER || '').trim().toLowerCase();

  if (isProduction) {
    if (configuredDriver === 'local') {
      throw new Error(
        'ORBITOX_OBJECT_STORE_DRIVER=local is refused in production; exports require ORBITOX_OBJECT_STORE_DRIVER=s3 with encryption.',
      );
    }
    if (configuredDriver !== 's3') {
      throw new Error(
        'ORBITOX_OBJECT_STORE_DRIVER must be explicitly set to "s3" in production (silent fallback to local storage is prohibited).',
      );
    }
  } else if (configuredDriver && configuredDriver !== 'local' && configuredDriver !== 's3') {
    throw new Error(
      `Invalid ORBITOX_OBJECT_STORE_DRIVER "${configuredDriver}"; expected "s3" or "local".`,
    );
  }

  const driver: 'local' | 's3' = isProduction
    ? 's3'
    : configuredDriver === 's3'
      ? 's3'
      : 'local';

  if (driver === 's3') {
    const bucket = env.S3_BUCKET_NAME?.trim() || '';
    const region = env.ORBITOX_OBJECT_STORE_REGION?.trim() || env.AWS_REGION?.trim() || '';
    const endpoint = env.ORBITOX_OBJECT_STORE_ENDPOINT?.trim() || undefined;
    const rawEncryption = (env.ORBITOX_OBJECT_STORE_ENCRYPTION || '').trim().toLowerCase();
    if (!region) {
      throw new Error(
        'ORBITOX_OBJECT_STORE_REGION (or AWS_REGION) is required for ORBITOX_OBJECT_STORE_DRIVER=s3; default us-east-1 is prohibited.',
      );
    }
    if (rawEncryption !== 'kms' && rawEncryption !== 'client') {
      throw new Error(
        'ORBITOX_OBJECT_STORE_ENCRYPTION must be explicitly set to "kms" or "client" when ORBITOX_OBJECT_STORE_DRIVER=s3.',
      );
    }

    if (rawEncryption === 'client') {
      const exportKeys = loadExportEncryptionKeyRingFromEnv(env);
      return new S3ObjectStore({
        bucket,
        region,
        encryption: 'client',
        exportKeys,
        ...(endpoint ? { endpoint } : {}),
      });
    }

    return new S3ObjectStore({
      bucket,
      region,
      encryption: 'kms',
      kmsKeyId: env.ORBITOX_OBJECT_STORE_KMS_KEY_ID?.trim() || '',
      ...(endpoint ? { endpoint } : {}),
    });
  }

  return new LocalObjectStore({
    rootDir:
      env.ORBITOX_OBJECT_STORE_LOCAL_DIR?.trim() ||
      path.join(os.tmpdir(), 'orbitox-object-store'),
    signingSecret: env.ORBITOX_CONTROL_SECRET?.trim() || undefined,
  });
}
