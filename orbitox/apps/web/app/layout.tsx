import React from 'react';
import '@orbitox/ui/src/styles/theme.css';
import { GlobalProviders } from './providers';

export const metadata = {
  title: 'OrbitoX Platform OS',
  description: 'The Universal Modular B2B2C SaaS Operating System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{ margin: 0, padding: 0, background: 'var(--ui-bg-root, #07080D)', color: 'var(--ui-text-primary, #ffffff)' }}
      >
        <GlobalProviders>
          {children}
        </GlobalProviders>
      </body>
    </html>
  );
}

