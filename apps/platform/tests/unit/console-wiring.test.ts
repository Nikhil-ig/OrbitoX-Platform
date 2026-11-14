import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Stage 7C: Operator Console Wiring & Design Invariants', () => {
  const PLATFORM_SRC = path.resolve(__dirname, '../../src');

  const TARGET_CONSOLE_FILES = [
    'app/(console)/console/components/console-shell.tsx',
    'app/(console)/console/components/console-placeholder.tsx',
    'app/(console)/console/overview/overview-client.tsx',
    'app/(console)/console/tenants/tenants-index-client.tsx',
    'app/(console)/console/tenants/[id]/tenant-detail-client.tsx',
    'app/(console)/console/organizations/page.tsx',
    'app/(console)/console/provisioning/page.tsx',
    'app/(console)/console/billing/page.tsx',
    'app/(console)/console/data-rights/page.tsx',
    'app/(console)/console/security/page.tsx',
    'app/(console)/console/audit/page.tsx',
  ];

  it('1. Zero Dead Links: Every sidebar link maps to a physical page route file', () => {
    const shellPath = path.join(PLATFORM_SRC, 'app/(console)/console/components/console-shell.tsx');
    const shellContent = fs.readFileSync(shellPath, 'utf8');

    // Extract all hrefs from navItems and pluginNavItems in console-shell.tsx
    const hrefMatches: string[] = [
      ...shellContent.matchAll(/href:\s*['"]([^'"]+)['"]/g),
    ]
      .map((m) => m[1] || '')
      .filter(Boolean);
    assert.ok(hrefMatches.length >= 10, 'Expected at least 10 navigation destinations in console-shell.tsx');

    // Expected required destinations per Stage 7C wiring brief
    const requiredHrefs = [
      '/console/overview',
      '/console/organizations',
      '/console/tenants',
      '/console/provisioning',
      '/console/billing',
      '/console/data-rights',
      '/console/security',
      '/console/audit',
      '/console/settings/appearance',
      '/console/design-system',
      '/admin',
      '/platform',
    ];

    for (const href of requiredHrefs) {
      assert.ok(
        hrefMatches.includes(href),
        `Missing required sidebar link ${href} in console-shell.tsx`,
      );
    }

    // Verify each link maps to an existing Next.js page.tsx file
    for (const href of hrefMatches) {
      // Resolve URL route to Next.js route group candidates
      const segments = href.replace(/^\//, '').split('/');
      const candidates = [
        path.join(PLATFORM_SRC, 'app', '(console)', ...segments, 'page.tsx'),
        path.join(PLATFORM_SRC, 'app', '(hospital)', ...segments, 'page.tsx'),
        path.join(PLATFORM_SRC, 'app', ...segments, 'page.tsx'),
      ];

      const exists = candidates.some((candidate) => fs.existsSync(candidate));
      assert.ok(
        exists,
        `Sidebar link destination ${href} does NOT exist on disk! Checked: ${candidates.join(', ')}`,
      );
    }
  });

  it('2. Design Invariants: Zero inline styles across modified console components', () => {
    for (const relPath of TARGET_CONSOLE_FILES) {
      const fullPath = path.join(PLATFORM_SRC, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');

      const inlineStyleMatch = content.match(/style\s*=\s*\{\{/);
      assert.equal(
        inlineStyleMatch,
        null,
        `Found forbidden inline style in ${relPath}. Design invariant requires zero inline styles.`,
      );
    }
  });

  it('3. Design Invariants: Zero hex codes in modified console components', () => {
    for (const relPath of TARGET_CONSOLE_FILES) {
      const fullPath = path.join(PLATFORM_SRC, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');

      // Match hex colors like #fff, #FFFFFF, #1e293b, etc. (excluding HTML comments/hashes)
      const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      assert.deepEqual(
        hexMatches,
        [],
        `Found forbidden hex color code(s) in ${relPath}: ${hexMatches.join(', ')}. Use semantic design tokens.`,
      );
    }
  });

  it('4. Design Invariants: Zero dangerouslySetInnerHTML in modified console components', () => {
    for (const relPath of TARGET_CONSOLE_FILES) {
      const fullPath = path.join(PLATFORM_SRC, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');

      const dangerousMatch = content.match(/dangerouslySetInnerHTML/);
      assert.equal(
        dangerousMatch,
        null,
        `Found forbidden dangerouslySetInnerHTML in ${relPath}.`,
      );
    }
  });

  it('5. Tenant Detail Cross-Links and Breadcrumbs verified', () => {
    const detailClientPath = path.join(PLATFORM_SRC, 'app/(console)/console/tenants/[id]/tenant-detail-client.tsx');
    const content = fs.readFileSync(detailClientPath, 'utf8');

    // Breadcrumb: Overview / Tenants / [name]
    assert.ok(content.includes('href="/console/overview"'), 'Tenant detail missing breadcrumb link to /console/overview');
    assert.ok(content.includes('href="/console/tenants"'), 'Tenant detail missing breadcrumb link to /console/tenants');

    // Organization cross-link
    assert.ok(content.includes('/console/organizations?org='), 'Tenant detail missing Organization cross-link');

    // Provisioning job cross-link
    assert.ok(content.includes('/console/provisioning?tenant='), 'Tenant detail missing Provisioning job cross-link');

    // Billing cross-link
    assert.ok(content.includes('/console/billing?tenant='), 'Tenant detail missing Billing cross-link');

    // Audit log cross-link
    assert.ok(content.includes('/console/audit?entity=TENANT:'), 'Tenant detail missing Audit log cross-link');

    // Disabled action: Change plan
    assert.ok(content.includes('needs C1 API'), 'Change plan button missing "needs C1 API" label/title');
  });

  it('6. Overview Cross-Links verified', () => {
    const overviewClientPath = path.join(PLATFORM_SRC, 'app/(console)/console/overview/overview-client.tsx');
    const content = fs.readFileSync(overviewClientPath, 'utf8');

    assert.ok(content.includes('href="/console/tenants"'), 'Overview missing link to /console/tenants');
    assert.ok(content.includes('href="/console/audit"'), 'Overview missing link to /console/audit');
    assert.ok(content.includes('href="/console/provisioning?status=FAILED"'), 'Overview missing link to /console/provisioning');
  });

  it('7. Placeholder Pages contain Stage names and "Back to Overview" link', () => {
    const placeholderFiles = [
      'app/(console)/console/organizations/page.tsx',
      'app/(console)/console/provisioning/page.tsx',
      'app/(console)/console/billing/page.tsx',
      'app/(console)/console/data-rights/page.tsx',
      'app/(console)/console/security/page.tsx',
      'app/(console)/console/audit/page.tsx',
    ];

    for (const relPath of placeholderFiles) {
      const fullPath = path.join(PLATFORM_SRC, relPath);
      assert.ok(fs.existsSync(fullPath), `Placeholder page ${relPath} does not exist`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(content.includes('ConsolePlaceholder'), `${relPath} does not use ConsolePlaceholder`);
      assert.ok(content.includes('stageBadge='), `${relPath} missing stageBadge`);
      assert.ok(content.includes('stageName='), `${relPath} missing stageName`);
    }

    const placeholderComponent = fs.readFileSync(
      path.join(PLATFORM_SRC, 'app/(console)/console/components/console-placeholder.tsx'),
      'utf8',
    );
    assert.ok(
      placeholderComponent.includes('href="/console/overview"'),
      'ConsolePlaceholder must include link back to /console/overview',
    );
    assert.ok(
      placeholderComponent.includes('Back to Overview'),
      'ConsolePlaceholder must include "Back to Overview" button label',
    );
  });
});

