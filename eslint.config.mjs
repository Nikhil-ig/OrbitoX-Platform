import orbitoxEslint from '@orbitox-io/eslint-config';

const { tsParser, tsPlugin, prettierConfig } = orbitoxEslint;

/**
 * Legacy TSX files that still contain inline `style={}` attributes prior to Stages 7B-7F.
 * Do NOT add new files to this list; Stages 7B-7F will drain this list to empty.
 */
const LEGACY_INLINE_STYLE_ALLOWLIST = [
  'apps/platform/src/app/(console)/admin/audit/page.tsx',
  'apps/platform/src/app/(console)/admin/business/[category]/[providerId]/page.tsx',
  'apps/platform/src/app/(console)/admin/business/[category]/page.tsx',
  'apps/platform/src/app/(console)/admin/business/page.tsx',
  'apps/platform/src/app/(console)/admin/components/activity-pill-row.tsx',
  'apps/platform/src/app/(console)/admin/components/admin-sidebar.tsx',
  'apps/platform/src/app/(console)/admin/components/api-key-modal.tsx',
  'apps/platform/src/app/(console)/admin/components/command-palette.tsx',
  'apps/platform/src/app/(console)/admin/components/donut-gauge.tsx',
  'apps/platform/src/app/(console)/admin/components/glow-spline-chart.tsx',
  'apps/platform/src/app/(console)/admin/components/neon-bar-chart.tsx',
  'apps/platform/src/app/(console)/admin/components/onboard-provider-modal.tsx',
  'apps/platform/src/app/(console)/admin/components/project-provision-modal.tsx',
  'apps/platform/src/app/(console)/admin/components/provider-card.tsx',
  'apps/platform/src/app/(console)/admin/components/quota-bar.tsx',
  'apps/platform/src/app/(console)/admin/components/service-card.tsx',
  'apps/platform/src/app/(console)/admin/components/sleek-slider.tsx',
  'apps/platform/src/app/(console)/admin/data/admin-context.tsx',
  'apps/platform/src/app/(console)/admin/developer-apis/page.tsx',
  'apps/platform/src/app/(console)/admin/layout.tsx',
  'apps/platform/src/app/(console)/admin/marketplace/page.tsx',
  'apps/platform/src/app/(console)/admin/projects/create/page.tsx',
  'apps/platform/src/app/(console)/admin/quotas/page.tsx',
  'apps/platform/src/app/(console)/admin/restaurant/page.tsx',
  'apps/platform/src/app/(console)/admin/services/[serviceId]/page.tsx',
  'apps/platform/src/app/(console)/admin/services/page.tsx',
  'apps/platform/src/app/(console)/platform/ai/page.tsx',
  'apps/platform/src/app/(console)/platform/api-keys/page.tsx',
  'apps/platform/src/app/(console)/platform/approvals/page.tsx',
  'apps/platform/src/app/(console)/platform/audit/page.tsx',
  'apps/platform/src/app/(console)/platform/components/CommandPaletteModal.tsx',
  'apps/platform/src/app/(console)/platform/components/ImpactPreviewModal.tsx',
  'apps/platform/src/app/(console)/platform/components/PlatformSidebar.tsx',
  'apps/platform/src/app/(console)/platform/components/ResourceInspectorDrawer.tsx',
  'apps/platform/src/app/(console)/platform/components/UniversalResourceEditor.tsx',
  'apps/platform/src/app/(console)/platform/configuration/page.tsx',
  'apps/platform/src/app/(console)/platform/connect/page.tsx',
  'apps/platform/src/app/(console)/platform/credentials/page.tsx',
  'apps/platform/src/app/(console)/platform/explorer/page.tsx',
  'apps/platform/src/app/(console)/platform/fleet/page.tsx',
  'apps/platform/src/app/(console)/platform/login/page.tsx',
  'apps/platform/src/app/(console)/platform/observability/page.tsx',
  'apps/platform/src/app/(console)/platform/operations/page.tsx',
  'apps/platform/src/app/(console)/platform/packages/page.tsx',
  'apps/platform/src/app/(console)/platform/page.tsx',
  'apps/platform/src/app/(console)/platform/plans/page.tsx',
  'apps/platform/src/app/(console)/platform/projects/[projectId]/page.tsx',
  'apps/platform/src/app/(console)/platform/restaurants/[id]/page.tsx',
  'apps/platform/src/app/(console)/platform/restaurants/page.tsx',
  'apps/platform/src/app/(console)/platform/security/page.tsx',
  'apps/platform/src/app/(console)/platform/settings/page.tsx',
  'apps/platform/src/app/(console)/platform/tenants/new/page.tsx',
  'apps/platform/src/app/(console)/platform/tenants/page.tsx',
  'apps/platform/src/app/(console)/platform/tests/page.tsx',
  'apps/platform/src/app/(dashboard)/layout.tsx',
  'apps/platform/src/app/(dashboard)/page.tsx',
  'apps/platform/src/app/(hospital)/hms/appointments/page.tsx',
  'apps/platform/src/app/(hospital)/hms/beds/page.tsx',
  'apps/platform/src/app/(hospital)/hms/billing/page.tsx',
  'apps/platform/src/app/(hospital)/hms/components/HospitalNavLayout.tsx',
  'apps/platform/src/app/(hospital)/hms/hierarchy/page.tsx',
  'apps/platform/src/app/(hospital)/hms/labs/page.tsx',
  'apps/platform/src/app/(hospital)/hms/login/page.tsx',
  'apps/platform/src/app/(hospital)/hms/page.tsx',
  'apps/platform/src/app/(hospital)/hms/patients/page.tsx',
  'apps/platform/src/app/(hospital)/hms/pharmacy/page.tsx',
  'apps/platform/src/app/(hospital)/hms/profile/page.tsx',
  'apps/platform/src/app/(hospital)/hms/staff/page.tsx',
  'apps/platform/src/app/(hospital)/hms/telemetry/page.tsx',
  'apps/platform/src/app/components/platform-governance-dock.tsx',
  'apps/platform/src/app/(restaurant-legacy)/dine/[locator]/page.tsx',
  'apps/platform/src/app/(restaurant-legacy)/kds/page.tsx',
  'apps/platform/src/app/layout.tsx',
  'apps/platform/src/components/plugin-coming-soon.tsx',
  'packages/ui/src/components/badge.tsx',
  'packages/ui/src/components/button.tsx',
  'packages/ui/src/components/card.tsx',
  'packages/ui/src/components/glass-card.tsx',
  'packages/ui/src/components/modern-tabs.tsx',
  'packages/ui/src/components/neon-badge.tsx',
  'packages/ui/src/components/stat-metric-widget.tsx',
  'packages/ui/src/components/studio-button.tsx',
  'packages/ui/src/dynamic/dynamic-copilot.tsx',
  'packages/ui/src/dynamic/dynamic-dashboard.tsx',
  'packages/ui/src/dynamic/dynamic-marketplace.tsx',
  'packages/ui/src/dynamic/dynamic-sidebar.tsx',
  'packages/ui/src/dynamic/dynamic-workflow-builder.tsx',
];

const PLATFORM_APP_BOUNDARY_PATTERNS = [
  {
    group: ['services/**', '**/services/restaurant-api/**', '@/services/**'],
    message: 'apps/* must communicate with services/* via bridge/HTTP contracts, never direct imports.',
  },
  {
    group: ['**/plugins/*/src/**', '@orbitox-io/pos/src/**', '@orbitox-io/external-project-engine/src/**'],
    message: 'Import plugins only through their published package contract entrypoint.',
  },
];

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/generated/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/.turbo/**',
      'apps/platform/next-env.d.ts',
    ],
  },
  prettierConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      'no-var': 'warn',
      'prefer-const': 'warn',
    },
  },
  // Guardrail: No inline `style={}` props in new JSX/TSX code
  {
    files: ['**/*.{tsx,jsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            'Inline style={} props are forbidden in new code. Use design system components, Tailwind tokens, or CSS classes.',
        },
      ],
    },
  },
  {
    // Escape Next.js route-group parentheses `(group)` and dynamic `[param]` brackets for minimatch
    files: LEGACY_INLINE_STYLE_ALLOWLIST.map((p) => p.replace(/([()[\]])/g, '\\$1')),
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  // Boundary 1: Apps cannot import services, and services cannot import apps
  {
    files: ['apps/**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: PLATFORM_APP_BOUNDARY_PATTERNS },
      ],
    },
  },
  {
    files: ['services/**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', '**/apps/platform/**'],
              message: 'services/* are independent deployables and must never import apps/*. They talk over HTTP through @orbitox-io/bridge.',
            },
            {
              group: ['**/plugins/*/src/**', '@orbitox-io/pos/src/**', '@orbitox-io/external-project-engine/src/**'],
              message: 'Import plugins only through their published package contract entrypoint.',
            },
          ],
        },
      ],
    },
  },
  // Boundary 2: Surface route groups inside apps/platform/src/app remain decoupled
  {
    files: ['apps/platform/src/app/(hospital)/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            ...PLATFORM_APP_BOUNDARY_PATTERNS,
            {
              group: ['@/app/(console)*', '@/app/(console)/**', '**/(console)/**', '@/app/(dashboard)*', '@/app/(dashboard)/**', '**/(dashboard)/**'],
              message: '(hospital) route group must not import from (console) or (dashboard). Move shared helpers to apps/platform/src/server or components.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/platform/src/app/(console)/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            ...PLATFORM_APP_BOUNDARY_PATTERNS,
            {
              group: ['@/app/(hospital)*', '@/app/(hospital)/**', '**/(hospital)/**', '@/app/(dashboard)*', '@/app/(dashboard)/**', '**/(dashboard)/**'],
              message: '(console) route group must not import from (hospital) or (dashboard). Move shared helpers to apps/platform/src/server or components.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/platform/src/app/(dashboard)/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            ...PLATFORM_APP_BOUNDARY_PATTERNS,
            {
              group: ['@/app/(console)*', '@/app/(console)/**', '**/(console)/**', '@/app/(hospital)*', '@/app/(hospital)/**', '**/(hospital)/**'],
              message: '(dashboard) route group must not import from (console) or (hospital). Move shared helpers to apps/platform/src/server or components.',
            },
          ],
        },
      ],
    },
  },
  // Boundary 3: Plugins talk only through package contracts (no app imports, no deep package internals)
  {
    files: ['plugins/**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['apps/**', '**/apps/**', 'services/**', '**/services/restaurant-api/**'],
              message: 'Plugins must never import application or deployable service code.',
            },
            {
              group: ['**/packages/*/src/**', '@orbitox-io/*/src/**', '**/plugins/*/src/**'],
              message: 'Plugins must import packages and sibling contracts via their public package entrypoints.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/**/*.{ts,tsx,js}', 'tools/**/*.{ts,tsx,js}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['apps/**', '**/apps/**', 'services/**', '**/services/restaurant-api/**'],
              message: 'Packages and CLI tools must not import application or deployable service modules.',
            },
            {
              group: ['**/plugins/*/src/**', '@orbitox-io/pos/src/**', '@orbitox-io/external-project-engine/src/**'],
              message: 'Packages must depend on plugin contracts, never deep plugin source paths.',
            },
          ],
        },
      ],
    },
  },
  // Boundary 4: Design system (packages/ui) must remain free of data fetching and backend access
  {
    files: ['packages/ui/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'packages/ui must remain pure UI with zero network/data fetching.' },
        { name: 'XMLHttpRequest', message: 'packages/ui must remain pure UI with zero XMLHttpRequest usage.' },
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@orbitox-io/core', message: 'packages/ui must not depend on @orbitox-io/core.' },
            { name: '@orbitox-io/bridge', message: 'packages/ui must not depend on @orbitox-io/bridge.' },
            { name: '@orbitox-io/runtime', message: 'packages/ui must not depend on @orbitox-io/runtime.' },
            { name: '@orbitox-io/plugin-engine', message: 'packages/ui must not depend on @orbitox-io/plugin-engine.' },
            { name: '@orbitox-io/external-runtime-sdk', message: 'packages/ui must not depend on @orbitox-io/external-runtime-sdk.' },
            { name: '@orbitox-io/pos', message: 'packages/ui must not depend on @orbitox-io/pos.' },
            { name: '@orbitox-io/external-project-engine', message: 'packages/ui must not depend on @orbitox-io/external-project-engine.' },
            {
              name: '@orbitox-io/sdk',
              allowTypeImports: true,
              message: 'packages/ui may only import pure TypeScript types from @orbitox-io/sdk.',
            },
            { name: '@prisma/client', message: 'packages/ui must not access databases.' },
            { name: 'prisma', message: 'packages/ui must not access databases.' },
            { name: 'pg', message: 'packages/ui must not access databases.' },
            { name: 'ioredis', message: 'packages/ui must not access Redis.' },
            { name: 'bullmq', message: 'packages/ui must not access job queues.' },
            { name: 'axios', message: 'packages/ui must not make HTTP requests.' },
            { name: 'fs', message: 'packages/ui must not access filesystem APIs.' },
            { name: 'node:fs', message: 'packages/ui must not access filesystem APIs.' },
            { name: 'http', message: 'packages/ui must not use Node HTTP APIs.' },
            { name: 'https', message: 'packages/ui must not use Node HTTPS APIs.' },
            { name: 'node:http', message: 'packages/ui must not use Node HTTP APIs.' },
            { name: 'node:https', message: 'packages/ui must not use Node HTTPS APIs.' },
          ],
          patterns: [
            { group: ['apps/**', '**/apps/**', 'services/**', '**/services/restaurant-api/**', '**/plugins/**', '@aws-sdk/*', 'node:*'], message: 'packages/ui must have zero backend/app/service/AWS dependencies.' },
          ],
        },
      ],
    },
  },
];
