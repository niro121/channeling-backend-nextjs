import { NextResponse } from 'next/server';
import { channelingUserFetch, ChannelingUserApiError } from '@/lib/channeling-user-api';

export const dynamic = 'force-dynamic';

/**
 * Same-origin push endpoint for the browser and service worker; forwards to channeling's
 * /api/management/push as the signed-in user (subscriptions live with the notifications).
 */
async function forward(init?: RequestInit) {
  try {
    const res = await channelingUserFetch('/api/management/push', init);
    const data = await res.json().catch(() => ({ success: false, message: 'Bad response' }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const status = error instanceof ChannelingUserApiError ? error.status : 502;
    const message = error instanceof Error ? error.message : 'Unavailable';
    return NextResponse.json({ success: false, message }, { status });
  }
}

export async function GET() {
  return forward();
}

export async function POST(request: Request) {
  const body = await request.text();
  return forward({ method: 'POST', body });
}
