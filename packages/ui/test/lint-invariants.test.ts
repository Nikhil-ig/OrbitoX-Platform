import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Design System Token & Style Invariants Guard (B2 / B3)', () => {
  const compDir = path.resolve(__dirname, '../src/components');
  const chartDir = path.resolve(__dirname, '../src/charts');

  const filesToCheck = [
    ...fs.readdirSync(compDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts')).map((f) => path.join(compDir, f)),
    ...fs.readdirSync(chartDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts')).map((f) => path.join(chartDir, f)),
  ];

  it('scans all modern component and chart files (zero unchecked)', () => {
    assert.ok(filesToCheck.length >= 35, `Expected >= 35 component files, found ${filesToCheck.length}`);
  });

  it('enforces 0 hardcoded hex colors in components and charts', () => {
    // Permitted only in tokens definitions; forbidden in components and charts
    const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
    const violations: { file: string; matches: string[] }[] = [];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(hexRegex);
      if (matches) {
        violations.push({ file: path.basename(filePath), matches });
      }
    }

    assert.equal(
      violations.length,
      0,
      `Found hardcoded hex colors in components:\n${JSON.stringify(violations, null, 2)}`
    );
  });

  it('enforces 0 raw rgb/rgba() colors in components and charts', () => {
    const rgbRegex = /rgba?\(/g;
    const violations: { file: string; matches: string[] }[] = [];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(rgbRegex);
      if (matches) {
        violations.push({ file: path.basename(filePath), matches });
      }
    }

    assert.equal(
      violations.length,
      0,
      `Found raw rgb/rgba calls in components:\n${JSON.stringify(violations, null, 2)}`
    );
  });

  it('enforces 0 inline style={{...}} blocks in components and charts', () => {
    const styleRegex = /style=\{\{/g;
    const violations: { file: string; matches: string[] }[] = [];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(styleRegex);
      if (matches) {
        violations.push({ file: path.basename(filePath), matches });
      }
    }

    assert.equal(
      violations.length,
      0,
      `Found inline style={{...}} blocks in components:\n${JSON.stringify(violations, null, 2)}`
    );
  });

  it('enforces 0 dangerouslySetInnerHTML usages in components and charts', () => {
    const dangerRegex = /dangerouslySetInnerHTML/g;
    const violations: { file: string; matches: string[] }[] = [];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(dangerRegex);
      if (matches) {
        violations.push({ file: path.basename(filePath), matches });
      }
    }

    assert.equal(
      violations.length,
      0,
      `Found dangerouslySetInnerHTML in components:\n${JSON.stringify(violations, null, 2)}`
    );
  });
});

