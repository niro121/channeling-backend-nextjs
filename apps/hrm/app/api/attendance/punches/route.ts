import { NextRequest, NextResponse } from 'next/server';
import { ingestAttendancePunch } from '@/services/attendance-services/punch-ingest.service';
import { ensureDefaultAttendanceDevice } from '@/services/attendance-services/device.service';
import { DEFAULT_ATTENDANCE_DEVICE_CODE } from '@/types/attendance';

function extractApiKey(req: NextRequest): string | null {
  const headerKey = req.headers.get('x-attendance-api-key')?.trim();
  if (headerKey) return headerKey;

  const auth = req.headers.get('authorization')?.trim();
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

function assertDeviceApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.ATTENDANCE_DEVICE_API_KEY?.trim();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          'ATTENDANCE_DEVICE_API_KEY is not configured on the server'
      },
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
 * Device / gateway punch ingest.
 * Auth: `X-Attendance-Api-Key` or `Authorization: Bearer <ATTENDANCE_DEVICE_API_KEY>`
 *
 * Body: { deviceCode, externalPunchId, rfid, punchedAt, direction?, source?, rawPayload? }
 */
export async function POST(req: NextRequest) {
  const authError = assertDeviceApiKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();

    // Convenience for local smoke tests: auto-create DEV-LOCAL if that code is used.
    if (
      typeof body?.deviceCode === 'string' &&
      body.deviceCode.trim() === DEFAULT_ATTENDANCE_DEVICE_CODE
    ) {
      await ensureDefaultAttendanceDevice();
    }

    const result = await ingestAttendancePunch(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Ingest failed', issues: result.error?.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate ?? false,
      data: result.data,
      dayId: result.dayId ?? null,
      message: result.message
    });
  } catch (error: any) {
    console.error('POST /api/attendance/punches error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
