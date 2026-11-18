import { NextRequest, NextResponse } from 'next/server';
import { channelingUserFetch, ChannelingUserApiError } from '@/lib/channeling-user-api';

export const dynamic = 'force-dynamic';

/** Inventory item photo, fetched from channeling as the signed-in user. */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{24}$/i.test(id ?? '')) {
    return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });
  }
  const size = req.nextUrl.searchParams.get('size') === 'thumb' ? '?size=thumb' : '';
  try {
    const res = await channelingUserFetch(`/api/management/room-inventory/items/${id}/image${size}`);
    if (!res.ok) {
      return NextResponse.json({ success: false, message: 'Image unavailable' }, { status: res.status });
    }
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/webp',
        // The URL carries ?v=<image version>, so a day of private caching is safe.
        'Cache-Control': 'private, max-age=86400',
        'Content-Disposition': 'inline'
      }
    });
  } catch (error) {
    const status = error instanceof ChannelingUserApiError ? error.status : 502;
    return NextResponse.json({ success: false, message: 'Image unavailable' }, { status });
  }
}
