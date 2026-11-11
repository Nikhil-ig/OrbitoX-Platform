import crypto from 'node:crypto';
import zlib from 'node:zlib';

export interface ArchiveEntryInput {
  path: string;
  content: Buffer;
}

export interface ExportTableDescriptor {
  tenantId: string | null;
  pluginId: string;
  table: string;
  rowCount: number;
  jsonFile: string;
  csvFile: string;
}

export interface ExportManifestFileEntry {
  sha256: string;
  bytes: number;
}

export interface DataExportManifest {
  schemaVersion: 'orbitox.data_export.v1';
  organizationId: string;
  jobId: string;
  generatedAt: string;
  tenants: Array<{
    tenantId: string;
    projectId: string;
    environmentId: string;
    plugins: string[];
  }>;
  tables: ExportTableDescriptor[];
  files: Record<string, ExportManifestFileEntry>;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTimeDate(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getUTCFullYear());
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = Math.floor(date.getUTCSeconds() / 2);

  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
  return { dosTime, dosDate };
}

function sanitizeZipPath(entryPath: string): string {
  const normalized = entryPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some((seg) => !seg || seg === '.' || seg === '..')) {
    throw new Error(`Invalid archive entry path: ${entryPath}`);
  }
  return normalized;
}

/**
 * Builds a deterministic standard PKZIP archive (method 8 deflate) readable by
 * OS unzip utilities and Python zipfile as well as readZipArchive().
 */
export function buildZipArchive(
  entries: readonly ArchiveEntryInput[],
  timestamp: Date = new Date('2026-01-01T00:00:00.000Z'),
): Buffer {
  const sorted = [...entries]
    .map((e) => ({ path: sanitizeZipPath(e.path), content: e.content }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const { dosTime, dosDate } = toDosTimeDate(timestamp);
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of sorted) {
    const nameBytes = Buffer.from(entry.path, 'utf8');
    const uncompressed = entry.content;
    const compressed = zlib.deflateRawSync(uncompressed);
    const crc = crc32(uncompressed);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // general purpose bit flag: UTF-8 filename
    localHeader.writeUInt16LE(8, 8); // compression method: 8 (deflate)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length

    localParts.push(localHeader, nameBytes, compressed);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(8, 10); // deflate
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header

    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(sorted.length, 8); // total entries on disk
  eocd.writeUInt16LE(sorted.length, 10); // total entries
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(offset, 16); // offset of central directory
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

/**
 * Reads and CRC-verifies a ZIP archive created by buildZipArchive or standard tools.
 */
export function readZipArchive(zipBuffer: Buffer): Map<string, Buffer> {
  if (zipBuffer.length < 22) {
    throw new Error('Invalid ZIP buffer: shorter than EOCD record');
  }

  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= Math.max(0, zipBuffer.length - 65557); i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP buffer: missing End of Central Directory signature');
  }

  const entryCount = zipBuffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const result = new Map<string, Buffer>();

  let cursor = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (zipBuffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory header at offset ${cursor}`);
    }
    const method = zipBuffer.readUInt16LE(cursor + 10);
    const expectedCrc = zipBuffer.readUInt32LE(cursor + 16);
    const compressedSize = zipBuffer.readUInt32LE(cursor + 20);
    const nameLen = zipBuffer.readUInt16LE(cursor + 28);
    const extraLen = zipBuffer.readUInt16LE(cursor + 30);
    const commentLen = zipBuffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(cursor + 42);
    const fileName = zipBuffer.subarray(cursor + 46, cursor + 46 + nameLen).toString('utf8');

    if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error(`Invalid ZIP local header at offset ${localHeaderOffset}`);
    }
    const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawSlice = zipBuffer.subarray(dataStart, dataStart + compressedSize);

    let data: Buffer;
    if (method === 0) {
      data = Buffer.from(rawSlice);
    } else if (method === 8) {
      data = zlib.inflateRawSync(rawSlice);
    } else {
      throw new Error(`Unsupported ZIP compression method ${method} for ${fileName}`);
    }

    if (crc32(data) !== expectedCrc) {
      throw new Error(`CRC-32 mismatch for archive entry ${fileName}`);
    }

    result.set(fileName, data);
    cursor += 46 + nameLen + extraLen + commentLen;
  }

  return result;
}

const CSV_FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

/**
 * Escapes a single CSV cell per RFC 4180 while neutralizing OWASP CSV/formula injection.
 * Any non-numeric text starting with =, +, -, @, tab, or CR is prefixed with "'" and quoted.
 * Finite JS numbers (including negative numbers such as -42) remain raw unquoted numeric values.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  let text: string;
  if (value instanceof Date) {
    text = value.toISOString();
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }
  const hasFormulaTrigger = CSV_FORMULA_TRIGGER_RE.test(text);
  const safeText = hasFormulaTrigger ? `'${text}` : text;
  if (hasFormulaTrigger || /[",\r\n]/.test(safeText)) {
    return `"${safeText.replace(/"/g, '""')}"`;
  }
  return safeText;
}

export function serializeRowsToCsv(
  columns: readonly string[],
  rows: ReadonlyArray<Record<string, unknown>>,
): Buffer {
  const effectiveCols =
    columns.length > 0
      ? columns
      : Array.from(
          rows.reduce((set, row) => {
            for (const key of Object.keys(row)) set.add(key);
            return set;
          }, new Set<string>()),
        );

  const lines: string[] = [effectiveCols.map((col) => escapeCsvCell(col)).join(',')];
  for (const row of rows) {
    lines.push(effectiveCols.map((col) => escapeCsvCell(row[col])).join(','));
  }
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

export function serializeRowsToJson(rows: ReadonlyArray<Record<string, unknown>>): Buffer {
  return Buffer.from(`${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

export const SECRET_COLUMN_NAME_REGEX =
  /hash|secret|token|sealed|salt|signature|password|pin|cipher|encrypted|nonce|otp|verifier|private/i;

export const FORBIDDEN_EXPORT_COLUMNS = [
  'passwordHash',
  'pinHash',
  'salt',
  'mfaTotpSealed',
  'mfaTotpPendingSealed',
  'lastTotpStep',
  'tokenHash',
  'csrfTokenHash',
  'codeHash',
  'capabilityTokenHash',
  'requestTokenHash',
  'sessionToken',
  'sessionTokenHash',
  'authVerifier',
  'secretFingerprint',
  'verifierPepperId',
  'encryptedDek',
  'encryptedCiphertext',
  'encryptedPayload',
  'encryptedKeyId',
  'encryptedKeySecret',
  'encryptedWebhookSecret',
  'claimToken',
  'strictLicenseToken',
  'verificationToken',
  'guestCapabilityTokens',
  'orderToken',
  'tokens',
  'accountTokens',
  'downloadTokens',
  'nonce',
  'razorpaySignature',
  'rawSecret',
  'privateKey',
] as const;

/**
 * Schema-audited allow-list of `Model.field` names matching `SECRET_COLUMN_NAME_REGEX`
 * that are safe because they are non-secret identifiers/digests/flags or sealed-at-rest
 * PHI decrypted intentionally into plain column names for authorized subject exports.
 */
export const REVIEWED_SECRET_COLUMN_ALLOWLIST: Readonly<Record<string, string>> = {
  // Platform schema (orbitox/prisma/schema.prisma)
  'RestaurantPricingQuote.inputHash': 'Deterministic pricing payload integrity hash (no secrets); quote verification metadata.',
  'RestaurantPricingQuote.resultHash': 'Deterministic pricing quote output hash (no secrets); quote verification metadata.',
  'PlatformIdempotencyRecord.requestHash': 'SHA-256 request body deduplication digest, not a credential or secret.',
  'PackageVersion.manifestHash': 'Public plugin package manifest digest used for integrity verification, not a secret.',
  'PackageVersion.signature': 'Public Ed25519 package release signature used for public-key verification, not a private secret.',
  'HmsStaff.nameSealed': 'AES-256-GCM encrypted staff display name at rest; decrypted to plain "name" in authorized HMS export without credentials.',
  'HmsPatient.nameSealed': 'AES-256-GCM PHI ciphertext at rest; decrypted with HmsPhiAccessLog into plain "name" for authorized DSR export.',
  'HmsPatient.phoneSealed': 'AES-256-GCM PHI ciphertext at rest; decrypted with HmsPhiAccessLog into plain "phone" for authorized DSR export.',
  'HmsPatient.dateOfBirthSealed': 'AES-256-GCM PHI ciphertext at rest; decrypted with HmsPhiAccessLog into plain "dateOfBirth" for authorized DSR export.',
  'HmsPatient.allergiesSealed': 'AES-256-GCM PHI ciphertext at rest; decrypted with HmsPhiAccessLog into plain "allergies" for authorized DSR export.',
  'HmsPatient.emergencyContactSealed': 'AES-256-GCM PHI ciphertext at rest; decrypted with HmsPhiAccessLog into plain "emergencyContact" for authorized DSR export.',
  'HmsAdmission.notesSealed': 'AES-256-GCM PHI ciphertext at rest; decrypted with HmsPhiAccessLog into plain "notes" for authorized DSR export.',
  'HmsAppointment.reasonSealed': 'AES-256-GCM PHI ciphertext at rest; decrypted into plain "reason" for authorized DSR export.',
  'HmsLabOrder.resultSealed': 'AES-256-GCM PHI ciphertext at rest; decrypted with HmsPhiAccessLog into plain "result" for authorized DSR export.',
  'TenantIdempotencyKey.requestHash': 'SHA-256 request body deduplication digest, not a credential or secret.',

  // RestaurantOS schema (projects/external-os/restaurant-os/prisma/schema.prisma)
  'MenuItem.isSignature': 'Boolean menu highlight flag ("chef signature dish"), not a cryptographic signature.',
  'StaffTokenRevocation.tokenJti': 'Revocation audit UUID/JTI identifier (not the bearer token itself); explicitly exported by RestaurantOS.',
};

const FORBIDDEN_EXPORT_COLUMN_SET = new Set(FORBIDDEN_EXPORT_COLUMNS.map((c) => c.toLowerCase()));

function scanObjectForForbiddenExportKeys(table: string, value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) {
      scanObjectForForbiddenExportKeys(table, item);
    }
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_EXPORT_COLUMN_SET.has(k.toLowerCase())) {
      throw new Error(`Refusing data export archive: forbidden secret key "${k}" detected in table "${table}".`);
    }
    if (v && typeof v === 'object') {
      scanObjectForForbiddenExportKeys(table, v);
    }
  }
}

export function assertNoForbiddenExportColumns(
  table: string,
  columns: readonly string[],
  rows: ReadonlyArray<Record<string, unknown>>,
): void {
  for (const col of columns) {
    if (FORBIDDEN_EXPORT_COLUMN_SET.has(col.toLowerCase())) {
      throw new Error(`Refusing data export archive: forbidden secret column "${col}" declared for table "${table}".`);
    }
  }
  for (const row of rows) {
    scanObjectForForbiddenExportKeys(table, row);
  }
}

export function sanitizeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
}

export function buildExportBundle(params: {
  organizationId: string;
  jobId: string;
  generatedAt: Date;
  tenants: DataExportManifest['tenants'];
  tableData: Array<{
    tenantId: string | null;
    pluginId: string;
    table: string;
    columns: readonly string[];
    rows: Array<Record<string, unknown>>;
  }>;
}): { zipBuffer: Buffer; manifest: DataExportManifest } {
  const entries: ArchiveEntryInput[] = [];
  const files: Record<string, ExportManifestFileEntry> = {};
  const tables: ExportTableDescriptor[] = [];

  for (const item of params.tableData) {
    assertNoForbiddenExportColumns(item.table, item.columns, item.rows);
    const baseDir = item.tenantId
      ? `tenants/${sanitizeSegment(item.tenantId)}/${sanitizeSegment(item.pluginId)}`
      : `platform/${sanitizeSegment(item.pluginId)}`;
    const safeTable = sanitizeSegment(item.table);
    const jsonPath = `${baseDir}/${safeTable}.json`;
    const csvPath = `${baseDir}/${safeTable}.csv`;

    const jsonBuf = serializeRowsToJson(item.rows);
    const csvBuf = serializeRowsToCsv(item.columns, item.rows);

    entries.push({ path: jsonPath, content: jsonBuf });
    entries.push({ path: csvPath, content: csvBuf });

    files[jsonPath] = {
      sha256: crypto.createHash('sha256').update(jsonBuf).digest('hex'),
      bytes: jsonBuf.length,
    };
    files[csvPath] = {
      sha256: crypto.createHash('sha256').update(csvBuf).digest('hex'),
      bytes: csvBuf.length,
    };

    tables.push({
      tenantId: item.tenantId,
      pluginId: item.pluginId,
      table: item.table,
      rowCount: item.rows.length,
      jsonFile: jsonPath,
      csvFile: csvPath,
    });
  }

  const manifest: DataExportManifest = {
    schemaVersion: 'orbitox.data_export.v1',
    organizationId: params.organizationId,
    jobId: params.jobId,
    generatedAt: params.generatedAt.toISOString(),
    tenants: params.tenants,
    tables,
    files,
  };

  const manifestBuf = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  entries.push({ path: 'manifest.json', content: manifestBuf });

  const zipBuffer = buildZipArchive(entries, params.generatedAt);
  return { zipBuffer, manifest };
}

export function verifyExportArchive(zipBuffer: Buffer): DataExportManifest {
  const map = readZipArchive(zipBuffer);
  const manifestBuf = map.get('manifest.json');
  if (!manifestBuf) {
    throw new Error('Export archive missing manifest.json');
  }
  const manifest = JSON.parse(manifestBuf.toString('utf8')) as DataExportManifest;
  if (manifest.schemaVersion !== 'orbitox.data_export.v1') {
    throw new Error(`Unsupported manifest schemaVersion: ${String(manifest.schemaVersion)}`);
  }

  for (const [filePath, meta] of Object.entries(manifest.files)) {
    const fileBuf = map.get(filePath);
    if (!fileBuf) {
      throw new Error(`Manifest references missing file: ${filePath}`);
    }
    const actualSha = crypto.createHash('sha256').update(fileBuf).digest('hex');
    if (actualSha !== meta.sha256 || fileBuf.length !== meta.bytes) {
      throw new Error(`Checksum or size mismatch for ${filePath}`);
    }
  }
  return manifest;
}
