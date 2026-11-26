import { NextRequest, NextResponse } from 'next/server';
import { getDpayShiftLines } from '@/services/shifts/get-shift-lines.service';

export async function POST(request: NextRequest) {
  const secret = process.env.DPAY_SHIFT_LINES_SECRET?.trim();
  const provided = request.headers.get('x-dpay-shift-secret')?.trim();
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { shiftIds?: string[] } | null;
  const shiftIds = Array.isArray(body?.shiftIds) ? body.shiftIds : [];
  const lines = await getDpayShiftLines(shiftIds);
  return NextResponse.json({ lines });
}
