import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@archmage/shared", "@archmage/ui"],
};

export default nextConfig;
