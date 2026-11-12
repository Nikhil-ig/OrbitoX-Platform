import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateColor,
  calculateContrast,
  applyTenantTheme,
  DEFAULT_TENANT_THEME,
} from '../src/tokens/index.ts';

describe('Tenant Theming & Cryptographic Injection Guard (B2.4)', () => {
  describe('Color Validation & Injection Prevention', () => {
    it('accepts valid 3, 4, 6, and 8 digit hex colors', () => {
      assert.equal(validateColor('#fff').valid, true);
      assert.equal(validateColor('#ffff').valid, true);
      assert.equal(validateColor('#4f46e5').valid, true);
      assert.equal(validateColor('#4f46e5ff').valid, true);
    });

    it('accepts valid OKLCH colors within permissible gamut', () => {
      assert.equal(validateColor('oklch(0.6 0.25 240)').valid, true);
      assert.equal(validateColor('oklch(60% 0.25 240)').valid, true);
      assert.equal(validateColor('oklch(0.7 0.15 120 / 0.9)').valid, true);
    });

    it('strictly REJECTS CSS injection strings and hostile payloads', () => {
      // Semicolon and CSS property injection
      const hostile1 = validateColor('red; background:url(https://evil.com/leak)');
      assert.equal(hostile1.valid, false);
      assert.match(hostile1.error!, /prohibited characters/);

      // JavaScript protocol
      const hostile2 = validateColor('javascript:alert(1)');
      assert.equal(hostile2.valid, false);

      // HTML tag injection
      const hostile3 = validateColor('<script>alert(1)</script>');
      assert.equal(hostile3.valid, false);

      // Free-form CSS named colors (must be explicit hex or OKLCH)
      const hostile4 = validateColor('blue');
      assert.equal(hostile4.valid, false);
      assert.match(hostile4.error!, /Only strict Hex.*are permitted/);

      // CSS comments
      const hostile5 = validateColor('#fff /* comment */');
      assert.equal(hostile5.valid, false);
    });
  });

  describe('WCAG 2.2 AA Contrast Enforcement', () => {
    it('calculates contrast correctly between black and white (21:1)', () => {
      const contrast = calculateContrast('#ffffff', '#000000');
      assert.equal(contrast.ratio, 21);
      assert.equal(contrast.passesAA, true);
      assert.equal(contrast.passesAALarge, true);
    });

    it('detects low contrast colors that fail WCAG AA (ratio < 4.5:1)', () => {
      // Light grey on white
      const contrast = calculateContrast('#e5e7eb', '#ffffff');
      assert.ok(contrast.ratio < 4.5);
      assert.equal(contrast.passesAA, false);
    });
  });

  describe('applyTenantTheme Scoped Generator', () => {
    it('generates scoped [data-tenant-theme] CSS for valid inputs', () => {
      const result = applyTenantTheme({
        tenantId: 'diner-oasis-99',
        primary: '#4f46e5',
        accent: '#06b6d4',
        radius: 'md',
      });

      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
      assert.match(result.css, /\[data-tenant-theme="diner-oasis-99"\]/);
      assert.match(result.css, /--color-primary:\s*#4f46e5/);
      assert.match(result.css, /--color-accent:\s*#06b6d4/);
      assert.match(result.css, /--radius-md:\s*0\.5rem/);
    });

    it('falls back to default safe theme when hostile input is provided', () => {
      const hostileResult = applyTenantTheme({
        tenantId: 'evil-tenant; xss',
        primary: 'red; background:url(https://attacker.com/steal)',
        accent: '#ffffff',
      });

      assert.equal(hostileResult.valid, false);
      assert.ok(hostileResult.errors.length > 0);
      // Fallback applied
      assert.equal(hostileResult.appliedTheme.primary, DEFAULT_TENANT_THEME.primary);
      assert.equal(hostileResult.appliedTheme.primaryFg, DEFAULT_TENANT_THEME.primaryFg);
      // Sanitizes tenantId selector (no injected semicolon or unescaped injection)
      assert.doesNotMatch(hostileResult.css, /evil-tenant;/);
    });

    it('fails validation when primary color has insufficient contrast against both black and white', () => {
      // #777777 fails 4.5:1 against both pure white (4.48:1) and dark black/zinc (4.44:1)
      const lowContrastResult = applyTenantTheme({
        primary: '#777777',
        accent: '#06b6d4',
      });

      assert.equal(lowContrastResult.valid, false);
      assert.ok(lowContrastResult.errors.some((e) => e.includes('contrast requirement')));
      assert.equal(lowContrastResult.appliedTheme.primary, DEFAULT_TENANT_THEME.primary);
    });
  });
});
