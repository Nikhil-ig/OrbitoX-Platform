'use client';

import React from 'react';
import { PlatformProvider } from './components/PlatformContext';
import { PlatformSidebar } from './components/PlatformSidebar';
import { GlobalPlatformBar } from './components/GlobalPlatformBar';
import { ResourceInspectorDrawer } from './components/ResourceInspectorDrawer';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { tokens } from './components/tokens';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformProvider>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: tokens.colors.bg.canvas,
          color: tokens.colors.text.primary,
          fontFamily: tokens.typography.fontFamily.sans,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {/* Left Navigation Rail */}
        <PlatformSidebar />

        {/* Right Main Operational Viewport */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
          {/* Top Context Header */}
          <GlobalPlatformBar />

          {/* Page Content Viewport */}
          <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
            {children}
          </main>
        </div>

        {/* Right-Side Resource Inspector */}
        <ResourceInspectorDrawer />

        {/* Global Command Palette */}
        <CommandPaletteModal />
      </div>
    </PlatformProvider>
  );
}
