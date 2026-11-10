import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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
  ServerSideEncryption: 'aws:kms';
  SSEKMSKeyId: string;
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

export function createAwsSdkS3Executor(region: string): S3CommandExecutor {
  // Resolved through @orbitox/core/s3-client so pnpm isolated node_modules sees @aws-sdk/client-s3 without pulling NestJS.
  const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    getSignedUrl,
  } = require('@orbitox/core/s3-client') as typeof import('@orbitox/core/s3-client');

  const client = new S3Client({ region });

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

export class S3ObjectStore implements ObjectStore {
  readonly driver = 's3' as const;
  private readonly bucket: string;
  private readonly kmsKeyId: string;
  private readonly executor: S3CommandExecutor;

  constructor(options: {
    bucket: string;
    kmsKeyId: string;
    region?: string;
    executor?: S3CommandExecutor;
  }) {
    if (!options.bucket?.trim()) {
      throw new Error('S3ObjectStore requires bucket (S3_BUCKET_NAME).');
    }
    if (!options.kmsKeyId?.trim()) {
      throw new Error('S3ObjectStore requires SSE-KMS key id (ORBITOX_OBJECT_STORE_KMS_KEY_ID).');
    }
    this.bucket = options.bucket.trim();
    this.kmsKeyId = options.kmsKeyId.trim();
    this.executor =
      options.executor ?? createAwsSdkS3Executor(options.region || process.env.AWS_REGION || 'us-east-1');
  }

  async put(key: string, data: Buffer, options?: ObjectPutOptions): Promise<void> {
    const cleanKey = sanitizeKey(key);
    await this.executor.putObject({
      Bucket: this.bucket,
      Key: cleanKey,
      Body: data,
      ContentType: options?.contentType || 'application/zip',
      ...(options?.metadata ? { Metadata: options.metadata } : {}),
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: this.kmsKeyId,
    });
  }

  async get(key: string): Promise<Buffer | null> {
    const cleanKey = sanitizeKey(key);
    return this.executor.getObject({ Bucket: this.bucket, Key: cleanKey });
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
  const configuredDriver = (env.ORBITOX_OBJECT_STORE_DRIVER || '').trim().toLowerCase();
  const bucket = env.S3_BUCKET_NAME?.trim() || '';
  const driver: 'local' | 's3' =
    configuredDriver === 's3'
      ? 's3'
      : configuredDriver === 'local'
        ? 'local'
        : bucket && env.NODE_ENV === 'production' && env.ORBITOX_TEST_STANDALONE !== 'true'
          ? 's3'
          : 'local';

  if (driver === 's3') {
    return new S3ObjectStore({
      bucket,
      kmsKeyId: env.ORBITOX_OBJECT_STORE_KMS_KEY_ID?.trim() || '',
      region: env.AWS_REGION || 'us-east-1',
    });
  }

  return new LocalObjectStore({
    rootDir:
      env.ORBITOX_OBJECT_STORE_LOCAL_DIR?.trim() ||
      path.join(os.tmpdir(), 'orbitox-object-store'),
    signingSecret: env.ORBITOX_CONTROL_SECRET?.trim() || undefined,
  });
}
