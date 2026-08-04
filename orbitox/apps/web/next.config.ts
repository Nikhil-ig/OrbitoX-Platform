import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@orbitox/types", "@orbitox/utils"],
};

export default nextConfig;
