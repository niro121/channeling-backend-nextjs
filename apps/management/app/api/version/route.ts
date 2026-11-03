import { NextResponse } from 'next/server';
import { APP_VERSION, BUILD_ID, type ServerVersion } from '@/lib/pwa/version';

export const dynamic = 'force-dynamic';

/** GET /api/version — the deployed build; open apps compare it with their own (components/pwa/app-update.tsx). */
export function GET() {
  const body: ServerVersion = {
    version: APP_VERSION,
    buildId: BUILD_ID,
    minVersion: process.env.MIN_APP_VERSION?.trim() || null
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
