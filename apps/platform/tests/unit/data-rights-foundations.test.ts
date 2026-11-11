import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { registerNode } from '@/instrumentation.node';
import {
  DEFAULT_PLUGIN_ERASURE_POLICY,
  PLUGIN_DATA_CONTRACT_VERSION,
  resolvePluginErasureMode,
} from '@orbitox-io/plugin-engine';
import {
  assertNoForbiddenExportColumns,
  buildExportBundle,
  escapeCsvCell,
  FORBIDDEN_EXPORT_COLUMNS,
  readZipArchive,
  REVIEWED_SECRET_COLUMN_ALLOWLIST,
  SECRET_COLUMN_NAME_REGEX,
  verifyExportArchive,
} from '@/lib/data-rights/archive';
import {
  createObjectStoreFromEnv,
  loadExportEncryptionKeyRingFromEnv,
  LocalObjectStore,
  S3ObjectStore,
  type S3CommandExecutor,
  type S3PutObjectInput,
} from '@/lib/data-rights/object-store';
import {
  buildSignedDeletionCertificate,
  extractDeletionCertPublicKeys,
  verifyDeletionCertificate,
} from '@/lib/data-rights/deletion-certificate';

function genEd25519() {
  const pair = crypto.generateKeyPairSync('ed25519');
  return {
    privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

describe('Phase 6G Foundations: Contract, ObjectStore, Export Bundle & Deletion Certificate', () => {
  const tempDirs: string[] = [];

  after(async () => {
    for (const dir of tempDirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('G1: enforces versioned plugin data contract & config-driven erasure policy', () => {
    assert.equal(PLUGIN_DATA_CONTRACT_VERSION, 'v1');
    assert.equal(DEFAULT_PLUGIN_ERASURE_POLICY['@orbitox/hms'], 'RESTRICT');
    assert.equal(DEFAULT_PLUGIN_ERASURE_POLICY['@orbitox/restaurant'], 'DELETE');

    assert.equal(resolvePluginErasureMode('hospital-os'), 'RESTRICT');
    assert.equal(resolvePluginErasureMode('@orbitox/hms'), 'RESTRICT');
    assert.equal(resolvePluginErasureMode('restaurant-os'), 'DELETE');
    assert.equal(resolvePluginErasureMode('@orbitox/restaurant'), 'DELETE');

    const customPolicy = JSON.stringify({
      '@orbitox/hms': 'DELETE',
      'restaurant-os': 'RESTRICT',
    });
    assert.equal(resolvePluginErasureMode('@orbitox/hms', customPolicy), 'DELETE');
    assert.equal(resolvePluginErasureMode('@orbitox/restaurant', customPolicy), 'RESTRICT');

    assert.throws(
      () => resolvePluginErasureMode('@orbitox/hms', JSON.stringify({ '@orbitox/hms': 'PURGE' })),
      /Invalid erasure mode/,
    );
  });

  it('G2: builds deterministic PKZIP with JSON, CSV, and SHA-256 verified manifest.json', async () => {
    const generatedAt = new Date('2026-11-10T10:00:00.000Z');
    const { zipBuffer, manifest } = buildExportBundle({
      organizationId: 'org_test_1',
      jobId: 'job_test_1',
      generatedAt,
      tenants: [
        {
          tenantId: 'org/org_test_1/project/p1/environment/e1',
          projectId: 'p1',
          environmentId: 'e1',
          plugins: ['@orbitox/hms'],
        },
      ],
      tableData: [
        {
          tenantId: 'org/org_test_1/project/p1/environment/e1',
          pluginId: '@orbitox/hms',
          table: 'HmsPatient',
          columns: ['id', 'name', 'notes'],
          rows: [
            { id: 'pat_1', name: 'Alice "A." Smith', notes: 'Line1,\nLine2' },
            { id: 'pat_2', name: 'Bob', notes: null },
          ],
        },
      ],
    });

    assert.equal(manifest.schemaVersion, 'orbitox.data_export.v1');
    assert.equal(manifest.tables.length, 1);
    assert.equal(manifest.tables[0]?.rowCount, 2);

    const verified = verifyExportArchive(zipBuffer);
    assert.equal(verified.organizationId, 'org_test_1');

    const entries = readZipArchive(zipBuffer);
    const csv = entries.get(manifest.tables[0]!.csvFile)!.toString('utf8');
    assert.match(csv, /^id,name,notes\n/);
    assert.ok(csv.includes('"Alice ""A."" Smith"'));
    assert.ok(csv.includes('"Line1,\nLine2"'));

    // Also validate ZIP archive with OS python3 zipfile module if available
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orbitox-zip-'));
    tempDirs.push(tmpDir);
    const zipPath = path.join(tmpDir, 'export.zip');
    await fs.writeFile(zipPath, zipBuffer);
    const pyCheck = spawnSync('python3', ['-m', 'zipfile', '-t', zipPath], { encoding: 'utf8' });
    if (pyCheck.status !== null && !pyCheck.error) {
      assert.equal(pyCheck.status, 0, `python3 zipfile test failed: ${pyCheck.stderr}`);
    }

    // Tampered manifest checksum detection
    const badEntries = Array.from(entries.entries()).map(([p, content]) => ({
      path: p,
      content: p.endsWith('.json') && p !== 'manifest.json'
        ? Buffer.from('[{"tampered":true}]')
        : content,
    }));
    const { buildZipArchive } = await import('@/lib/data-rights/archive');
    const tamperedZip = buildZipArchive(badEntries, generatedAt);
    assert.throws(() => verifyExportArchive(tamperedZip), /Checksum or size mismatch/);
  });

  it('G2: LocalObjectStore supports put/get/delete/deletePrefix/signedUrl and blocks traversal', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orbitox-local-store-'));
    tempDirs.push(tmpDir);

    const store = new LocalObjectStore({ rootDir: tmpDir, signingSecret: 'secret-signing-key-32-chars-min!' });
    await store.put('exports/org-1/job-1.zip', Buffer.from('zip-bytes'), {
      contentType: 'application/zip',
    });

    const got = await store.get('exports/org-1/job-1.zip');
    assert.equal(got?.toString('utf8'), 'zip-bytes');

    const url = await store.signedDownloadUrl('exports/org-1/job-1.zip', {
      expiresInSeconds: 300,
      baseUrl: 'https://console.orbitox.test',
    });
    assert.ok(url.startsWith('https://console.orbitox.test/'));
    assert.ok(url.includes('sig='));

    await assert.rejects(() => store.put('../escape.txt', Buffer.from('x')), /Invalid object store key/);
    await assert.rejects(() => store.get('/etc/passwd'), /Path|Invalid|ENOENT/);

    await store.put('exports/org-1/job-2.zip', Buffer.from('zip-2'));
    const deletedCount = await store.deletePrefix('exports/org-1');
    assert.equal(deletedCount, 2);
    assert.equal(await store.get('exports/org-1/job-1.zip'), null);
  });

  it('G2: S3ObjectStore enforces SSE-KMS (aws:kms + SSEKMSKeyId) and supports get/delete/presign with mocks', async () => {
    const recordedPuts: S3PutObjectInput[] = [];
    const backing = new Map<string, Buffer>();

    const mockExecutor: S3CommandExecutor = {
      async putObject(input) {
        recordedPuts.push(input);
        backing.set(input.Key, input.Body);
      },
      async getObject(input) {
        return backing.get(input.Key) ?? null;
      },
      async deleteObject(input) {
        backing.delete(input.Key);
      },
      async listKeys(input) {
        return Array.from(backing.keys()).filter((k) => k.startsWith(input.Prefix));
      },
      async getPresignedGetUrl(input) {
        return `https://${input.Bucket}.s3.amazonaws.com/${input.Key}?X-Amz-Expires=${input.ExpiresIn}`;
      },
    };

    assert.throws(
      () => new S3ObjectStore({ bucket: 'bkt', region: 'ap-south-1', kmsKeyId: '', executor: mockExecutor }),
      /requires SSE-KMS key id/,
    );
    assert.throws(
      () => new S3ObjectStore({ bucket: 'bkt', region: '', kmsKeyId: 'k', executor: mockExecutor }),
      /requires explicit region/,
    );

    const store = new S3ObjectStore({
      bucket: 'orbitox-exports-staging',
      region: 'ap-south-1',
      kmsKeyId: 'arn:aws:kms:ap-south-1:123456789012:key/exports-cmk',
      executor: mockExecutor,
    });

    await store.put('exports/org-a/archive.zip', Buffer.from('encrypted-zip'), {
      contentType: 'application/zip',
    });
    assert.equal(recordedPuts.length, 1);
    assert.equal(recordedPuts[0]?.ServerSideEncryption, 'aws:kms');
    assert.equal(
      recordedPuts[0]?.SSEKMSKeyId,
      'arn:aws:kms:ap-south-1:123456789012:key/exports-cmk',
    );

    const fetched = await store.get('exports/org-a/archive.zip');
    assert.equal(fetched?.toString('utf8'), 'encrypted-zip');

    const signedUrl = await store.signedDownloadUrl('exports/org-a/archive.zip', {
      expiresInSeconds: 600,
    });
    assert.ok(signedUrl.includes('orbitox-exports-staging.s3.amazonaws.com/exports/org-a/archive.zip'));
    assert.ok(signedUrl.includes('X-Amz-Expires=600'));

    const deleted = await store.deletePrefix('exports/org-a');
    assert.equal(deleted, 1);
    assert.equal(await store.get('exports/org-a/archive.zip'), null);
  });

  it('G3: deletion certificate requires dedicated key (not grant key), detects 1-byte tamper, and CLI verifies', async () => {
    const grantKey = genEd25519();
    const certKey = genEd25519();

    const env = {
      ORBITOX_GRANT_SIGNING_KEYS: JSON.stringify({ grant_k1: grantKey }),
      ORBITOX_DELETION_CERT_KEYS: JSON.stringify({ cert_k1: certKey }),
      ORBITOX_DELETION_CERT_KEY_ACTIVE: 'cert_k1',
      ORBITOX_BACKUP_RETENTION_DAYS: '35',
    };

    // Reusing the grant key MUST be rejected
    assert.throws(
      () =>
        buildSignedDeletionCertificate(
          {
            organizationId: 'org_1',
            requestId: 'del_1',
            requestedAt: new Date('2026-10-01T00:00:00.000Z'),
            scheduledFor: new Date('2026-10-31T00:00:00.000Z'),
            completedAt: new Date('2026-10-31T00:05:00.000Z'),
            plugins: [],
            platformRowsDeletedByTable: { PlatformOrganization: 1 },
            objectStoreObjectsDeleted: 0,
          },
          {
            ORBITOX_GRANT_SIGNING_KEYS: JSON.stringify({ grant_k1: grantKey }),
            ORBITOX_DELETION_CERT_KEYS: JSON.stringify({ cert_k1: grantKey }),
            ORBITOX_DELETION_CERT_KEY_ACTIVE: 'cert_k1',
          },
        ),
      /reuses an entitlement grant key/,
    );

    const cert = buildSignedDeletionCertificate(
      {
        organizationId: 'org_del_1',
        organizationSlug: 'acme-health',
        requestId: 'req_123',
        requestedAt: new Date('2026-10-01T00:00:00.000Z'),
        scheduledFor: new Date('2026-10-31T00:00:00.000Z'),
        completedAt: new Date('2026-10-31T00:05:00.000Z'),
        plugins: [
          {
            pluginId: '@orbitox/hms',
            tenantId: 'org/org_del_1/project/p1/environment/e1',
            rowsDeletedByTable: { HmsPatient: 3, HmsInvoice: 1 },
          },
        ],
        platformRowsDeletedByTable: { PlatformOrganization: 1 },
        objectStoreObjectsDeleted: 2,
      },
      env,
    );

    assert.equal(cert.payload.purpose, 'orbitox.deletion_certificate.v1');
    assert.equal(cert.keyId, 'cert_k1');
    assert.match(cert.spkiFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(cert.payload.spkiFingerprint, cert.spkiFingerprint);
    assert.equal(cert.payload.totalRowsDeleted, 5);
    assert.ok(cert.payload.backupNotice.includes('2026-12-05'));
    assert.ok(cert.payload.backupNotice.includes('unrecoverable'));

    const publicKeys = extractDeletionCertPublicKeys(env.ORBITOX_DELETION_CERT_KEYS);
    assert.equal(verifyDeletionCertificate(cert, publicKeys).valid, true);

    // Tampered spkiFingerprint & purpose fail verification
    const tamperedPurposeCert = structuredClone(cert);
    (tamperedPurposeCert.payload as any).purpose = 'wrong-purpose';
    assert.equal(verifyDeletionCertificate(tamperedPurposeCert, publicKeys).valid, false);
    const tamperedFpCert = structuredClone(cert);
    tamperedFpCert.payload.spkiFingerprint = '0'.repeat(64);
    assert.equal(verifyDeletionCertificate(tamperedFpCert, publicKeys).valid, false);

    // Retired public-only k1 still verifies historical certificate when k2 is active
    const certKey2 = genEd25519();
    const rotatedRingEnv = {
      ORBITOX_GRANT_SIGNING_KEYS: env.ORBITOX_GRANT_SIGNING_KEYS,
      ORBITOX_DELETION_CERT_KEYS: JSON.stringify({
        cert_k1: { publicKey: certKey.publicKey },
        cert_k2: certKey2,
      }),
      ORBITOX_DELETION_CERT_KEY_ACTIVE: 'cert_k2',
    };
    const cert2 = buildSignedDeletionCertificate(
      {
        organizationId: 'org_del_2',
        requestId: 'req_456',
        requestedAt: new Date('2026-11-01T00:00:00.000Z'),
        scheduledFor: new Date('2026-12-01T00:00:00.000Z'),
        completedAt: new Date('2026-12-01T00:05:00.000Z'),
        plugins: [],
        platformRowsDeletedByTable: { PlatformOrganization: 1 },
        objectStoreObjectsDeleted: 0,
      },
      rotatedRingEnv,
    );
    assert.equal(cert2.keyId, 'cert_k2');
    const rotatedPublicKeys = extractDeletionCertPublicKeys(rotatedRingEnv.ORBITOX_DELETION_CERT_KEYS);
    assert.equal(verifyDeletionCertificate(cert, rotatedPublicKeys).valid, true);
    assert.equal(verifyDeletionCertificate(cert2, rotatedPublicKeys).valid, true);

    // 1-byte tamper inside payload
    const tamperedPayloadCert = structuredClone(cert);
    tamperedPayloadCert.payload.totalRowsDeleted = 6;
    assert.equal(verifyDeletionCertificate(tamperedPayloadCert, publicKeys).valid, false);

    // 1-byte tamper in signature
    const tamperedSigCert = structuredClone(cert);
    const firstChar = tamperedSigCert.signature[0] === 'A' ? 'B' : 'A';
    tamperedSigCert.signature = firstChar + tamperedSigCert.signature.slice(1);
    assert.equal(verifyDeletionCertificate(tamperedSigCert, publicKeys).valid, false);

    // Offline CLI verification
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orbitox-cert-cli-'));
    tempDirs.push(tmpDir);
    const certPath = path.join(tmpDir, 'cert.json');
    const tamperedPath = path.join(tmpDir, 'cert-tampered.json');
    const pubPath = path.join(tmpDir, 'pub.json');
    await fs.writeFile(certPath, JSON.stringify(cert, null, 2));
    await fs.writeFile(tamperedPath, JSON.stringify(tamperedPayloadCert, null, 2));
    await fs.writeFile(pubPath, JSON.stringify(publicKeys, null, 2));

    const cliScript = path.resolve(__dirname, '../../../../scripts/ci/verify-deletion-certificate.ts');
    const cliStdout = execFileSync(
      'pnpm',
      ['exec', 'tsx', cliScript, '--cert', certPath, '--public-key', pubPath],
      {
        cwd: path.resolve(__dirname, '../../../..'),
        encoding: 'utf8',
      },
    );
    const parsedOut = JSON.parse(cliStdout);
    assert.equal(parsedOut.valid, true);
    assert.equal(parsedOut.organizationId, 'org_del_1');

    const failRun = spawnSync(
      'pnpm',
      ['exec', 'tsx', cliScript, '--cert', tamperedPath, '--public-key', pubPath],
      {
        cwd: path.resolve(__dirname, '../../..'),
        encoding: 'utf8',
      },
    );
    assert.equal(failRun.status, 1);
    assert.match(failRun.stderr, /INVALID DELETION CERTIFICATE/);
  });

  it('G-2: refuses export archive generation if any forbidden secret column or JSON key is included', () => {
    assert.ok(FORBIDDEN_EXPORT_COLUMNS.includes('passwordHash'));
    assert.ok(FORBIDDEN_EXPORT_COLUMNS.includes('authVerifier'));
    assert.ok(FORBIDDEN_EXPORT_COLUMNS.includes('encryptedKeySecret'));

    for (const secretCol of [
      'passwordHash',
      'pinHash',
      'salt',
      'mfaTotpSealed',
      'tokenHash',
      'csrfTokenHash',
      'authVerifier',
      'secretFingerprint',
      'encryptedKeyId',
      'encryptedKeySecret',
      'encryptedWebhookSecret',
      'verificationToken',
      'guestCapabilityTokens',
      'orderToken',
      'razorpaySignature',
    ]) {
      assert.throws(
        () =>
          buildExportBundle({
            organizationId: 'org_sec_test',
            jobId: 'job_sec_col',
            generatedAt: new Date('2026-11-10T10:00:00.000Z'),
            tenants: [],
            tableData: [
              {
                tenantId: null,
                pluginId: 'platform',
                table: 'SyntheticLeakCheck',
                columns: ['id', secretCol],
                rows: [{ id: 'row_1', [secretCol]: 'leaked_secret_value' }],
              },
            ],
          }),
        /forbidden secret (?:column|key)/i,
        `Declared forbidden column "${secretCol}" must throw`,
      );

      // Nested JSON object key must ALSO be blocked
      assert.throws(
        () =>
          assertNoForbiddenExportColumns(
            'SyntheticNestedCheck',
            ['id', 'metadata'],
            [{ id: 'row_1', metadata: { nested: { [secretCol]: 'nested_secret' } } }],
          ),
        /forbidden secret (?:column|key)/i,
        `Nested forbidden JSON key "${secretCol}" must throw`,
      );
    }
  });

  it('G-3: neutralizes all 6 CSV formula triggers (=,+,-,@,\\t,\\r) while keeping negative numbers and JSON raw', () => {
    const payloads = [
      '=cmd|"/c calc"!A0',
      '+1+1',
      '-2+3',
      '@SUM(1+1)',
      '\t=HYPERLINK("http://evil.test")',
      '\r=IMPORTXML("http://evil.test")',
    ];

    for (const payload of payloads) {
      const escaped = escapeCsvCell(payload);
      assert.equal(
        escaped,
        `"'${payload.replace(/"/g, '""')}"`,
        `Formula trigger payload ${JSON.stringify(payload)} must be prefixed with apostrophe and CSV-quoted`,
      );
    }

    // Typed finite negative numbers stay raw unquoted numeric values
    assert.equal(escapeCsvCell(-42), '-42');
    assert.equal(escapeCsvCell(-12.5), '-12.5');
    // String "-42" or "-1+1" in text columns is treated as untrusted text and neutralized
    assert.equal(escapeCsvCell('-42'), `"'` + `-42"`);

    const generatedAt = new Date('2026-11-10T10:00:00.000Z');
    const { zipBuffer } = buildExportBundle({
      organizationId: 'org_csv_inj',
      jobId: 'job_csv_inj',
      generatedAt,
      tenants: [],
      tableData: [
        {
          tenantId: null,
          pluginId: 'platform',
          table: 'FormulaRows',
          columns: ['id', 'eq', 'plus', 'minus', 'at', 'tab', 'cr', 'amount'],
          rows: [
            {
              id: 'r1',
              eq: payloads[0],
              plus: payloads[1],
              minus: payloads[2],
              at: payloads[3],
              tab: payloads[4],
              cr: payloads[5],
              amount: -42,
            },
          ],
        },
      ],
    });

    const files = readZipArchive(zipBuffer);
    const csvText = files.get('platform/platform/FormulaRows.csv')!.toString('utf8');
    const jsonRows = JSON.parse(files.get('platform/platform/FormulaRows.json')!.toString('utf8'));

    assert.ok(csvText.includes(`"'=cmd|""/c calc""!A0"`));
    assert.ok(csvText.includes(`"'+1+1"`));
    assert.ok(csvText.includes(`"'-2+3"`));
    assert.ok(csvText.includes(`"'@SUM(1+1)"`));
    assert.ok(csvText.includes(`"'\t=HYPERLINK(""http://evil.test"")"`));
    assert.ok(csvText.includes(`"'\r=IMPORTXML(""http://evil.test"")"`));
    assert.ok(csvText.trimEnd().endsWith(',-42'), `Expected raw negative number -42 at end of CSV row, got: ${csvText}`);

    // JSON export stays completely raw (not prefixed with ')
    assert.equal(jsonRows[0].eq, payloads[0]);
    assert.equal(jsonRows[0].plus, payloads[1]);
    assert.equal(jsonRows[0].minus, payloads[2]);
    assert.equal(jsonRows[0].at, payloads[3]);
    assert.equal(jsonRows[0].tab, payloads[4]);
    assert.equal(jsonRows[0].cr, payloads[5]);
    assert.equal(jsonRows[0].amount, -42);
  });

  it('G-7: refuses missing/local driver and missing region in production', () => {
    const validKey = crypto.randomBytes(32).toString('base64');

    // 1. production + no driver -> refuse (even when S3_BUCKET_NAME & region are set!)
    assert.throws(
      () =>
        createObjectStoreFromEnv({
          NODE_ENV: 'production',
          S3_BUCKET_NAME: 'orbitox-prod-exports',
          ORBITOX_OBJECT_STORE_REGION: 'ap-south-1',
          ORBITOX_OBJECT_STORE_ENCRYPTION: 'client',
          ORBITOX_EXPORT_ENCRYPTION_KEYS: JSON.stringify({ k1: validKey }),
          ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: 'k1',
        } as unknown as NodeJS.ProcessEnv),
      /ORBITOX_OBJECT_STORE_DRIVER must be explicitly set to "s3"/,
    );

    // 2. production + local driver -> refuse (including standalone flag)
    assert.throws(
      () =>
        createObjectStoreFromEnv({
          NODE_ENV: 'production',
          ORBITOX_TEST_STANDALONE: 'true',
          ORBITOX_OBJECT_STORE_DRIVER: 'local',
        } as unknown as NodeJS.ProcessEnv),
      /ORBITOX_OBJECT_STORE_DRIVER=local is refused in production/,
    );

    // 3. driver=s3 + no region -> refuse (no us-east-1 default)
    assert.throws(
      () =>
        createObjectStoreFromEnv({
          NODE_ENV: 'production',
          ORBITOX_OBJECT_STORE_DRIVER: 's3',
          S3_BUCKET_NAME: 'orbitox-prod-exports',
          ORBITOX_OBJECT_STORE_ENCRYPTION: 'client',
          ORBITOX_EXPORT_ENCRYPTION_KEYS: JSON.stringify({ k1: validKey }),
          ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: 'k1',
        } as unknown as NodeJS.ProcessEnv),
      /ORBITOX_OBJECT_STORE_REGION.*required|default us-east-1 is prohibited/,
    );
  });

  it('G-7: client AES-256-GCM encryption hides ZIP bytes on S3-compatible store and preserves decryption across key rotation', async () => {
    const recordedPuts: S3PutObjectInput[] = [];
    const backing = new Map<string, Buffer>();
    const backingMeta = new Map<string, Record<string, string>>();

    const mockExecutor: S3CommandExecutor = {
      async putObject(input) {
        recordedPuts.push(input);
        backing.set(input.Key, input.Body);
        backingMeta.set(input.Key, input.Metadata || {});
      },
      async getObject(input) {
        return backing.get(input.Key) ?? null;
      },
      async deleteObject(input) {
        backing.delete(input.Key);
      },
      async listKeys(input) {
        return Array.from(backing.keys()).filter((k) => k.startsWith(input.Prefix));
      },
      async getPresignedGetUrl(input) {
        return `https://blr1.digitaloceanspaces.com/${input.Bucket}/${input.Key}`;
      },
    };

    const k1 = crypto.randomBytes(32).toString('base64');
    const k2 = crypto.randomBytes(32).toString('base64');
    const ring1 = loadExportEncryptionKeyRingFromEnv({
      ORBITOX_EXPORT_ENCRYPTION_KEYS: JSON.stringify({ k1 }),
      ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: 'k1',
    });

    const store1 = new S3ObjectStore({
      bucket: 'orbitox-vps-exports',
      region: 'ap-south-1',
      endpoint: 'https://blr1.digitaloceanspaces.com',
      encryption: 'client',
      exportKeys: ring1,
      executor: mockExecutor,
    });

    const { zipBuffer } = buildExportBundle({
      organizationId: 'org_client_enc',
      jobId: 'job_1',
      generatedAt: new Date('2026-11-10T10:00:00.000Z'),
      tenants: [],
      tableData: [
        {
          tenantId: null,
          pluginId: 'platform',
          table: 'PlatformOrganization',
          columns: ['id', 'name'],
          rows: [{ id: 'org_client_enc', name: 'Apollo Clinic' }],
        },
      ],
    });
    assert.equal(zipBuffer.subarray(0, 4).toString('hex'), '504b0304');

    await store1.put('exports/org_client_enc/job_1.zip', zipBuffer, {
      contentType: 'application/zip',
    });

    const storedBytes = backing.get('exports/org_client_enc/job_1.zip')!;
    assert.ok(storedBytes);
    assert.notEqual(
      storedBytes.subarray(0, 4).toString('hex'),
      '504b0304',
      'Stored ciphertext must NOT begin with PKZIP magic bytes',
    );
    assert.throws(() => readZipArchive(storedBytes), /ZIP|EOCD|magic|valid/i);
    assert.equal(recordedPuts[0]?.ServerSideEncryption, undefined);
    assert.equal(recordedPuts[0]?.SSEKMSKeyId, undefined);
    assert.equal(backingMeta.get('exports/org_client_enc/job_1.zip')?.['orbitox-encryption-kid'], 'k1');

    // Downloaded bytes MUST match a valid readable ZIP
    const downloaded1 = await store1.get('exports/org_client_enc/job_1.zip');
    assert.ok(downloaded1);
    assert.equal(Buffer.compare(downloaded1, zipBuffer), 0);
    const unzipped1 = readZipArchive(downloaded1);
    assert.ok(unzipped1.has('manifest.json'));

    // Rotate key: add k2 and make k2 active while preserving k1
    const ring2 = loadExportEncryptionKeyRingFromEnv({
      ORBITOX_EXPORT_ENCRYPTION_KEYS: JSON.stringify({ k1, k2 }),
      ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: 'k2',
    });
    const store2 = new S3ObjectStore({
      bucket: 'orbitox-vps-exports',
      region: 'ap-south-1',
      endpoint: 'https://blr1.digitaloceanspaces.com',
      encryption: 'client',
      exportKeys: ring2,
      executor: mockExecutor,
    });

    await store2.put('exports/org_client_enc/job_2.zip', zipBuffer);
    assert.equal(backingMeta.get('exports/org_client_enc/job_2.zip')?.['orbitox-encryption-kid'], 'k2');

    // Old k1 archive still decrypts after rotation to k2, AND new k2 archive decrypts too
    const oldAfterRotate = await store2.get('exports/org_client_enc/job_1.zip');
    const newAfterRotate = await store2.get('exports/org_client_enc/job_2.zip');
    assert.ok(oldAfterRotate && Buffer.compare(oldAfterRotate, zipBuffer) === 0);
    assert.ok(newAfterRotate && Buffer.compare(newAfterRotate, zipBuffer) === 0);
    assert.ok(readZipArchive(oldAfterRotate).has('platform/platform/PlatformOrganization.json'));
  });

  it('G-7: registerNode() refuses production startup when ObjectStore driver is missing or local', async () => {
    const origEnv = { ...process.env };
    try {
      Reflect.set(process.env, 'NODE_ENV', 'production');
      delete process.env.APP_DATABASE_URL;
      delete process.env.HMS_AUDIT_DATABASE_URL;
      delete process.env.OUTBOX_RELAY_DATABASE_URL;
      process.env.ORBITOX_OBJECT_STORE_DRIVER = 'local';
      process.env.ORBITOX_OBJECT_STORE_REGION = 'ap-south-1';
      process.env.S3_BUCKET_NAME = 'orbitox-prod-exports';
      process.env.ORBITOX_OBJECT_STORE_ENCRYPTION = 'client';

      await assert.rejects(
        () => registerNode(),
        /ORBITOX_OBJECT_STORE_DRIVER=local is refused in production/,
      );

      delete process.env.ORBITOX_OBJECT_STORE_DRIVER;
      await assert.rejects(
        () => registerNode(),
        /ORBITOX_OBJECT_STORE_DRIVER must be explicitly set to "s3"/,
      );
    } finally {
      process.env = origEnv;
    }
  });

  it('G-11: every secret-like column across OrbitoX and RestaurantOS Prisma schemas is either denied or reviewed-allow-listed', async () => {
    const repoRoot = path.resolve(__dirname, '../../../..');
    const schemaPaths = [
      path.resolve(repoRoot, 'apps/platform/prisma/schema.prisma'),
      path.resolve(repoRoot, 'projects/external-os/restaurant-os/prisma/schema.prisma'),
    ];

    const forbiddenSet = new Set(FORBIDDEN_EXPORT_COLUMNS.map((c) => c.toLowerCase()));
    const unclassified: string[] = [];
    const seenSchemaFields = new Set<string>();

    for (const schemaPath of schemaPaths) {
      const schemaText = await fs.readFile(schemaPath, 'utf8');
      let currentModel: string | null = null;
      for (const rawLine of schemaText.split(/\r?\n/)) {
        const line = rawLine.trim();
        const modelMatch = /^model\s+(\w+)\s+\{/.exec(line);
        if (modelMatch) {
          currentModel = modelMatch[1]!;
          continue;
        }
        if (line === '}') {
          currentModel = null;
          continue;
        }
        if (!currentModel || !line || line.startsWith('//') || line.startsWith('@@')) continue;
        const fieldMatch = /^(\w+)\s+\S+/.exec(line);
        if (!fieldMatch) continue;
        const fieldName = fieldMatch[1]!;
        if (!SECRET_COLUMN_NAME_REGEX.test(fieldName)) continue;

        const qualified = `${currentModel}.${fieldName}`;
        seenSchemaFields.add(qualified);

        const isForbidden = forbiddenSet.has(fieldName.toLowerCase());
        const allowReason = REVIEWED_SECRET_COLUMN_ALLOWLIST[qualified];
        if (!isForbidden && (!allowReason || allowReason.trim().length < 15)) {
          unclassified.push(qualified);
        }
      }
    }

    assert.deepEqual(
      unclassified,
      [],
      `Secret-like schema columns must be added to FORBIDDEN_EXPORT_COLUMNS or REVIEWED_SECRET_COLUMN_ALLOWLIST with a reason: ${unclassified.join(', ')}`,
    );

    // Ensure allow-list entries stay pruned and do not overlap with forbidden column names
    const staleAllowEntries = Object.keys(REVIEWED_SECRET_COLUMN_ALLOWLIST).filter(
      (k) => !seenSchemaFields.has(k),
    );
    assert.deepEqual(
      staleAllowEntries,
      [],
      `REVIEWED_SECRET_COLUMN_ALLOWLIST contains deleted/unknown fields: ${staleAllowEntries.join(', ')}`,
    );
    for (const key of Object.keys(REVIEWED_SECRET_COLUMN_ALLOWLIST)) {
      const col = key.split('.')[1]!;
      assert.equal(
        forbiddenSet.has(col.toLowerCase()),
        false,
        `Column "${key}" cannot be both in FORBIDDEN_EXPORT_COLUMNS and REVIEWED_SECRET_COLUMN_ALLOWLIST`,
      );
    }

    // Spot-check that newly denied columns trigger assertNoForbiddenExportColumns
    for (const newlyDenied of [
      'tokens',
      'accountTokens',
      'encryptedDek',
      'encryptedCiphertext',
      'strictLicenseToken',
      'codeHash',
      'capabilityTokenHash',
      'requestTokenHash',
      'claimToken',
      'encryptedPayload',
    ]) {
      assert.throws(
        () => assertNoForbiddenExportColumns('AuditCheck', ['id', newlyDenied], [{ id: '1' }]),
        /Refusing data export archive/,
      );
    }
  });
});
