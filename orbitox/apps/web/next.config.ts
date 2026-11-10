import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle: `node apps/web/server.js` runs without a full
  // node_modules tree, which keeps the production Docker image small.
  output: "standalone",
  // The app lives inside a pnpm monorepo, so file tracing must start at the workspace root.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
  transpilePackages: [
    "@orbitox/ui",
    "@orbitox/sdk",
    "@orbitox/types",
    "@orbitox/utils",
    "@orbitox/commerce",
    "@orbitox/runtime",
    "@orbitox/plugin-engine",
    "@orbitox-io/plugin-engine",
    "@orbitox/pos",
    "@orbitox/school",
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
