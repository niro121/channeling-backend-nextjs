import type { NextConfig } from "next";
import path from "path";
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@archmage/shared", "@archmage/ui", "@archmage/db-auth"],
  serverExternalPackages: ["@prisma/client"],
  // Monorepo: allow tracing Prisma engines outside apps/hrm
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/**": ["../../packages/db-auth/src/generated/client/**/*"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

export default nextConfig;
