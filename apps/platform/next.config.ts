import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDir, "../../");

const nextConfig: NextConfig = {
  // Self-contained server bundle: `node apps/platform/server.js` runs without a full
  // node_modules tree, which keeps the production Docker image small.
  output: "standalone",
  // The app lives inside a pnpm monorepo, so file tracing must start at the workspace root.
  outputFileTracingRoot: workspaceRoot,
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
  transpilePackages: [
    "@orbitox-io/ui",
    "@orbitox-io/sdk",
    "@orbitox-io/types",
    "@orbitox-io/utils",
    "@orbitox-io/runtime",
    "@orbitox-io/plugin-engine",
    "@orbitox-io/pos",
  ],
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
  async redirects() {
    return [
      // Legacy Admin Console Routes (14 Merge destinations)
      { source: '/admin', destination: '/console/overview', statusCode: 301 },
      { source: '/admin/api-keys', destination: '/console/security', statusCode: 301 },
      { source: '/admin/audit', destination: '/console/audit', statusCode: 301 },
      { source: '/admin/business', destination: '/console/tenants', statusCode: 301 },
      { source: '/admin/business/:category', destination: '/console/tenants', statusCode: 301 },
      { source: '/admin/business/:category/:providerId', destination: '/console/tenants', statusCode: 301 },
      { source: '/admin/developer-apis', destination: '/console/security', statusCode: 301 },
      // Note: /admin/marketplace is HELD (retained at /admin/marketplace until C2/C3 ready)
      { source: '/admin/projects/create', destination: '/console/provisioning', statusCode: 301 },
      { source: '/admin/projects', destination: '/console/tenants', statusCode: 301 },
      { source: '/admin/projects/:projectId', destination: '/console/tenants/:projectId', statusCode: 301 },
      { source: '/admin/quotas', destination: '/console/tenants', statusCode: 301 },
      // Note: /admin/restaurant is HELD (retained at /admin/restaurant until C2 ready)
      { source: '/admin/services', destination: '/console/overview', statusCode: 301 },
      { source: '/admin/services/:serviceId', destination: '/console/overview', statusCode: 301 },
      { source: '/admin/system', destination: '/console/settings/appearance', statusCode: 301 },

      // Legacy Platform Management Console Routes (12 Merge + 7 Migrate + 3 Drop)
      { source: '/platform', destination: '/console/overview', statusCode: 301 },
      // Note: /platform/ai is HELD (retained at /platform/ai until Stage 7G)
      { source: '/platform/api-keys', destination: '/console/security', statusCode: 301 },
      { source: '/platform/approvals', destination: '/console/provisioning', statusCode: 301 },
      { source: '/platform/audit', destination: '/console/audit', statusCode: 301 },
      { source: '/platform/configuration', destination: '/console/settings/appearance', statusCode: 301 },
      { source: '/platform/connect', destination: '/console/security', statusCode: 301 },
      { source: '/platform/credentials', destination: '/console/security', statusCode: 301 },
      { source: '/platform/explorer', destination: '/console/overview', statusCode: 301 },
      { source: '/platform/fleet', destination: '/console/overview', statusCode: 301 },
      // Note: /platform/login is RETAINED (authentication barrier)
      { source: '/platform/observability', destination: '/console/overview', statusCode: 301 },
      { source: '/platform/operations', destination: '/console/provisioning', statusCode: 301 },
      { source: '/platform/packages', destination: '/console/overview', statusCode: 301 },
      { source: '/platform/plans', destination: '/console/billing', statusCode: 301 },
      { source: '/platform/projects', destination: '/console/tenants', statusCode: 301 },
      { source: '/platform/projects/:projectId', destination: '/console/tenants/:projectId', statusCode: 301 },
      { source: '/platform/restaurants', destination: '/console/tenants', statusCode: 301 },
      { source: '/platform/restaurants/:id', destination: '/console/tenants/:id', statusCode: 301 },
      { source: '/platform/security', destination: '/console/security', statusCode: 301 },
      { source: '/platform/settings', destination: '/console/settings/appearance', statusCode: 301 },
      { source: '/platform/tenants/new', destination: '/console/tenants', statusCode: 301 },
      { source: '/platform/tenants', destination: '/console/tenants', statusCode: 301 },
      { source: '/platform/tests', destination: '/console/overview', statusCode: 301 },
    ];
  },
  webpack: (config, { isServer, nextRuntime }) => {
    // lucide-react sets "type": "module" in package.json while exposing CJS files under dist/cjs.
    // Force webpack to treat dist/cjs/*.js as javascript/auto so CJS callers do not lose exports.
    config.module.rules.push({
      test: /lucide-react[\\/]dist[\\/]cjs[\\/].*\.js$/,
      type: 'javascript/auto',
    });
    if (!isServer || nextRuntime === 'edge') {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
