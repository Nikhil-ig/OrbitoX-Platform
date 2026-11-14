import 'server-only';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

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

export const APPEARANCE_COOKIE = 'orbitox_appearance';

export function parseAppearanceCookie(cookieValue?: string | null): AppearancePreferences {
  if (!cookieValue) return DEFAULT_APPEARANCE;
  try {
    const raw = JSON.parse(decodeURIComponent(cookieValue));
    const parsed = AppearanceSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
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

export async function getOperatorAppearance(operatorId: string): Promise<AppearancePreferences> {
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

  if (!operator) return DEFAULT_APPEARANCE;

  const candidate = {
    theme: operator.appearanceTheme || DEFAULT_APPEARANCE.theme,
    accent: operator.appearanceAccent || DEFAULT_APPEARANCE.accent,
    density: operator.appearanceDensity || DEFAULT_APPEARANCE.density,
    radius: operator.appearanceRadius ?? DEFAULT_APPEARANCE.radius,
    smoothAnimations: operator.appearanceSmoothAnimations ?? DEFAULT_APPEARANCE.smoothAnimations,
    boldFocusRings: operator.appearanceBoldFocusRings ?? DEFAULT_APPEARANCE.boldFocusRings,
    compactSidebar: operator.appearanceCompactSidebar ?? DEFAULT_APPEARANCE.compactSidebar,
  };

  const parsed = AppearanceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : DEFAULT_APPEARANCE;
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

export async function getCustomerAppearance(userId: string): Promise<AppearancePreferences> {
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

  if (!user) return DEFAULT_APPEARANCE;

  const candidate = {
    theme: user.appearanceTheme || DEFAULT_APPEARANCE.theme,
    accent: user.appearanceAccent || DEFAULT_APPEARANCE.accent,
    density: user.appearanceDensity || DEFAULT_APPEARANCE.density,
    radius: user.appearanceRadius ?? DEFAULT_APPEARANCE.radius,
    smoothAnimations: user.appearanceSmoothAnimations ?? DEFAULT_APPEARANCE.smoothAnimations,
    boldFocusRings: user.appearanceBoldFocusRings ?? DEFAULT_APPEARANCE.boldFocusRings,
    compactSidebar: user.appearanceCompactSidebar ?? DEFAULT_APPEARANCE.compactSidebar,
  };

  const parsed = AppearanceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : DEFAULT_APPEARANCE;
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

