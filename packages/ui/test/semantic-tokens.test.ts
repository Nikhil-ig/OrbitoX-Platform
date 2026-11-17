import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculateContrast } from '../src/tokens/color-validator';

describe('Layer 2: Semantic Tokens & Contrast Matrix (WCAG 2.2 AA)', () => {
  const cssPath = path.resolve(__dirname, '../src/tokens/semantic.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

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

  const ACCENTS = [
    { name: 'ocean', darkHex: '#3A6BF5', lightHex: '#2F5BD8', darkFg: '#FFFFFF', lightFg: '#FFFFFF' },
    { name: 'emerald', darkHex: '#047857', lightHex: '#047857', darkFg: '#FFFFFF', lightFg: '#FFFFFF' },
    { name: 'sunflower', darkHex: '#F59E0B', lightHex: '#F59E0B', darkFg: '#0D0F12', lightFg: '#0D0F12', safeUI: '#B45309' },
    { name: 'saffron', darkHex: '#C2410C', lightHex: '#C2410C', darkFg: '#FFFFFF', lightFg: '#FFFFFF' },
    { name: 'ruby', darkHex: '#E11D48', lightHex: '#BE123C', darkFg: '#FFFFFF', lightFg: '#FFFFFF' },
    { name: 'coral', darkHex: '#D9381E', lightHex: '#D9381E', darkFg: '#FFFFFF', lightFg: '#FFFFFF' },
    { name: 'violet', darkHex: '#7C3AED', lightHex: '#6D28D9', darkFg: '#FFFFFF', lightFg: '#FFFFFF' },
    { name: 'teal', darkHex: '#0F766E', lightHex: '#0F766E', darkFg: '#FFFFFF', lightFg: '#FFFFFF' },
  ];

  for (const acc of ACCENTS) {
    it(`accent "${acc.name}" satisfies WCAG 2.2 AA in dark and light modes`, () => {
      // Button text contrast
      const darkBtnContrast = calculateContrast(acc.darkHex, acc.darkFg);
      const lightBtnContrast = calculateContrast(acc.lightHex, acc.lightFg);

      assert.ok(
        darkBtnContrast.passesAA || darkBtnContrast.ratio >= 4.5,
        `Dark button text for ${acc.name} must be >= 4.5:1 (got ${darkBtnContrast.ratio}:1)`
      );
      assert.ok(
        lightBtnContrast.passesAA || lightBtnContrast.ratio >= 4.5,
        `Light button text for ${acc.name} must be >= 4.5:1 (got ${lightBtnContrast.ratio}:1)`
      );

      // Sunflower safe UI token verification
      if (acc.safeUI) {
        const safeUiOnLightCanvas = calculateContrast(acc.safeUI, '#EEF1F5');
        assert.ok(
          safeUiOnLightCanvas.ratio >= 3.0,
          `Safe UI token ${acc.safeUI} on light canvas must be >= 3.0:1 for non-text UI (got ${safeUiOnLightCanvas.ratio}:1)`
        );
      }
    });
  }

  it('dark canvas, surface, and text meet WCAG 2.2 AA contrast standards', () => {
    const textOnCanvas = calculateContrast('#F2F4F7', '#0D0F12');
    const textOnSurface = calculateContrast('#F2F4F7', '#14171C');

    assert.ok(textOnCanvas.ratio >= 7.0, `Text on dark canvas must be AAA (got ${textOnCanvas.ratio}:1)`);
    assert.ok(textOnSurface.ratio >= 7.0, `Text on dark surface must be AAA (got ${textOnSurface.ratio}:1)`);
  });

  it('light canvas, surface, and text meet WCAG 2.2 AA contrast standards', () => {
    const textOnCanvas = calculateContrast('#14161A', '#EEF1F5');
    const textOnSurface = calculateContrast('#14161A', '#FFFFFF');

    assert.ok(textOnCanvas.ratio >= 7.0, `Text on light canvas must be AAA (got ${textOnCanvas.ratio}:1)`);
    assert.ok(textOnSurface.ratio >= 7.0, `Text on light surface must be AAA (got ${textOnSurface.ratio}:1)`);
  });
});
