import React from 'react';
import '@orbitox/ui/src/styles/theme.css';

export const metadata = {
  title: 'OrbitoX Platform OS',
  description: 'The Universal Modular B2B2C SaaS Operating System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: 'var(--bg-primary, #0b0f19)', color: 'var(--text-primary, #ffffff)' }}>
        {children}
      </body>
    </html>
  );
}
