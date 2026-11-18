import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateContrast,
  hexToRgb,
  getRelativeLuminance,
} from '../src/tokens/color-validator';

/**
 * Calculates exact unrounded WCAG relative luminance contrast ratio.
 */
function exactContrastRatio(hexA: string, hexB: string): number {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) throw new Error(`Invalid hex color: ${hexA} or ${hexB}`);
  const lumA = getRelativeLuminance(rgbA);
  const lumB = getRelativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parses CSS custom properties dynamically from raw CSS source text.
 * Indexes both full selector blocks and individual comma-separated selectors.
 */
function parseCssRules(css: string): Map<string, Record<string, string>> {
  const blocks = new Map<string, Record<string, string>>();
  const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = ruleRegex.exec(css)) !== null) {
    const rawSelector = match[1]?.trim() ?? '';
    const body = match[2]?.trim() ?? '';
    if (!rawSelector || rawSelector.startsWith('@media')) continue;

    const props: Record<string, string> = {};
    for (const line of body.split(';')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        if (key.startsWith('--')) {
          props[key] = val;
        }
      }
    }
    // Index full selector string
    blocks.set(rawSelector, props);
    // Also index individual comma-separated selectors for granular lookup
    for (const subSel of rawSelector.split(',').map((s) => s.trim())) {
      if (subSel) blocks.set(subSel, props);
    }
  }

  return blocks;
}

export interface ExtractedAccentTokens {
  name: string;
  darkBg: string;
  darkFg: string;
  lightBg: string;
  lightFg: string;
  safeUI?: string;
}

/**
 * Dynamically extracts all 8 accent token sets from the parsed CSS rules.
 */
function extractAllAccentTokens(parsedRules: Map<string, Record<string, string>>): ExtractedAccentTokens[] {
  const ACCENTS = ['ocean', 'emerald', 'sunflower', 'saffron', 'ruby', 'coral', 'violet', 'teal'] as const;
  const result: ExtractedAccentTokens[] = [];

  for (const acc of ACCENTS) {
    let darkBg: string | undefined;
    let darkFg: string | undefined;
    let lightBg: string | undefined;
    let lightFg: string | undefined;
    let safeUI: string | undefined;

    for (const [sel, props] of parsedRules.entries()) {
      if (sel.includes('data-theme="light"') && sel.includes(`data-accent="${acc}"`)) {
        if (props['--color-accent']) lightBg = props['--color-accent'];
        if (props['--color-accent-fg']) lightFg = props['--color-accent-fg'];
      } else if (
        sel.includes(`data-accent="${acc}"`) &&
        !sel.includes('data-theme="light"') &&
        !sel.includes('data-theme="auto"')
      ) {
        if (props['--color-accent']) darkBg = props['--color-accent'];
        if (props['--color-accent-fg']) darkFg = props['--color-accent-fg'];
        if (props['--color-accent-contrast-safe']) safeUI = props['--color-accent-contrast-safe'];
      }
    }

    // Presets with identical values in dark/light fall back gracefully
    if (!lightBg) lightBg = darkBg;
    if (!lightFg) lightFg = darkFg;

    if (!darkBg || !darkFg || !lightBg || !lightFg) {
      throw new Error(`Failed to extract tokens for accent "${acc}" dynamically from semantic.css`);
    }

    result.push({
      name: acc,
      darkBg,
      darkFg,
      lightBg,
      lightFg,
      safeUI,
    });
  }

  return result;
}

describe('Layer 2: Semantic Tokens & Contrast Matrix (WCAG 2.2 AA & SC 1.4.11 / SC 1.4.3)', () => {
  const cssPath = path.resolve(__dirname, '../src/tokens/semantic.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const parsedRules = parseCssRules(cssContent);
  const extractedAccents = extractAllAccentTokens(parsedRules);

  it('declares base themes BEFORE accent presets to prevent cascade clobbering', () => {
    const lightThemeIndex = cssContent.indexOf('[data-theme="light"] {');
    const emeraldIndex = cssContent.indexOf('[data-accent="emerald"]');
    const sunflowerIndex = cssContent.indexOf('[data-accent="sunflower"]');

    assert.ok(lightThemeIndex > 0, '[data-theme="light"] must exist');
    assert.ok(emeraldIndex > 0, '[data-accent="emerald"] must exist');
    assert.ok(sunflowerIndex > 0, '[data-accent="sunflower"] must exist');

    assert.ok(
      lightThemeIndex < emeraldIndex,
      '[data-theme="light"] must be declared BEFORE [data-accent="emerald"]'
    );
    assert.ok(
      lightThemeIndex < sunflowerIndex,
      '[data-theme="light"] must be declared BEFORE [data-accent="sunflower"]'
    );
  });

  it('includes compound selectors for light-mode accents', () => {
    assert.ok(
      cssContent.includes('[data-theme="light"][data-accent="sunflower"]') ||
      cssContent.includes('[data-theme="light"] [data-accent="sunflower"]'),
      'Sunflower must have qualified light-theme compound selectors'
    );
    assert.ok(
      cssContent.includes('[data-theme="light"][data-accent="ruby"]') ||
      cssContent.includes('[data-theme="light"] [data-accent="ruby"]'),
      'Ruby must have qualified light-theme compound selectors'
    );
    assert.ok(
      cssContent.includes('[data-theme="light"][data-accent="violet"]') ||
      cssContent.includes('[data-theme="light"] [data-accent="violet"]'),
      'Violet must have qualified light-theme compound selectors'
    );
  });

  it('parses CSS custom properties dynamically and extracts all 8 accents', () => {
    assert.ok(parsedRules.size >= 10, `Expected >= 10 parsed CSS blocks, got ${parsedRules.size}`);
    assert.equal(extractedAccents.length, 8, 'Must extract all 8 accent presets dynamically from CSS');

    const sunflower = extractedAccents.find((a) => a.name === 'sunflower');
    assert.ok(sunflower, 'Sunflower tokens must exist in parsed CSS');
    assert.equal(sunflower.darkBg, '#F59E0B');
    assert.equal(sunflower.darkFg, '#0D0F12');
    assert.equal(sunflower.safeUI, '#B45309');
  });

  // ─── SC 1.4.3: Contrast (Minimum) for Normal Text (>= 4.5:1) ───────────────────────
  describe('WCAG 2.2 SC 1.4.3 — Normal Text Contrast (>= 4.5:1) from CSS Tokens', () => {
    for (const acc of extractedAccents) {
      it(`filled button text on "${acc.name}" satisfies SC 1.4.3 (>= 4.5:1) in dark & light from parsed CSS`, () => {
        const darkContrast = calculateContrast(acc.darkBg, acc.darkFg);
        const lightContrast = calculateContrast(acc.lightBg, acc.lightFg);

        assert.ok(
          darkContrast.ratio >= 4.5,
          `Dark button text for ${acc.name} (${acc.darkFg} on ${acc.darkBg} from CSS) must be >= 4.5:1 (got ${darkContrast.ratio}:1)`
        );
        assert.ok(
          lightContrast.ratio >= 4.5,
          `Light button text for ${acc.name} (${acc.lightFg} on ${acc.lightBg} from CSS) must be >= 4.5:1 (got ${lightContrast.ratio}:1)`
        );
      });
    }

    it('White (#FFFFFF) on Ocean (#3A6BF5) satisfies SC 1.4.3 normal text (exact 4.564:1)', () => {
      const oceanTokens = extractedAccents.find((a) => a.name === 'ocean');
      assert.ok(oceanTokens);
      const ratio = exactContrastRatio(oceanTokens.darkFg, oceanTokens.darkBg);
      assert.ok(ratio >= 4.5, `Expected >= 4.5:1, got ${ratio}:1`);
      assert.ok(Math.abs(ratio - 4.564) < 0.005, `Expected ~4.564:1, got ${ratio.toFixed(3)}:1`);
    });

    it('Obsidian (#0D0F12) on Sunflower (#F59E0B) satisfies SC 1.4.3 AAA text (exact 8.936:1)', () => {
      const sunTokens = extractedAccents.find((a) => a.name === 'sunflower');
      assert.ok(sunTokens);
      const ratio = exactContrastRatio(sunTokens.darkFg, sunTokens.darkBg);
      assert.ok(ratio >= 7.0, `Expected >= 7.0:1 (AAA), got ${ratio}:1`);
      assert.ok(Math.abs(ratio - 8.936) < 0.005, `Expected ~8.936:1, got ${ratio.toFixed(3)}:1`);
    });

    it('Dark canvas and surface body text satisfies SC 1.4.3 AAA (>= 7.0:1)', () => {
      const onCanvas = calculateContrast('#F2F4F7', '#0D0F12');
      const onSurface = calculateContrast('#F2F4F7', '#14171C');
      assert.ok(onCanvas.ratio >= 7.0, `Body text on dark canvas must be AAA (got ${onCanvas.ratio}:1)`);
      assert.ok(onSurface.ratio >= 7.0, `Body text on dark surface must be AAA (got ${onSurface.ratio}:1)`);
    });

    it('Light canvas and surface body text satisfies SC 1.4.3 AAA (>= 7.0:1)', () => {
      const onCanvas = calculateContrast('#14161A', '#EEF1F5');
      const onSurface = calculateContrast('#14161A', '#FFFFFF');
      assert.ok(onCanvas.ratio >= 7.0, `Body text on light canvas must be AAA (got ${onCanvas.ratio}:1)`);
      assert.ok(onSurface.ratio >= 7.0, `Body text on light surface must be AAA (got ${onSurface.ratio}:1)`);
    });
  });

  // ─── SC 1.4.11: Non-Text Contrast for UI Components & Indicators (>= 3.0:1) ─────────
  describe('WCAG 2.2 SC 1.4.11 — Non-Text Contrast (>= 3.0:1) from CSS Tokens', () => {
    it('Ocean (#3A6BF5) on Dark Canvas (#0D0F12) satisfies SC 1.4.11 non-text UI (exact 4.205:1)', () => {
      const ocean = extractedAccents.find((a) => a.name === 'ocean')!;
      const ratio = exactContrastRatio(ocean.darkBg, '#0D0F12');
      assert.ok(ratio >= 3.0, `Expected >= 3.0:1 for non-text UI indicator, got ${ratio}:1`);
      assert.ok(Math.abs(ratio - 4.205) < 0.005, `Expected ~4.205:1, got ${ratio.toFixed(3)}:1`);
      // Note: 4.205 < 4.5, confirming Ocean is strictly a non-text UI token on dark canvas
      assert.ok(ratio < 4.5, 'Must not be used as normal text on dark canvas');
    });

    it('Ocean (#3A6BF5) on Light Canvas (#EEF1F5) satisfies SC 1.4.11 non-text UI (exact 4.028:1)', () => {
      const ocean = extractedAccents.find((a) => a.name === 'ocean')!;
      const ratio = exactContrastRatio(ocean.darkBg, '#EEF1F5');
      assert.ok(ratio >= 3.0, `Expected >= 3.0:1 for non-text UI indicator, got ${ratio}:1`);
      assert.ok(Math.abs(ratio - 4.028) < 0.005, `Expected ~4.028:1, got ${ratio.toFixed(3)}:1`);
      assert.ok(ratio < 4.5, 'Must not be used as normal text on light canvas');
    });

    it('Amber safe UI token (#B45309) on Light Canvas (#EEF1F5) satisfies SC 1.4.11 non-text UI (exact 4.432:1)', () => {
      const sun = extractedAccents.find((a) => a.name === 'sunflower')!;
      assert.ok(sun.safeUI, 'Sunflower must declare safeUI in CSS');
      const ratio = exactContrastRatio(sun.safeUI, '#EEF1F5');
      assert.ok(ratio >= 3.0, `Expected >= 3.0:1 for non-text UI indicator, got ${ratio}:1`);
      assert.ok(Math.abs(ratio - 4.432) < 0.005, `Expected ~4.432:1, got ${ratio.toFixed(3)}:1`);
      // Fails SC 1.4.3 for normal text (< 4.5:1), confirming it is strictly a non-text UI token
      assert.ok(ratio < 4.5, 'Must not be used as normal text on light canvas');
    });

    it('Amber safe UI token (#B45309) on Light Gradient (#E3E7EE) satisfies SC 1.4.11 non-text UI (exact 4.049:1)', () => {
      const sun = extractedAccents.find((a) => a.name === 'sunflower')!;
      assert.ok(sun.safeUI, 'Sunflower must declare safeUI in CSS');
      const ratio = exactContrastRatio(sun.safeUI, '#E3E7EE');
      assert.ok(ratio >= 3.0, `Expected >= 3.0:1 for non-text UI indicator, got ${ratio}:1`);
      assert.ok(Math.abs(ratio - 4.049) < 0.005, `Expected ~4.049:1, got ${ratio.toFixed(3)}:1`);
    });
  });

  // ─── Mathematical Invariant Exact Check (All 6 Boundary Ratios) ─────────────────────
  it('strictly validates all 6 mathematical sRGB luminance boundary ratios', () => {
    const boundaries = [
      { name: 'Ocean dark canvas', pair: ['#3A6BF5', '#0D0F12'], expected: 4.205, sc: '1.4.11' },
      { name: 'Ocean light canvas', pair: ['#3A6BF5', '#EEF1F5'], expected: 4.028, sc: '1.4.11' },
      { name: 'Amber light canvas', pair: ['#B45309', '#EEF1F5'], expected: 4.432, sc: '1.4.11' },
      { name: 'Amber gradient canvas', pair: ['#B45309', '#E3E7EE'], expected: 4.049, sc: '1.4.11' },
      { name: 'White on Ocean', pair: ['#FFFFFF', '#3A6BF5'], expected: 4.564, sc: '1.4.3' },
      { name: 'Obsidian on Sunflower', pair: ['#0D0F12', '#F59E0B'], expected: 8.936, sc: '1.4.3' },
    ];

    for (const b of boundaries) {
      const ratio = exactContrastRatio(b.pair[0], b.pair[1]);
      assert.ok(
        Math.abs(ratio - b.expected) < 0.005,
        `Boundary ${b.name} (${b.pair[0]}/${b.pair[1]}): expected ${b.expected}:1, got ${ratio.toFixed(3)}:1 (SC ${b.sc})`
      );
    }
  });
});
