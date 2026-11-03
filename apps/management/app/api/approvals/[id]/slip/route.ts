import { NextRequest, NextResponse } from 'next/server';
import { channelingUserFetch, ChannelingUserApiError } from '@/lib/channeling-user-api';

export const dynamic = 'force-dynamic';

/** Bank deposit slip image, fetched from channeling as the signed-in user. */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const size = req.nextUrl.searchParams.get('size') === 'thumb' ? '?size=thumb' : '';
  try {
    const res = await channelingUserFetch(`/api/management/approvals/${encodeURIComponent(id)}/slip${size}`);
    if (!res.ok) {
      return NextResponse.json({ success: false, message: 'Slip unavailable' }, { status: res.status });
    }
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline'
      }
    });
  } catch (error) {
    const status = error instanceof ChannelingUserApiError ? error.status : 502;
    return NextResponse.json({ success: false, message: 'Slip unavailable' }, { status });
  }
}
