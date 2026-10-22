import React from 'react';
import './globals.css';
import { AppShell } from '../components/layout/AppShell';

export const metadata = {
  title: 'OrbitoX Celebrations — Digital Invitations & Celebration Experience Platform',
  description:
    'Design breathtaking, interactive digital invitations, RSVP portals, photo timelines, and celebration experiences for Weddings, Birthdays, Anniversaries, and Milestones.',
  keywords: [
    'Digital Invitations',
    'Wedding Invitations',
    'Online RSVP',
    'Celebration Platform',
    'Event Website Builder',
    'Indian Wedding Invites',
    'Interactive Guestbook',
  ],
};

import { EcosystemProvider } from '../lib/ecosystem-context';
import { RoleSwitcherDock } from '../components/layout/RoleSwitcherDock';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EcosystemProvider>
          <AppShell>{children}</AppShell>
          <RoleSwitcherDock />
        </EcosystemProvider>
      </body>
    </html>
  );
}
