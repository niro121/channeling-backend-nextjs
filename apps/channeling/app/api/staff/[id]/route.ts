import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStaffByIdAction } from "@/app/actions/staff.actions";

/** GET /api/staff/[id] — single staff record (requires authenticated session). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Staff id is required" },
        { status: 400 }
      );
    }

    const result = await getStaffByIdAction(id);

    if (result.isError) {
      const message = result.errors?.message ?? "Failed to fetch staff";
      const isNotFound = message.toLowerCase().includes("not found");

      return NextResponse.json(
        { success: false, message },
        { status: isNotFound ? 404 : 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("GET /api/staff/[id] error:", error);

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
