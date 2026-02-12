import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllSessions } from "@/app/actions/sessions.action";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const page = searchParams.get("page") || undefined;
    const limit = searchParams.get("limit") || undefined;
    const date = searchParams.get("date") || undefined;
    const doctorId = searchParams.get("doctorId") || undefined;

    const result = await getAllSessions({
      page,
      limit,
      date,
      doctorId,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error: any) {
    console.error("GET /api/session error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        data: [],
        totalRecords: 0,
      },
      { status: 500 }
    );
  }
}
