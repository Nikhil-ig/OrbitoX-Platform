import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export interface StyleMutationViolation {
  file: string;
  line: number;
  column: number;
  snippet: string;
  kind: string;
}

export function detectStyleMutationsInSource(filePath: string, sourceText: string): StyleMutationViolation[] {
  const sf = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const violations: StyleMutationViolation[] = [];
  const styleAliases = new Set<string>();

  // Pass 1: Statically trace style aliases and destructured identifiers
  function findAliases(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          const propName = element.propertyName
            ? element.propertyName.getText(sf)
            : element.name.getText(sf);
          if (propName === 'style') {
            styleAliases.add(element.name.getText(sf));
          }
        }
      }
      if (ts.isPropertyAccessExpression(node.initializer) && node.initializer.name.text === 'style') {
        if (ts.isIdentifier(node.name)) {
          styleAliases.add(node.name.text);
        }
      } else if (
        ts.isElementAccessExpression(node.initializer) &&
        node.initializer.argumentExpression &&
        ts.isStringLiteral(node.initializer.argumentExpression) &&
        node.initializer.argumentExpression.text === 'style'
      ) {
        if (ts.isIdentifier(node.name)) {
          styleAliases.add(node.name.text);
        }
      }
    }
    ts.forEachChild(node, findAliases);
  }
  findAliases(sf);

  function isStyleAccess(expr: ts.Expression): boolean {
    if (ts.isPropertyAccessExpression(expr)) {
      if (expr.name.text === 'style') return true;
      return isStyleAccess(expr.expression);
    }
    if (ts.isElementAccessExpression(expr)) {
      if (
        expr.argumentExpression &&
        ts.isStringLiteral(expr.argumentExpression) &&
        expr.argumentExpression.text === 'style'
      ) {
        return true;
      }
      return isStyleAccess(expr.expression);
    }
    if (ts.isIdentifier(expr) && styleAliases.has(expr.text)) {
      return true;
    }
    return false;
  }

  // Pass 2: Detect mutating expressions and calls
  function findMutations(node: ts.Node) {
    // 1. Assignment expressions
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.EqualsToken,
        ts.SyntaxKind.PlusEqualsToken,
        ts.SyntaxKind.MinusEqualsToken,
        ts.SyntaxKind.AsteriskEqualsToken,
        ts.SyntaxKind.SlashEqualsToken,
      ].includes(node.operatorToken.kind)
    ) {
      if (isStyleAccess(node.left)) {
        const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        violations.push({
          file: path.basename(filePath),
          line: line + 1,
          column: character + 1,
          snippet: node.getText(sf).slice(0, 100),
          kind: 'Assignment to style or style property',
        });
      }
    }

    // 2. Unary mutating expressions
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)
    ) {
      if (isStyleAccess(node.operand)) {
        const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        violations.push({
          file: path.basename(filePath),
          line: line + 1,
          column: character + 1,
          snippet: node.getText(sf).slice(0, 100),
          kind: 'Unary mutation of style property',
        });
      }
    }

    // 3. Mutating method calls
    if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text;
        if (
          ['setProperty', 'removeProperty'].includes(methodName) &&
          isStyleAccess(node.expression.expression)
        ) {
          const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          violations.push({
            file: path.basename(filePath),
            line: line + 1,
            column: character + 1,
            snippet: node.getText(sf).slice(0, 100),
            kind: `Direct style.${methodName} call`,
          });
        }
      }
    }

    ts.forEachChild(node, findMutations);
  }

  findMutations(sf);
  return violations;
}

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

  it('enforces 0 direct DOM style mutations in components and charts (AST-based static guard)', () => {
    // AST Static Analysis checking:
    // 1. Direct assignment (el.style = ...)
    // 2. Member mutation (el.style.transform = ..., el.style['transform'] = ...)
    // 3. Mutating methods (el.style.setProperty(...), el.style.removeProperty(...))
    // 4. Aliased and destructured style references (const { style } = el; style.color = ...; const s = el.style; s.color = ...)
    const violations: { file: string; line: number; column: number; snippet: string; kind: string }[] = [];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileViolations = detectStyleMutationsInSource(filePath, content);
      violations.push(...fileViolations);
    }

    assert.equal(
      violations.length,
      0,
      `Found direct DOM style mutations in components:\n${JSON.stringify(violations, null, 2)}`
    );
  });

  it('verifies AST style invariant guard correctly catches prohibited mutations in adversarial snippets', () => {
    // Synthetic negative test samples verifying guard efficacy
    const badSample1 = 'const el = document.getElementById("x"); el.style = "color: red";';
    assert.ok(detectStyleMutationsInSource('test1.ts', badSample1).length >= 1);

    const badSample2 = 'const el = document.getElementById("x"); el.style.transform = "translateY(10px)";';
    assert.ok(detectStyleMutationsInSource('test2.ts', badSample2).length >= 1);

    const badSample3 = 'const el = document.getElementById("x"); el.style["opacity"] = "0.5";';
    assert.ok(detectStyleMutationsInSource('test3.ts', badSample3).length >= 1);

    const badSample4 = 'const el = document.getElementById("x"); el.style.setProperty("--my-var", "10px");';
    assert.ok(detectStyleMutationsInSource('test4.ts', badSample4).length >= 1);

    const badSample5 = 'const { style } = el; style.color = "blue";';
    assert.ok(detectStyleMutationsInSource('test5.ts', badSample5).length >= 1);

    const badSample6 = 'const s = el.style; s.backgroundColor = "white";';
    assert.ok(detectStyleMutationsInSource('test6.ts', badSample6).length >= 1);

    // Benign sample: variable named style with no DOM mutation
    const benignSample = 'const buttonStyle = "p-4"; const isStyleActive = true;';
    assert.equal(detectStyleMutationsInSource('benign.ts', benignSample).length, 0);
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

