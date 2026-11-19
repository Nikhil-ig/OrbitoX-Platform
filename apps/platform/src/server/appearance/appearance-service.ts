import 'server-only';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import {
  getOperatorSession,
  getCustomerSession,
} from '@/server/accounts/account-service';

export const ACCENT_PRESETS = [
  'ocean',
  'emerald',
  'sunflower',
  'saffron',
  'ruby',
  'coral',
  'violet',
  'teal',
] as const;

export const VALID_RADII = [4, 8, 12, 16, 20, 24, 28, 32] as const;

export const AppearanceSchema = z.object({
  theme: z.enum(['auto', 'light', 'dark']).default('auto'),
  accent: z.enum(ACCENT_PRESETS).default('ocean'),
  density: z.enum(['relaxed', 'standard', 'compact']).default('standard'),
  radius: z
    .number()
    .int()
    .refine((val) => VALID_RADII.includes(val as (typeof VALID_RADII)[number]), {
      message: 'Corner radius must be one of 4, 8, 12, 16, 20, 24, 28, 32',
    })
    .default(28),
  smoothAnimations: z.boolean().default(true),
  boldFocusRings: z.boolean().default(false),
  compactSidebar: z.boolean().default(false),
});

export const AppearanceUpdateSchema = AppearanceSchema.partial();

export type AppearancePreferences = z.infer<typeof AppearanceSchema>;

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: 'auto',
  accent: 'ocean',
  density: 'standard',
  radius: 28,
  smoothAnimations: true,
  boldFocusRings: false,
  compactSidebar: false,
};

export const ALLOWED_STATION_HINTS = ['pos', 'kds', 'host', 'waiter', 'dark', 'night'] as const;
export type StationHint = (typeof ALLOWED_STATION_HINTS)[number];

export type PersonaRouteClass = 'operator' | 'owner' | 'customer' | 'staff_pos' | 'staff_operational' | 'public';

/**
 * Authoritative persona-specific explicit default appearances.
 * Applied when a user has not explicitly configured or saved an appearance preference.
 */
export function getPersonaDefaultAppearance(
  persona: PersonaRouteClass = 'public',
  station?: string | null
): AppearancePreferences {
  switch (persona) {
    case 'operator':
      return {
        theme: 'dark',
        accent: 'ocean',
        density: 'compact',
        radius: 16,
        smoothAnimations: true,
        boldFocusRings: false,
        compactSidebar: false,
      };
    case 'staff_operational':
      return {
        theme: 'dark',
        accent: 'ocean',
        density: 'standard',
        radius: 16,
        smoothAnimations: true,
        boldFocusRings: false,
        compactSidebar: false,
      };
    case 'staff_pos':
      // Station override: e.g. if terminal is configured with a dark station hint (like KDS or dark station)
      const isDarkStation = station === 'kds' || station === 'dark' || station === 'night';
      return {
        theme: isDarkStation ? 'dark' : 'light',
        accent: 'ocean',
        density: 'standard',
        radius: 16,
        smoothAnimations: true,
        boldFocusRings: false,
        compactSidebar: false,
      };
    case 'owner':
      return {
        theme: 'light',
        accent: 'ocean',
        density: 'standard',
        radius: 20,
        smoothAnimations: true,
        boldFocusRings: false,
        compactSidebar: false,
      };
    case 'customer':
      return {
        theme: 'light',
        accent: 'ocean',
        density: 'standard',
        radius: 28,
        smoothAnimations: true,
        boldFocusRings: false,
        compactSidebar: false,
      };
    case 'public':
    default:
      return {
        theme: 'light',
        accent: 'ocean',
        density: 'standard',
        radius: 24,
        smoothAnimations: true,
        boldFocusRings: false,
        compactSidebar: false,
      };
  }
}

export const APPEARANCE_COOKIE = 'orbitox_appearance';

export function parseAppearanceCookie(
  cookieValue?: string | null,
  fallbackPersona: PersonaRouteClass = 'public',
  station?: string | null
): AppearancePreferences {
  const fallback = getPersonaDefaultAppearance(fallbackPersona, station);
  if (!cookieValue) return fallback;
  try {
    const raw = JSON.parse(decodeURIComponent(cookieValue));
    const parsed = AppearanceSchema.safeParse(raw);
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function serializeAppearanceCookie(appearance: AppearancePreferences): string {
  return encodeURIComponent(JSON.stringify(appearance));
}

export function setAppearanceCookie(response: NextResponse, appearance: AppearancePreferences): void {
  response.cookies.set(APPEARANCE_COOKIE, serializeAppearanceCookie(appearance), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // 1 year
  });
}

export async function getOperatorAppearance(operatorId: string): Promise<AppearancePreferences | null> {
  const operator = await prisma.platformOperator.findUnique({
    where: { id: operatorId },
    select: {
      appearanceTheme: true,
      appearanceAccent: true,
      appearanceDensity: true,
      appearanceRadius: true,
      appearanceSmoothAnimations: true,
      appearanceBoldFocusRings: true,
      appearanceCompactSidebar: true,
    },
  });

  if (!operator) return null;

  // Check all seven persisted appearance fields:
  // If user has not configured any explicit preference, return null so cookie/persona fallback runs
  const hasConfiguredPreference =
    operator.appearanceTheme != null ||
    operator.appearanceAccent != null ||
    operator.appearanceDensity != null ||
    operator.appearanceRadius != null ||
    operator.appearanceSmoothAnimations != null ||
    operator.appearanceBoldFocusRings != null ||
    operator.appearanceCompactSidebar != null;

  if (!hasConfiguredPreference) {
    return null;
  }

  const opDefault = getPersonaDefaultAppearance('operator');
  const candidate = {
    theme: operator.appearanceTheme || opDefault.theme,
    accent: operator.appearanceAccent || opDefault.accent,
    density: operator.appearanceDensity || opDefault.density,
    radius: operator.appearanceRadius ?? opDefault.radius,
    smoothAnimations: operator.appearanceSmoothAnimations ?? opDefault.smoothAnimations,
    boldFocusRings: operator.appearanceBoldFocusRings ?? opDefault.boldFocusRings,
    compactSidebar: operator.appearanceCompactSidebar ?? opDefault.compactSidebar,
  };

  const parsed = AppearanceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export async function updateOperatorAppearance(
  operatorId: string,
  input: unknown
): Promise<{ success: true; appearance: AppearancePreferences } | { success: false; error: z.ZodError }> {
  // Enforce schema validation strictly (reject freeform CSS, invalid accents, bad radius)
  const validation = AppearanceSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const data = validation.data;
  await prisma.platformOperator.update({
    where: { id: operatorId },
    data: {
      appearanceTheme: data.theme,
      appearanceAccent: data.accent,
      appearanceDensity: data.density,
      appearanceRadius: data.radius,
      appearanceSmoothAnimations: data.smoothAnimations,
      appearanceBoldFocusRings: data.boldFocusRings,
      appearanceCompactSidebar: data.compactSidebar,
    },
  });

  return { success: true, appearance: data };
}

export async function getCustomerAppearance(userId: string): Promise<AppearancePreferences | null> {
  const user = await prisma.customerUser.findUnique({
    where: { id: userId },
    select: {
      appearanceTheme: true,
      appearanceAccent: true,
      appearanceDensity: true,
      appearanceRadius: true,
      appearanceSmoothAnimations: true,
      appearanceBoldFocusRings: true,
      appearanceCompactSidebar: true,
    },
  });

  if (!user) return null;

  // Check all seven persisted appearance fields:
  // If user has not configured any explicit preference, return null so cookie/persona fallback runs
  const hasConfiguredPreference =
    user.appearanceTheme != null ||
    user.appearanceAccent != null ||
    user.appearanceDensity != null ||
    user.appearanceRadius != null ||
    user.appearanceSmoothAnimations != null ||
    user.appearanceBoldFocusRings != null ||
    user.appearanceCompactSidebar != null;

  if (!hasConfiguredPreference) {
    return null;
  }

  const custDefault = getPersonaDefaultAppearance('customer');
  const candidate = {
    theme: user.appearanceTheme || custDefault.theme,
    accent: user.appearanceAccent || custDefault.accent,
    density: user.appearanceDensity || custDefault.density,
    radius: user.appearanceRadius ?? custDefault.radius,
    smoothAnimations: user.appearanceSmoothAnimations ?? custDefault.smoothAnimations,
    boldFocusRings: user.appearanceBoldFocusRings ?? custDefault.boldFocusRings,
    compactSidebar: user.appearanceCompactSidebar ?? custDefault.compactSidebar,
  };

  const parsed = AppearanceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export async function updateCustomerAppearance(
  userId: string,
  input: unknown
): Promise<{ success: true; appearance: AppearancePreferences } | { success: false; error: z.ZodError }> {
  const validation = AppearanceSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const data = validation.data;
  await prisma.customerUser.update({
    where: { id: userId },
    data: {
      appearanceTheme: data.theme,
      appearanceAccent: data.accent,
      appearanceDensity: data.density,
      appearanceRadius: data.radius,
      appearanceSmoothAnimations: data.smoothAnimations,
      appearanceBoldFocusRings: data.boldFocusRings,
      appearanceCompactSidebar: data.compactSidebar,
    },
  });

  return { success: true, appearance: data };
}

export interface ResolveAppearanceParams {
  operatorToken?: string | null;
  customerToken?: string | null;
  rawAppearanceCookie?: string | null;
  routePersona?: PersonaRouteClass | null;
  stationHint?: string | null;
}

/**
 * Production Appearance Resolution Hierarchy (RootLayout authoritative resolver)
 *
 * Level 1: Authenticated DB stored preference (Operator or Customer User)
 * Level 2: Validated cache cookie (during database outage / unreachable or unconfigured)
 * Level 3: Persona default (with station hint override if present)
 */
export async function resolveInitialAppearance({
  operatorToken,
  customerToken,
  rawAppearanceCookie,
  routePersona = 'public',
  stationHint,
}: ResolveAppearanceParams): Promise<AppearancePreferences> {
  let appearance: AppearancePreferences | null = null;

  if (operatorToken) {
    try {
      const opSession = await getOperatorSession(operatorToken);
      if (opSession?.operatorId) {
        appearance = await getOperatorAppearance(opSession.operatorId);
      }
    } catch {
      // Database timeout / outage during session or appearance query:
      // Degrade gracefully: leave appearance = null so cookie fallback runs!
      appearance = null;
    }
  } else if (customerToken) {
    try {
      const custSession = await getCustomerSession(customerToken);
      if (custSession?.userId) {
        appearance = await getCustomerAppearance(custSession.userId);
      }
    } catch {
      // Database timeout / outage during session or appearance query:
      // Degrade gracefully: leave appearance = null so cookie fallback runs!
      appearance = null;
    }
  }

  // Graceful degradation hierarchy:
  // Level 1: Authenticated DB stored preference (resolved above)
  // Level 2: Validated cache cookie (if DB is unreachable or unconfigured)
  // Level 3: Persona default (with station override if present)
  if (!appearance) {
    appearance = parseAppearanceCookie(rawAppearanceCookie, routePersona || 'public', stationHint);
  }

  return appearance;
}


