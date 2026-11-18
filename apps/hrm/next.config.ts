import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

/**
 * Resolve monorepo root by walking up for the workspace lockfile.
 * Avoid __dirname from next.config.ts — Next may evaluate a temp copy under
 * %USERPROFILE%\AppData\Local\..., and `../..` then becomes the user profile.
 */
function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (fs.existsSync(path.join(dir, "package-lock.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return startDir;
    }
    dir = parent;
  }
}

const monorepoRoot = findMonorepoRoot(process.cwd());
const prismaClientGlob = path
  .join(monorepoRoot, "packages/db-auth/src/generated/client/**/*")
  .replace(/\\/g, "/");

const nextConfig: NextConfig = {
  transpilePackages: ["@archmage/shared", "@archmage/ui", "@archmage/db-auth"],
  serverExternalPackages: ["@prisma/client"],
  outputFileTracingRoot: monorepoRoot,
  // Prisma engines still copied by PrismaPlugin; includes help Linux/Heroku deploys.
  outputFileTracingIncludes: {
    "/**": [prismaClientGlob],
  },
  webpack: (config, { isServer, dev, nextRuntime }) => {
    // Node server only — edge + server both set isServer and would race on copyFile.
    if (isServer && nextRuntime === "nodejs") {
      /**
       * Windows + custom Prisma output outside node_modules (esp. on a non-C:
       * drive) makes @vercel/nft glob C:\Users\<you>\** and die on the
       * "Application Data" junction (EPERM). That abort also cascades into
       * FlightClientEntryPlugin ("Cannot read properties of undefined (reading 'server')").
       * Skip Next's TraceEntryPointsPlugin on win32 only; Linux CI/Heroku keep tracing.
       * @see https://github.com/prisma/prisma/issues/27555
       * @see https://github.com/vercel/next.js/discussions/62281
       */
      if (!dev && process.platform === "win32") {
        config.plugins = (config.plugins ?? []).filter(
          (plugin: { constructor?: { name?: string } } | undefined) =>
            !plugin ||
            !/TraceEntryPointsPlugin/.test(plugin.constructor?.name ?? "")
        );
      }

      // On Windows, two custom Prisma outputs (hrm + db-auth) both ship the same
      // engine filenames; PrismaPlugin's parallel copyFile races (EBUSY). Linux
      // deploy (Heroku) still needs the plugin for monorepo engine packaging.
      if (process.platform !== "win32") {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
          config.plugins = [...(config.plugins ?? []), new PrismaPlugin()];
        } catch {
          // Plugin missing at runtime (next start) — safe to skip
        }
      }
    }
    return config;
  },
};

export default nextConfig;
