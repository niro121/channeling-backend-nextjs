import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@archmage/shared", "@archmage/ui", "@archmage/db-auth"],
  serverExternalPackages: ["@prisma/client"],
  // Monorepo: allow tracing Prisma engines outside apps/hrm
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/**": ["../../packages/db-auth/src/generated/client/**/*"],
  },
  webpack: (config, { isServer }) => {
    // Build-only: package is a devDependency and is pruned on Heroku after build
    if (isServer) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
        config.plugins = [...(config.plugins ?? []), new PrismaPlugin()];
      } catch {
        // Plugin missing at runtime (next start) — safe to skip
      }
    }
    return config;
  },
};

export default nextConfig;
