import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

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

  it('enforces all user-facing JSX text and aria-label/title/placeholder literals go through props or t() (F-5.1)', () => {
    const ALLOWED_SYMBOLS = new Set(['•', '/', '⌘K', '⌘', 'K', 'Esc', '*', '...', '-', ':', '—', '+', '×', '%', '(', ')', '100%']);
    const CHECKED_ATTRS = new Set(['aria-label', 'title', 'placeholder']);
    const violations: { file: string; detail: string }[] = [];

    for (const filePath of filesToCheck.filter((f) => f.endsWith('.tsx'))) {
      const content = fs.readFileSync(filePath, 'utf8');
      const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      function visit(node: ts.Node) {
        if (ts.isJsxText(node)) {
          const text = node.getText(sf).trim();
          if (text && !ALLOWED_SYMBOLS.has(text) && /[a-zA-Z]{2,}/.test(text)) {
            violations.push({ file: path.basename(filePath), detail: `JSXText ${JSON.stringify(text)}` });
          }
        }
        if (ts.isJsxAttribute(node) && CHECKED_ATTRS.has(node.name.getText(sf))) {
          if (node.initializer && ts.isStringLiteral(node.initializer)) {
            const val = node.initializer.text.trim();
            if (val && !ALLOWED_SYMBOLS.has(val)) {
              violations.push({
                file: path.basename(filePath),
                detail: `${node.name.getText(sf)}=${JSON.stringify(val)}`,
              });
            }
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sf);
    }

    assert.equal(
      violations.length,
      0,
      `Found hardcoded user-facing strings (must use props or t()):\n${JSON.stringify(violations, null, 2)}`
    );
  });

  it('ensures every component and chart module has Storybook story coverage (F-3)', () => {
    const storyDir = path.resolve(__dirname, '../src/stories');
    const storySource = fs
      .readdirSync(storyDir)
      .filter((f) => f.endsWith('.stories.tsx'))
      .map((f) => fs.readFileSync(path.join(storyDir, f), 'utf8'))
      .join('\n');

    const uncovered: string[] = [];
    for (const filePath of filesToCheck) {
      const base = path.basename(filePath, path.extname(filePath));
      if (base === 'index') continue;
      const isChart = filePath.startsWith(chartDir);
      const importSubpath = isChart ? `charts/${base}` : `components/${base}`;
      if (!storySource.includes(importSubpath)) {
        uncovered.push(importSubpath);
      }
    }

    assert.equal(
      uncovered.length,
      0,
      `Components/charts missing Storybook story coverage:\n${uncovered.join('\n')}`
    );
  });
});

