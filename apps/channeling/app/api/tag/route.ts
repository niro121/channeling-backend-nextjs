import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTags } from "@/app/actions/tag.actions";

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
    const type = searchParams.get("type") || undefined;

    const result = await getAllTags({
      page,
      limit,
      keyword,
      type,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error: any) {
    console.error("GET /api/tag error:", error);

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
