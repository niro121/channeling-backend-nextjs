import { NextRequest, NextResponse } from 'next/server';
import { channelingUserFetch, ChannelingUserApiError } from '@/lib/channeling-user-api';

export const dynamic = 'force-dynamic';

/** POST: upload a checklist photo to channeling as the signed-in user (multipart "file"). Returns { key }. */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, errorCode: 'invalid_input', message: 'No photo sent.' }, { status: 400 });
  }
  const out = new FormData();
  out.set('file', file, file.name || 'photo.jpg');
  try {
    const res = await channelingUserFetch('/api/management/room-stays/photos', { method: 'POST', body: out });
    const data = await res.json().catch(() => null);
    return NextResponse.json(
      data ?? { success: false, errorCode: 'unavailable', message: 'Upload failed. Try again.' },
      { status: res.status }
    );
  } catch (error) {
    const status = error instanceof ChannelingUserApiError ? error.status : 502;
    return NextResponse.json({ success: false, errorCode: 'unavailable', message: 'Upload failed. Try again.' }, { status });
  }
}

/** GET ?key=&stayId= — a checklist photo, fetched from channeling as the signed-in user. */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? '';
  const stayId = req.nextUrl.searchParams.get('stayId');
  const qs = new URLSearchParams({ key });
  if (stayId && /^[a-f0-9]{24}$/i.test(stayId)) qs.set('stayId', stayId);
  try {
    const res = await channelingUserFetch(`/api/management/room-stays/photos?${qs}`);
    if (!res.ok) return NextResponse.json({ success: false, message: 'Photo unavailable' }, { status: res.status });
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/webp',
        'Cache-Control': 'private, max-age=86400',
        'Content-Disposition': 'inline'
      }
    });
  } catch (error) {
    const status = error instanceof ChannelingUserApiError ? error.status : 502;
    return NextResponse.json({ success: false, message: 'Photo unavailable' }, { status });
  }
}
