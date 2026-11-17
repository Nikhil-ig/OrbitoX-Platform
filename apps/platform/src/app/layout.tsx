import React from 'react';
import { headers, cookies } from 'next/headers';
import '@orbitox-io/ui/src/styles/theme.css';
import './globals.css';
import { fontInter, fontNotoDevanagari, fontJetBrainsMono } from './fonts';
import { GlobalProviders } from './providers';
import {
  APPEARANCE_COOKIE,
  parseAppearanceCookie,
  getOperatorAppearance,
  getCustomerAppearance,
  type AppearancePreferences,
  type PersonaRouteClass,
} from '@/server/appearance/appearance-service';
import {
  OPERATOR_SESSION_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  getOperatorSession,
  getCustomerSession,
} from '@/server/accounts/account-service';

export const metadata = {
  title: 'OrbitoX Platform OS',
  description: 'The Universal Modular B2B2C SaaS Operating System',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const routePersona = (headersList.get('x-orbito-route-persona') as PersonaRouteClass) || 'public';
  const stationHint = headersList.get('x-orbito-station');
  const cookieStore = await cookies();
  const operatorToken = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value;
  const customerToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  let appearance: AppearancePreferences | null = null;

  if (operatorToken) {
    try {
      const opSession = await getOperatorSession(operatorToken);
      if (opSession?.operatorId) {
        appearance = await getOperatorAppearance(opSession.operatorId);
      }
    } catch {
      // Database timeout / error during session or appearance query:
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
      // Database timeout / error during session or appearance query:
      // Degrade gracefully: leave appearance = null so cookie fallback runs!
      appearance = null;
    }
  }

  // Graceful degradation hierarchy:
  // Level 1: Authenticated DB stored preference (resolved above)
  // Level 2: Validated cache cookie (if DB is unreachable or unconfigured)
  // Level 3: Persona default (with station override if present)
  if (!appearance) {
    const rawCookie = cookieStore.get(APPEARANCE_COOKIE)?.value;
    appearance = parseAppearanceCookie(rawCookie, routePersona, stationHint);
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontInter.variable} ${fontNotoDevanagari.variable} ${fontJetBrainsMono.variable}`}
      data-theme={appearance.theme}
      data-accent={appearance.accent}
      data-density={appearance.density}
      data-radius={appearance.radius}
      data-motion={appearance.smoothAnimations ? 'smooth' : 'reduced'}
      data-focus={appearance.boldFocusRings ? 'bold' : 'default'}
      data-sidebar={appearance.compactSidebar ? 'compact' : 'default'}
    >
      <body
        suppressHydrationWarning
        className="m-0 p-0 bg-[var(--color-bg)] text-[var(--color-text)] font-sans antialiased min-h-screen selection:bg-[var(--color-primary)] selection:text-[var(--color-primary-fg)]"
      >
        <GlobalProviders>
          {children}
        </GlobalProviders>
      </body>
    </html>
  );
}
