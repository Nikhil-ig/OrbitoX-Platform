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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var t = localStorage.getItem('orbitox-theme');
  if (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) t = 'light';
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.setAttribute('data-theme', 'dark');
} catch (e) {}
`,
          }}
        />
      </head>
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

