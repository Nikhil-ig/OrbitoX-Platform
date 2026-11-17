import './dom-setup';
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

import { GlobalProviders } from '@/app/providers';
import ConsoleGroupLayout from '@/app/(console)/layout';
import AdminLayout from '@/app/(console)/admin/layout';
import PlatformLayout from '@/app/(dashboard)/layout';
import { useAdmin } from '@/app/(console)/admin/data/admin-context';
import { useTheme } from '@orbitox-io/ui';

describe('Layer 3: Provider Ownership & Legacy Migration (TST-CMP-01..04, 07)', () => {
  afterEach(() => {
    cleanup();
  });
  it('TST-CMP-02: GlobalProviders at root decouples Theme and Admin contexts', () => {
    // 1. Verify AST / file contents of providers.tsx has only ToastProvider
    const providersPath = path.resolve(__dirname, '../../src/app/providers.tsx');
    const content = fs.readFileSync(providersPath, 'utf8');

    assert.ok(!content.includes('ThemeProvider'), 'GlobalProviders must not import or render ThemeProvider');
    assert.ok(!content.includes('AdminProvider'), 'GlobalProviders must not import or render AdminProvider');
    assert.ok(content.includes('ToastProvider'), 'GlobalProviders must contain ToastProvider');

    // 2. Test runtime rendering of GlobalProviders:
    // Without ThemeProvider, no dynamic <style> tag is injected into container
    const { container } = render(
      <GlobalProviders>
        <div data-testid="test-child">Child element</div>
      </GlobalProviders>
    );

    const styleTags = container.querySelectorAll('style');
    assert.equal(
      styleTags.length,
      0,
      'GlobalProviders must not inject legacy ThemeProvider dynamic style tags'
    );
  });

  it('TST-CMP-01 & TST-CMP-07: PlatformLayout in (dashboard) locally mounts both ThemeProvider and AdminProvider', () => {
    let capturedTheme: any = null;
    let capturedAdmin: any = null;

    function TestChild() {
      capturedTheme = useTheme();
      capturedAdmin = useAdmin();
      return <div data-testid="dashboard-test-child">Dashboard content</div>;
    }

    render(
      <PlatformLayout>
        <TestChild />
      </PlatformLayout>
    );

    // ThemeProvider is locally preserved
    assert.ok(capturedTheme, 'useTheme must resolve inside PlatformLayout');
    assert.ok(Array.isArray(capturedTheme.allThemes), 'allThemes array must be available');
    assert.ok(typeof capturedTheme.setThemeById === 'function', 'setThemeById function must be available');

    // AdminProvider is locally preserved (for PlatformGovernanceDock)
    assert.ok(capturedAdmin, 'useAdmin must resolve inside PlatformLayout for PlatformGovernanceDock');
    assert.ok(Array.isArray(capturedAdmin.services), 'services must be provided by AdminContext');
    assert.ok(typeof capturedAdmin.updateServiceQuota === 'function', 'updateServiceQuota must be available');
  });

  it('TST-CMP-03: Console layout hierarchy isolates AdminProvider to (console)/admin', () => {
    // Check that (console)/layout.tsx is a clean passthrough
    const consoleLayoutPath = path.resolve(__dirname, '../../src/app/(console)/layout.tsx');
    const consoleContent = fs.readFileSync(consoleLayoutPath, 'utf8');
    assert.ok(
      !consoleContent.includes('AdminProvider'),
      '(console)/layout.tsx must not wrap AdminProvider to prevent mock state leaking into modern console routes'
    );

    // Check that (console)/admin/layout.tsx wraps AdminProvider
    const adminLayoutPath = path.resolve(__dirname, '../../src/app/(console)/admin/layout.tsx');
    const adminContent = fs.readFileSync(adminLayoutPath, 'utf8');
    assert.ok(
      adminContent.includes('AdminProvider'),
      '(console)/admin/layout.tsx must provide AdminProvider for legacy admin pages'
    );

    // Render AdminLayout and verify useAdmin resolves
    let adminContextValue: any = null;
    function AdminChild() {
      adminContextValue = useAdmin();
      return <div>Admin child</div>;
    }

    render(
      <AdminLayout>
        <AdminChild />
      </AdminLayout>
    );

    assert.ok(adminContextValue, 'useAdmin must resolve within AdminLayout');
    assert.ok(
      typeof adminContextValue.providers === 'object' && adminContextValue.providers !== null,
      'providers dictionary must be available in AdminContext'
    );
  });

  it('TST-CMP-04: Legacy --ui-* variables are bridged to canonical semantic tokens in theme.css', () => {
    const themeCssPath = path.resolve(__dirname, '../../../../packages/ui/src/styles/theme.css');
    const themeCss = fs.readFileSync(themeCssPath, 'utf8');

    assert.ok(
      themeCss.includes('--ui-bg-card: var(--color-surface);'),
      '--ui-bg-card must bridge to var(--color-surface)'
    );
    assert.ok(
      themeCss.includes('--ui-bg-root: var(--color-bg);'),
      '--ui-bg-root must bridge to var(--color-bg)'
    );
    assert.ok(
      themeCss.includes('--ui-text-primary: var(--color-text);'),
      '--ui-text-primary must bridge to var(--color-text)'
    );
    assert.ok(
      themeCss.includes('--ui-accent-primary: var(--color-accent);'),
      '--ui-accent-primary must bridge to var(--color-accent)'
    );
    assert.ok(
      themeCss.includes('--ui-border-default: var(--color-border);'),
      '--ui-border-default must bridge to var(--color-border)'
    );
  });
});
