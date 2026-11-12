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
