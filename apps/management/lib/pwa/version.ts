/**
 * App version, inlined at build time by next.config.ts.
 * - APP_VERSION: package.json "version". Bump it for releases.
 * - BUILD_ID: changes on every deploy; a different one on the server means an update is waiting.
 * - MIN_APP_VERSION (server env, optional): installs running an older APP_VERSION reload at once.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';

export type ServerVersion = {
  version: string;
  buildId: string;
  minVersion: string | null;
};

/** -1 / 0 / 1 for dotted numeric versions ("1.4.0" vs "1.10"). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** Errors an open app hits after a deploy replaced its build (old chunks / server action ids). */
export function isStaleBuildError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed|Failed to find Server Action|Server Action .* was not found|failed to fetch dynamically imported module/i.test(
    message
  );
}
