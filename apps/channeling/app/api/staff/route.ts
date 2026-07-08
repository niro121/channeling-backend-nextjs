import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStaffAction } from "@/app/actions/staff.actions";

/** GET /api/staff — paginated staff list (requires authenticated session). */
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
    const keyword = searchParams.get("keyword") || "";

    const result = await getStaffAction({ page, limit, keyword });

    if (result.isError) {
      return NextResponse.json(
        {
          success: false,
          message: result.errors?.message ?? "Failed to fetch staff",
          data: [],
          totalRecords: 0,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data?.data ?? [],
        totalRecords: result.data?.totalRecords ?? 0,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("GET /api/staff error:", error);

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
