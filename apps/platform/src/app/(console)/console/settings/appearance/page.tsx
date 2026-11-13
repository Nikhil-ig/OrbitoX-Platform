import * as React from 'react';
import { cookies } from 'next/headers';
import {
  APPEARANCE_COOKIE,
  parseAppearanceCookie,
  DEFAULT_APPEARANCE,
} from '@/server/appearance/appearance-service';
import { AppearanceClient } from './appearance-client';

export const metadata = {
  title: 'Appearance Settings · OrbitoX Console',
  description: 'Manage console theme, accent color, spacing density, and layout rounding.',
};

export default async function AppearanceSettingsPage() {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(APPEARANCE_COOKIE)?.value;
  const initialAppearance = parseAppearanceCookie(rawCookie);

  return (
    <div className="w-full">
      <AppearanceClient initialAppearance={initialAppearance || DEFAULT_APPEARANCE} />
    </div>
  );
}

