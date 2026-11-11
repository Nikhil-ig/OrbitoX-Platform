'use client';

import React from 'react';
import { PlatformProvider } from './components/PlatformContext';
import { PlatformSidebar } from './components/PlatformSidebar';
import { GlobalPlatformBar } from './components/GlobalPlatformBar';
import { ResourceInspectorDrawer } from './components/ResourceInspectorDrawer';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import styles from './platform-layout.module.css';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformProvider>
      <div className={styles.container}>
        {/* Left Navigation Rail (collapses to drawer on phones) */}
        <PlatformSidebar />

        {/* Right Main Operational Viewport */}
        <div className={styles.viewport}>
          {/* Top Operational Bar */}
          <GlobalPlatformBar />

          {/* Page Content Viewport */}
          <main className={styles.main}>
            {children}
          </main>
        </div>

        {/* Resource Inspector & Command Palette */}
        <ResourceInspectorDrawer />
        <CommandPaletteModal />
      </div>
    </PlatformProvider>
  );
}
