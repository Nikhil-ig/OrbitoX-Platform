import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppearanceSchema,
  DEFAULT_APPEARANCE,
  ACCENT_PRESETS,
  VALID_RADII,
  parseAppearanceCookie,
  serializeAppearanceCookie,
  updateOperatorAppearance,
  getOperatorAppearance,
  updateCustomerAppearance,
  getCustomerAppearance,
} from '@/server/appearance/appearance-service';
import { prisma } from '@/server/db/prisma';

describe('Appearance Settings & Server Enforcement (7B.1)', () => {
  describe('Schema Validation & Attack Payload Rejection', () => {
    it('accepts valid default appearance values', () => {
      const parsed = AppearanceSchema.safeParse(DEFAULT_APPEARANCE);
      assert.equal(parsed.success, true);
    });

    it('accepts all 8 allowed accent presets', () => {
      for (const accent of ACCENT_PRESETS) {
        const parsed = AppearanceSchema.safeParse({ accent });
        assert.equal(parsed.success, true, `Expected accent ${accent} to be accepted`);
        if (parsed.success) {
          assert.equal(parsed.data.accent, accent);
        }
      }
    });

    it('accepts all 8 allowed corner radius steps (4 to 32, step 4)', () => {
      for (const radius of VALID_RADII) {
        const parsed = AppearanceSchema.safeParse({ radius });
        assert.equal(parsed.success, true, `Expected radius ${radius} to be accepted`);
        if (parsed.success) {
          assert.equal(parsed.data.radius, radius);
        }
      }
    });

    it('refuses invalid radius values with validation errors (e.g. 7, 10, 50, -4)', () => {
      const invalidRadii = [0, 7, 10, 15, 33, 50, -4, 2.5];
      for (const radius of invalidRadii) {
        const parsed = AppearanceSchema.safeParse({ radius });
        assert.equal(parsed.success, false, `Expected radius ${radius} to be refused`);
      }
    });

    it('refuses unknown accent presets (e.g. neon_pink, hot_coral, custom)', () => {
      const invalidAccents = ['neon_pink', 'hot_coral', 'cyan', 'black', '#3D6EF5', 'rgb(0,0,0)'];
      for (const accent of invalidAccents) {
        const parsed = AppearanceSchema.safeParse({ accent });
        assert.equal(parsed.success, false, `Expected accent "${accent}" to be refused`);
      }
    });

    it('strictly refuses CSS injection strings and hostile payloads', () => {
      const hostilePayloads = [
        'red; body { display: none }',
        '"><script>alert(1)</script>',
        'url("https://evil.attacker.com")',
        'expression(alert(1))',
        'var(--color-danger); border: 10px solid red;',
      ];

      for (const payload of hostilePayloads) {
        const parsedTheme = AppearanceSchema.safeParse({ theme: payload });
        assert.equal(parsedTheme.success, false, `Expected hostile theme "${payload}" to be refused`);

        const parsedAccent = AppearanceSchema.safeParse({ accent: payload });
        assert.equal(parsedAccent.success, false, `Expected hostile accent "${payload}" to be refused`);

        const parsedDensity = AppearanceSchema.safeParse({ density: payload });
        assert.equal(parsedDensity.success, false, `Expected hostile density "${payload}" to be refused`);
      }
    });
  });

  describe('Cookie Serialization & Safe Parsing', () => {
    it('serializes and parses round-trip cleanly', () => {
      const custom = {
        theme: 'dark' as const,
        accent: 'saffron' as const,
        density: 'relaxed' as const,
        radius: 32 as const,
        smoothAnimations: false,
        boldFocusRings: true,
        compactSidebar: true,
      };

      const serialized = serializeAppearanceCookie(custom);
      const parsed = parseAppearanceCookie(serialized);
      assert.deepEqual(parsed, custom);
    });

    it('falls back to DEFAULT_APPEARANCE on malformed or hostile cookie string without throwing', () => {
      assert.deepEqual(parseAppearanceCookie(null), DEFAULT_APPEARANCE);
      assert.deepEqual(parseAppearanceCookie(''), DEFAULT_APPEARANCE);
      assert.deepEqual(parseAppearanceCookie('invalid-json{{{'), DEFAULT_APPEARANCE);
      assert.deepEqual(parseAppearanceCookie(encodeURIComponent('{"accent":"malicious_hack"}')), DEFAULT_APPEARANCE);
    });
  });

  describe('User Preference Isolation', () => {
    it('isolates operator preferences so one operator never affects another', async (t) => {
      const hasDb =
        Boolean(process.env.DATABASE_URL || process.env.TEST_DATABASE_URL) &&
        process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json';
      if (!hasDb) {
        t.skip('Skipping live DB isolation test: DATABASE_URL not set in this environment');
        return;
      }

      // Create two distinct operators
      const op1 = await prisma.platformOperator.create({
        data: {
          email: `op1_${Date.now()}@test.orbitox.local`,
          passwordHash: 'dummy',
          mfaTotpSealed: 'sealed_dummy_totp_1',
          role: 'OPERATOR',
        },
      });

      const op2 = await prisma.platformOperator.create({
        data: {
          email: `op2_${Date.now()}@test.orbitox.local`,
          passwordHash: 'dummy',
          mfaTotpSealed: 'sealed_dummy_totp_2',
          role: 'OPERATOR',
        },
      });

      try {
        // Update op1 to Emerald / Compact / 16px
        const res1 = await updateOperatorAppearance(op1.id, {
          theme: 'dark',
          accent: 'emerald',
          density: 'compact',
          radius: 16,
          smoothAnimations: false,
          boldFocusRings: true,
          compactSidebar: false,
        });
        assert.equal(res1.success, true);

        // Update op2 to Ruby / Relaxed / 32px
        const res2 = await updateOperatorAppearance(op2.id, {
          theme: 'light',
          accent: 'ruby',
          density: 'relaxed',
          radius: 32,
          smoothAnimations: true,
          boldFocusRings: false,
          compactSidebar: true,
        });
        assert.equal(res2.success, true);

        // Fetch op1 and op2 preferences
        const fetchedOp1 = await getOperatorAppearance(op1.id);
        const fetchedOp2 = await getOperatorAppearance(op2.id);

        assert.equal(fetchedOp1.accent, 'emerald');
        assert.equal(fetchedOp1.density, 'compact');
        assert.equal(fetchedOp1.radius, 16);

        assert.equal(fetchedOp2.accent, 'ruby');
        assert.equal(fetchedOp2.density, 'relaxed');
        assert.equal(fetchedOp2.radius, 32);

        // Verify mutual isolation
        assert.notEqual(fetchedOp1.accent, fetchedOp2.accent);
        assert.notEqual(fetchedOp1.density, fetchedOp2.density);
        assert.notEqual(fetchedOp1.radius, fetchedOp2.radius);
      } finally {
        await prisma.platformOperator.deleteMany({
          where: { id: { in: [op1.id, op2.id] } },
        });
      }
    });

    it('isolates customer user preferences cleanly', async (t) => {
      const hasDb =
        Boolean(process.env.DATABASE_URL || process.env.TEST_DATABASE_URL) &&
        process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json';
      if (!hasDb) {
        t.skip('Skipping live DB isolation test: DATABASE_URL not set in this environment');
        return;
      }

      const u1 = await prisma.customerUser.create({
        data: {
          email: `u1_${Date.now()}@test.orbitox.local`,
          passwordHash: 'dummy',
        },
      });

      const u2 = await prisma.customerUser.create({
        data: {
          email: `u2_${Date.now()}@test.orbitox.local`,
          passwordHash: 'dummy',
        },
      });

      try {
        await updateCustomerAppearance(u1.id, {
          theme: 'dark',
          accent: 'saffron',
          density: 'standard',
          radius: 20,
          smoothAnimations: true,
          boldFocusRings: true,
          compactSidebar: false,
        });

        await updateCustomerAppearance(u2.id, {
          theme: 'auto',
          accent: 'teal',
          density: 'relaxed',
          radius: 12,
          smoothAnimations: false,
          boldFocusRings: false,
          compactSidebar: true,
        });

        const fetchedU1 = await getCustomerAppearance(u1.id);
        const fetchedU2 = await getCustomerAppearance(u2.id);

        assert.equal(fetchedU1.accent, 'saffron');
        assert.equal(fetchedU1.radius, 20);

        assert.equal(fetchedU2.accent, 'teal');
        assert.equal(fetchedU2.radius, 12);

        assert.notEqual(fetchedU1.accent, fetchedU2.accent);
      } finally {
        await prisma.customerUser.deleteMany({
          where: { id: { in: [u1.id, u2.id] } },
        });
      }
    });
  });
});
