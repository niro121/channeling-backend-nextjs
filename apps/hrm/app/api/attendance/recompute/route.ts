import { NextRequest, NextResponse } from 'next/server';
import { toColomboDateIso } from '@/lib/helpers/attendance-timezone.helper';
import { recomputeAttendanceDaysForDate } from '@/services/attendance-services/attendance-day.service';

function extractApiKey(req: NextRequest): string | null {
  const headerKey = req.headers.get('x-attendance-api-key')?.trim();
  if (headerKey) return headerKey;

  const auth = req.headers.get('authorization')?.trim();
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

function assertApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.ATTENDANCE_DEVICE_API_KEY?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: 'ATTENDANCE_DEVICE_API_KEY is not configured on the server' },
      { status: 503 }
    );
  }
  const provided = extractApiKey(req);
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * Cron / ops: recompute AttendanceDay rows for a Colombo civil date
 * (marks Absent for rostered staff with no punches).
 *
 * POST /api/attendance/recompute
 * Auth: X-Attendance-Api-Key (same as punch ingest)
 * Body: { "date": "2025-08-15" }  // optional; defaults to today Asia/Colombo
 */
export async function POST(req: NextRequest) {
  const authError = assertApiKey(req);
  if (authError) return authError;

  try {
    let dateIso = toColomboDateIso(new Date());
    try {
      const body = await req.json();
      if (typeof body?.date === 'string' && body.date.trim()) {
        dateIso = body.date.trim().slice(0, 10);
      }
    } catch {
      // empty body → today
    }

    const result = await recomputeAttendanceDaysForDate({ dateIso });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Recompute failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('POST /api/attendance/recompute error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
