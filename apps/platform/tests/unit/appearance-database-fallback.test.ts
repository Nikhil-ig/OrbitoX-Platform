import './dom-setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/server/db/prisma';
import {
  getOperatorAppearance,
  getCustomerAppearance,
  getPersonaDefaultAppearance,
  parseAppearanceCookie,
  serializeAppearanceCookie,
  type AppearancePreferences,
} from '@/server/appearance/appearance-service';

describe('Layer 2: Database Outage Degradation & Station Context Hierarchy (P2 Item 2)', () => {
  const CUSTOM_SAVED_COOKIE: AppearancePreferences = {
    theme: 'dark',
    accent: 'ruby',
    density: 'relaxed',
    radius: 32,
    smoothAnimations: true,
    boldFocusRings: true,
    compactSidebar: true,
  };

  it('propagates real database errors from getOperatorAppearance without swallowing', async () => {
    const originalFindUnique = prisma.platformOperator.findUnique;
    prisma.platformOperator.findUnique = (async () => {
      throw new Error("P1001: Can't reach database server at postgres:5432");
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await getOperatorAppearance('operator-outage-test');
        },
        /P1001: Can't reach database server/,
        'getOperatorAppearance must let Prisma outage errors bubble up'
      );
    } finally {
      prisma.platformOperator.findUnique = originalFindUnique;
    }
  });

  it('propagates real database errors from getCustomerAppearance without swallowing', async () => {
    const originalFindUnique = prisma.customerUser.findUnique;
    prisma.customerUser.findUnique = (async () => {
      throw new Error("P1001: Can't reach database server at postgres:5432");
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await getCustomerAppearance('customer-outage-test');
        },
        /P1001: Can't reach database server/,
        'getCustomerAppearance must let Prisma outage errors bubble up'
      );
    } finally {
      prisma.customerUser.findUnique = originalFindUnique;
    }
  });

  it('executes RootLayout resolution path during database outage, recovering validated cookie before persona default', async () => {
    const originalFindUnique = prisma.platformOperator.findUnique;
    prisma.platformOperator.findUnique = (async () => {
      throw new Error("P1001: Database connection timed out");
    }) as any;

    const rawCookie = serializeAppearanceCookie(CUSTOM_SAVED_COOKIE);

    try {
      // Simulate exact RootLayout server-side resolution path
      let dbAppearance: AppearancePreferences | null = null;
      try {
        dbAppearance = await getOperatorAppearance('op-crash-1');
      } catch (dbErr) {
        // Layout catches failure and degrades gracefully
        dbAppearance = null;
      }

      const resolved: AppearancePreferences = dbAppearance || parseAppearanceCookie(rawCookie, 'operator');

      assert.equal(resolved.accent, 'ruby', 'Must recover accent from validated cookie during DB outage');
      assert.equal(resolved.theme, 'dark');
      assert.equal(resolved.radius, 32);
      assert.equal(resolved.boldFocusRings, true);
    } finally {
      prisma.platformOperator.findUnique = originalFindUnique;
    }
  });

  it('executes RootLayout resolution path during database outage when cookie is missing or corrupted, falling back to persona default', async () => {
    const originalFindUnique = prisma.platformOperator.findUnique;
    prisma.platformOperator.findUnique = (async () => {
      throw new Error("P1001: Database connection timed out");
    }) as any;

    try {
      // 1. Missing cookie
      let dbAppearance: AppearancePreferences | null = null;
      try {
        dbAppearance = await getOperatorAppearance('op-crash-2');
      } catch {
        dbAppearance = null;
      }
      const resolvedMissing: AppearancePreferences = dbAppearance || parseAppearanceCookie(null, 'operator');
      const opDefault = getPersonaDefaultAppearance('operator');
      assert.deepEqual(resolvedMissing, opDefault, 'Must fall back to operator default on missing cookie');

      // 2. Corrupted cookie
      let dbAppearanceCust: AppearancePreferences | null = null;
      try {
        dbAppearanceCust = await getCustomerAppearance('cust-crash-2');
      } catch {
        dbAppearanceCust = null;
      }
      const resolvedCorrupt: AppearancePreferences = dbAppearanceCust || parseAppearanceCookie('invalid-not-json', 'customer');
      const custDefault = getPersonaDefaultAppearance('customer');
      assert.deepEqual(resolvedCorrupt, custDefault, 'Must fall back to customer default on corrupted cookie');
      assert.equal(resolvedCorrupt.theme, 'light');
      assert.equal(resolvedCorrupt.radius, 28);
    } finally {
      prisma.platformOperator.findUnique = originalFindUnique;
    }
  });

  it('recognizes preferences where only non-theme/accent fields (e.g. radius, animations, sidebar) are saved', async () => {
    const originalFindUnique = prisma.platformOperator.findUnique;
    prisma.platformOperator.findUnique = (async () => {
      return {
        appearanceTheme: null,
        appearanceAccent: null,
        appearanceDensity: null,
        appearanceRadius: 16,
        appearanceSmoothAnimations: false,
        appearanceBoldFocusRings: true,
        appearanceCompactSidebar: true,
      };
    }) as any;

    try {
      const result = await getOperatorAppearance('op-radius-only');
      assert.ok(result, 'Must NOT treat a record with saved radius/focusRings as unset');
      assert.equal(result?.radius, 16);
      assert.equal(result?.boldFocusRings, true);
      assert.equal(result?.compactSidebar, true);
      assert.equal(result?.smoothAnimations, false);
      // Unset fields receive persona defaults
      assert.equal(result?.theme, 'dark');
      assert.equal(result?.accent, 'ocean');
      assert.equal(result?.density, 'compact');
    } finally {
      prisma.platformOperator.findUnique = originalFindUnique;
    }
  });

  it('applies station context dark override to /pos route when x-orbito-station indicates dark or night terminal', () => {
    // Default /pos without station hint -> light
    const defaultPos = getPersonaDefaultAppearance('staff_pos');
    assert.equal(defaultPos.theme, 'light', 'POS without station hint must default to light mood');

    // /pos with station hint 'kds' -> overrides to dark mood
    const kdsPos = getPersonaDefaultAppearance('staff_pos', 'kds');
    assert.equal(kdsPos.theme, 'dark', 'POS with station=kds must override default to dark mood');

    // /pos with station hint 'dark' -> overrides to dark mood
    const darkPos = getPersonaDefaultAppearance('staff_pos', 'dark');
    assert.equal(darkPos.theme, 'dark', 'POS with station=dark must override default to dark mood');

    // /pos with station hint 'night' -> overrides to dark mood
    const nightPos = getPersonaDefaultAppearance('staff_pos', 'night');
    assert.equal(nightPos.theme, 'dark', 'POS with station=night must override default to dark mood');

    // Parse cookie with station hint fallback
    const resolvedStation = parseAppearanceCookie(null, 'staff_pos', 'kds');
    assert.equal(resolvedStation.theme, 'dark', 'parseAppearanceCookie must preserve station dark override');
  });
});
