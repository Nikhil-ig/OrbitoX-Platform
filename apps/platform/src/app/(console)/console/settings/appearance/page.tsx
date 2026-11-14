import * as React from 'react';
import { cookies } from 'next/headers';
import {
  APPEARANCE_COOKIE,
  parseAppearanceCookie,
  getOperatorAppearance,
  DEFAULT_APPEARANCE,
  type AppearancePreferences,
} from '@/server/appearance/appearance-service';
import {
  OPERATOR_SESSION_COOKIE,
  getOperatorSession,
  type OperatorSessionContext,
} from '@/server/accounts/account-service';
import { ConsoleShell } from '../../components/console-shell';
import { AppearanceClient } from './appearance-client';

export const metadata = {
  title: 'Appearance Settings · OrbitoX Console',
  description: 'Manage console theme, accent color, spacing density, and layout rounding.',
};

export default async function AppearanceSettingsPage() {
  const cookieStore = await cookies();
  const operatorToken = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value;

  let initialAppearance: AppearancePreferences | null = null;
  let opSession: OperatorSessionContext | null = null;
  if (operatorToken) {
    try {
      opSession = await getOperatorSession(operatorToken);
      if (opSession?.operatorId) {
        initialAppearance = await getOperatorAppearance(opSession.operatorId);
      }
    } catch {
      // Fallback
    }
  }

  if (!initialAppearance) {
    const rawCookie = cookieStore.get(APPEARANCE_COOKIE)?.value;
    initialAppearance = parseAppearanceCookie(rawCookie);
  }

  return (
    <ConsoleShell
      activeId="appearance"
      operatorEmail={opSession?.email || 'operator@orbitox.io'}
      operatorRole={opSession?.role || 'PLATFORM_OWNER'}
    >
      <div className="w-full">
        <AppearanceClient initialAppearance={initialAppearance || DEFAULT_APPEARANCE} />
      </div>
    </ConsoleShell>
  );
}

