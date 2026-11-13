import React from 'react';
import { cookies } from 'next/headers';
import '@orbitox-io/ui/src/styles/theme.css';
import './globals.css';
import { fontInter, fontNotoDevanagari, fontJetBrainsMono } from './fonts';
import { GlobalProviders } from './providers';
import {
  APPEARANCE_COOKIE,
  parseAppearanceCookie,
} from '@/server/appearance/appearance-service';

export const metadata = {
  title: 'OrbitoX Platform OS',
  description: 'The Universal Modular B2B2C SaaS Operating System',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(APPEARANCE_COOKIE)?.value;
  const appearance = parseAppearanceCookie(rawCookie);

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
