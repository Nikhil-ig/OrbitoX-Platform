import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateColor,
  calculateContrast,
  applyTenantTheme,
  DEFAULT_TENANT_THEME,
  ACCENT_PRESETS,
} from '../src/tokens/index.ts';

describe('Tenant Theming & Cryptographic Injection Guard (B2.4 / 7B.1)', () => {
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
      const hostile1 = validateColor('red; background:url(https://evil.com/leak)');
      assert.equal(hostile1.valid, false);
      assert.match(hostile1.error!, /prohibited characters/);

      const hostile2 = validateColor('javascript:alert(1)');
      assert.equal(hostile2.valid, false);

      const hostile3 = validateColor('<script>alert(1)</script>');
      assert.equal(hostile3.valid, false);

      const hostile4 = validateColor('blue');
      assert.equal(hostile4.valid, false);
      assert.match(hostile4.error!, /Only strict Hex.*are permitted/);

      const hostile5 = validateColor('#fff /* comment */');
      assert.equal(hostile5.valid, false);
    });
  });

  describe('WCAG 2.2 AA Contrast Enforcement & 8 Presets in Both Moods', () => {
    it('calculates contrast correctly between black and white (21:1)', () => {
      const contrast = calculateContrast('#ffffff', '#000000');
      assert.equal(contrast.ratio, 21);
      assert.equal(contrast.passesAA, true);
      assert.equal(contrast.passesAALarge, true);
    });

    it('detects low contrast colors that fail WCAG AA (ratio < 4.5:1)', () => {
      const contrast = calculateContrast('#e5e7eb', '#ffffff');
      assert.ok(contrast.ratio < 4.5);
      assert.equal(contrast.passesAA, false);
    });

    it('verifies that EVERY ONE of the 8 accent presets defines its own foreground color passing WCAG 2.2 AA (>= 4.5:1)', () => {
      assert.equal(ACCENT_PRESETS.length, 8, 'Expected 8 accent presets');
      for (const preset of ACCENT_PRESETS) {
        // Text on accent element (buttons, active tabs)
        const fgContrast = calculateContrast(preset.hex, preset.fg);
        const lightContrast = preset.hexLight ? calculateContrast(preset.hexLight, preset.fg) : fgContrast;
        assert.ok(
          fgContrast.passesAALarge,
          `Preset ${preset.name} (${preset.hex}) fails WCAG 2.2 AA large text contrast against defined fg ${preset.fg} (ratio ${fgContrast.ratio}:1, required >= 3.0:1)`
        );
        if (preset.hexLight) {
          assert.ok(
            lightContrast.passesAA,
            `Preset ${preset.name} light (${preset.hexLight}) fails WCAG 2.2 AA contrast against defined fg ${preset.fg} (ratio ${lightContrast.ratio}:1, required >= 4.5:1)`
          );
        } else {
          assert.ok(
            fgContrast.passesAA,
            `Preset ${preset.name} (${preset.hex}) fails WCAG 2.2 AA contrast against defined fg ${preset.fg} (ratio ${fgContrast.ratio}:1, required >= 4.5:1)`
          );
        }
      }
    });
  });

  describe('applyTenantTheme Scoped Generator & Diner Template Token-Set (7B.1 / 7F)', () => {
    it('generates scoped [data-tenant-theme] CSS for valid direct inputs', () => {
      const result = applyTenantTheme({
        tenantId: 'diner-oasis-99',
        primary: '#3569F5',
        accent: '#047857',
        radius: 'md',
      });

      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
      assert.match(result.css, /\[data-tenant-theme="diner-oasis-99"\]/);
      assert.match(result.css, /--color-primary:\s*#3569F5/);
      assert.match(result.css, /--color-accent:\s*#047857/);
      assert.match(result.css, /--radius-card:\s*0\.5rem/);
    });

    it('accepts a whole diner template token set (e.g. Saffron) and applies it cleanly', () => {
      const saffronTemplate = {
        id: 'tmpl_saffron_v1',
        name: 'Saffron Diner Template',
        version: 1,
        tokens: {
          primary: '#C2410C',
          accent: '#EA580C',
          radius: '28px',
          font: "'Plus Jakarta Sans', sans-serif",
          bg: '#FFFDF9',
          surface: '#FFFFFF',
        },
        layout: {
          viewMode: 'cards' as const,
          sectionSwitches: {
            topDishes: true,
            liveStatusBar: true,
            vegFilter: true,
          },
        },
      };

      const result = applyTenantTheme({
        tenantId: 'masala-house-indiranagar',
        template: saffronTemplate,
      });

      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
      assert.equal(result.appliedTheme.templateId, 'tmpl_saffron_v1');
      assert.equal(result.appliedTheme.primary, '#C2410C');
      assert.equal(result.appliedTheme.accent, '#EA580C');
      assert.equal(result.appliedTheme.radius, '28px');
      assert.match(result.css, /\[data-tenant-theme="masala-house-indiranagar"\]/);
      assert.match(result.css, /--color-primary:\s*#C2410C/);
      assert.match(result.css, /--font-sans:\s*'Plus Jakarta Sans'/);
    });

    it('accepts a diner template token set WITH a custom brand override on top, validating contrast', () => {
      const noirTemplate = {
        id: 'tmpl_noir_v1',
        name: 'Noir Luxury Dining',
        version: 1,
        tokens: {
          primary: '#7C3AED',
          accent: '#7C3AED',
          radius: 'card',
        },
      };

      // Tenant overrides brand color with Emerald
      const resultWithOverride = applyTenantTheme({
        tenantId: 'royal-durbar',
        template: noirTemplate,
        brandOverride: {
          primary: '#047857',
        },
      });

      assert.equal(resultWithOverride.valid, true);
      assert.equal(resultWithOverride.appliedTheme.primary, '#047857');
      assert.equal(resultWithOverride.appliedTheme.accent, '#7C3AED');
      assert.match(resultWithOverride.css, /--color-primary:\s*#047857/);
      assert.match(resultWithOverride.css, /--color-accent:\s*#7C3AED/);
    });

    it('falls back to default safe theme when hostile input is provided', () => {
      const hostileResult = applyTenantTheme({
        tenantId: 'evil-tenant; xss',
        primary: 'red; background:url(https://attacker.com/steal)',
        accent: '#ffffff',
      });

      assert.equal(hostileResult.valid, false);
      assert.ok(hostileResult.errors.length > 0);
      assert.equal(hostileResult.appliedTheme.primary, DEFAULT_TENANT_THEME.primary);
      assert.equal(hostileResult.appliedTheme.primaryFg, DEFAULT_TENANT_THEME.primaryFg);
      assert.doesNotMatch(hostileResult.css, /evil-tenant;/);
    });

    it('fails validation when primary color has insufficient contrast against both black and white', () => {
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
