import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@orbitox-io/celebrations",
    "@orbitox-io/crm",
    "@orbitox-io/plugin-engine",
    "@orbitox/ui",
    "@orbitox/sdk",
    "@orbitox/types",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
      },
    ],
  },
};

export default nextConfig;
