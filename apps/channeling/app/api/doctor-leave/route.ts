import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDoctorLeaves } from '@/app/actions/doctor.leave.action';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || undefined;
    const limit = searchParams.get("limit") || undefined;
    const doctorId = searchParams.get('doctorId') ?? undefined;
    const fromDate = searchParams.get('fromDate') ?? undefined;
    const toDate = searchParams.get('toDate') ?? undefined;

    if (!doctorId) {
      return NextResponse.json(
        { success: false, message: 'doctorId is required' },
        { status: 400 }
      );
    }

    const result = await getDoctorLeaves({
      page,
      limit,
      doctorId,
      fromDate,
      toDate
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400
    });
  } catch (error: any) {
    console.error('GET /api/doctor-leave error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
        data: [],
        totalRecords: 0
      },
      { status: 500 }
    );
  }
}
