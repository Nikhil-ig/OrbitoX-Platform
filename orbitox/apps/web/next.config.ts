import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle: `node apps/web/server.js` runs without a full
  // node_modules tree, which keeps the production Docker image small.
  output: "standalone",
  // The app lives inside a pnpm monorepo, so file tracing must start at the workspace root.
  outputFileTracingRoot: path.join(__dirname, "../../"),
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
};

export default nextConfig;
