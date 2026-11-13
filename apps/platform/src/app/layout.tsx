import React from 'react';
import { cookies } from 'next/headers';
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
      // Ignore database / session errors
    }
  } else if (customerToken) {
    try {
      const custSession = await getCustomerSession(customerToken);
      if (custSession?.userId) {
        appearance = await getCustomerAppearance(custSession.userId);
      }
    } catch {
      // Ignore database / session errors
    }
  }

  if (!appearance) {
    const rawCookie = cookieStore.get(APPEARANCE_COOKIE)?.value;
    appearance = parseAppearanceCookie(rawCookie);
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
