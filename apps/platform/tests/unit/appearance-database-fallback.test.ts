import './dom-setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/server/db/prisma';
import { Prisma } from '@prisma/client';
import {
  getOperatorAppearance,
  getCustomerAppearance,
  getPersonaDefaultAppearance,
  parseAppearanceCookie,
  serializeAppearanceCookie,
  resolveInitialAppearance,
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

  const GENUINE_PRISMA_OUTAGE = new Prisma.PrismaClientInitializationError(
    "Can't reach database server at 'aws.postgres:5432'. Please make sure your database server is running.",
    '6.19.3',
    'P1001'
  );

  const GENUINE_PRISMA_KNOWN_ERROR = new Prisma.PrismaClientKnownRequestError(
    'Database connection timed out during query execution',
    { code: 'P1001', clientVersion: '6.19.3' }
  );

  it('propagates genuine Prisma outage error from getOperatorAppearance without swallowing', async () => {
    const originalFindUnique = prisma.platformOperator.findUnique;
    prisma.platformOperator.findUnique = (async () => {
      throw GENUINE_PRISMA_OUTAGE;
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await getOperatorAppearance('operator-outage-test');
        },
        (err: any) => {
          assert.ok(err instanceof Prisma.PrismaClientInitializationError, 'Error must be genuine PrismaClientInitializationError instance');
          assert.equal(err.errorCode, 'P1001');
          return true;
        },
        'getOperatorAppearance must let Prisma outage errors bubble up'
      );
    } finally {
      prisma.platformOperator.findUnique = originalFindUnique;
    }
  });

  it('propagates genuine Prisma outage error from getCustomerAppearance without swallowing', async () => {
    const originalFindUnique = prisma.customerUser.findUnique;
    prisma.customerUser.findUnique = (async () => {
      throw GENUINE_PRISMA_OUTAGE;
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await getCustomerAppearance('customer-outage-test');
        },
        (err: any) => {
          assert.ok(err instanceof Prisma.PrismaClientInitializationError, 'Error must be genuine PrismaClientInitializationError instance');
          assert.equal(err.errorCode, 'P1001');
          return true;
        },
        'getCustomerAppearance must let Prisma outage errors bubble up'
      );
    } finally {
      prisma.customerUser.findUnique = originalFindUnique;
    }
  });

  it('executes production resolveInitialAppearance during genuine Prisma outage, recovering validated cookie before persona default', async () => {
    const originalFindUnique = prisma.platformOperatorSession.findUnique;
    prisma.platformOperatorSession.findUnique = (async () => {
      throw GENUINE_PRISMA_OUTAGE;
    }) as any;

    const rawCookie = serializeAppearanceCookie(CUSTOM_SAVED_COOKIE);
    // 43-character valid base64url token structure to satisfy session token validation
    const mockOperatorToken = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP1';

    try {
      // Execute the exact production resolver invoked by RootLayout
      const resolved = await resolveInitialAppearance({
        operatorToken: mockOperatorToken,
        rawAppearanceCookie: rawCookie,
        routePersona: 'operator',
      });

      assert.equal(resolved.accent, 'ruby', 'Must recover accent from validated cookie during DB outage');
      assert.equal(resolved.theme, 'dark');
      assert.equal(resolved.radius, 32);
      assert.equal(resolved.boldFocusRings, true);
    } finally {
      prisma.platformOperatorSession.findUnique = originalFindUnique;
    }
  });

  it('executes production resolveInitialAppearance during Prisma outage with missing/corrupted cookie, falling back to persona default', async () => {
    const originalFindUnique = prisma.platformOperatorSession.findUnique;
    prisma.platformOperatorSession.findUnique = (async () => {
      throw GENUINE_PRISMA_KNOWN_ERROR;
    }) as any;

    const mockOperatorToken = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP1';

    try {
      // 1. Missing cookie during outage -> operator default (dark mood)
      const resolvedMissing = await resolveInitialAppearance({
        operatorToken: mockOperatorToken,
        rawAppearanceCookie: null,
        routePersona: 'operator',
      });
      const opDefault = getPersonaDefaultAppearance('operator');
      assert.deepEqual(resolvedMissing, opDefault, 'Must fall back to operator default on missing cookie');
      assert.equal(resolvedMissing.theme, 'dark');

      // 2. Corrupted cookie during outage -> customer default (light mood)
      const resolvedCorrupt = await resolveInitialAppearance({
        customerToken: 'mock-cust-token',
        rawAppearanceCookie: 'not-valid-json-cookie',
        routePersona: 'customer',
      });
      const custDefault = getPersonaDefaultAppearance('customer');
      assert.deepEqual(resolvedCorrupt, custDefault, 'Must fall back to customer default on corrupted cookie');
      assert.equal(resolvedCorrupt.theme, 'light');
      assert.equal(resolvedCorrupt.radius, 28);
    } finally {
      prisma.platformOperatorSession.findUnique = originalFindUnique;
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
