import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@orbitox/ui",
    "@orbitox/sdk",
    "@orbitox/types",
    "@orbitox/utils",
    "@orbitox/commerce",
    "@orbitox/runtime",
    "@orbitox/plugin-engine",
    "@orbitox/pos",
    "@orbitox/school",
  ],
};

export default nextConfig;
