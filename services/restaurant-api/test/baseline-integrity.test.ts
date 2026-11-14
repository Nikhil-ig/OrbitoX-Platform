import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const EXPECTED_NORMALIZED_HASH = '68b613742da9344d39dc0f017dee09a5fbdd450d9f3f279e4ccfd9eb8e9980aa';

function normalizeImports(code: string): string {
  return code.replace(/from\s+['"][^'"]+['"]/g, "from '<NORMALIZED>'");
}

describe('Baseline Integrity (d7f9de5 Parity Baseline)', () => {
  const fixturePath = path.resolve(__dirname, 'fixtures/baseline-server.ts');

  it('asserts baseline-server.ts matches expected d7f9de5 normalized SHA-256', () => {
    assert.ok(fs.existsSync(fixturePath), 'baseline-server.ts fixture must exist');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');
    const fixtureNormalized = normalizeImports(fixtureContent);
    const fixtureHash = crypto.createHash('sha256').update(fixtureNormalized).digest('hex');

    assert.equal(
      fixtureHash,
      EXPECTED_NORMALIZED_HASH,
      `Normalized baseline-server.ts hash ${fixtureHash} does not match expected ${EXPECTED_NORMALIZED_HASH}`
    );
  });

  it('asserts zero non-import differences against git d7f9de5 commit if available', () => {
    let originalContent: string | null = null;
    try {
      originalContent = execSync('git show d7f9de5:projects/external-os/restaurant-os/src/server.ts', {
        maxBuffer: 20 * 1024 * 1024,
        encoding: 'utf8',
      });
    } catch {
      // Git commit d7f9de5 may not be present in shallow CI environments without deep fetch
      return;
    }

    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');
    const origNorm = normalizeImports(originalContent);
    const fixtNorm = normalizeImports(fixtureContent);

    const origHash = crypto.createHash('sha256').update(origNorm).digest('hex');
    const fixtHash = crypto.createHash('sha256').update(fixtNorm).digest('hex');

    assert.equal(origHash, EXPECTED_NORMALIZED_HASH, 'd7f9de5 original file must match expected hash');
    assert.equal(fixtHash, origHash, 'fixture normalized hash must equal d7f9de5 original normalized hash');

    const origLines = originalContent.split('\n');
    const fixtLines = fixtureContent.split('\n');
    assert.equal(origLines.length, fixtLines.length, 'Line count must be identical to d7f9de5');

    const nonImportDiffs: string[] = [];
    for (let i = 0; i < origLines.length; i++) {
      if (origLines[i] !== fixtLines[i]) {
        const isOrigImport = origLines[i].includes('from ');
        const isFixtImport = fixtLines[i].includes('from ');
        if (!isOrigImport || !isFixtImport) {
          nonImportDiffs.push(`Line ${i + 1}:\n  - ${origLines[i]}\n  + ${fixtLines[i]}`);
        }
      }
    }

    assert.equal(
      nonImportDiffs.length,
      0,
      `Found non-import differences against d7f9de5:\n${nonImportDiffs.slice(0, 10).join('\n')}`
    );
  });
});
