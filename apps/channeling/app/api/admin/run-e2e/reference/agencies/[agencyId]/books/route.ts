import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userTypes } from "@/lib/roles";
import { getAgencyBooksByAgencyForChannelBookingService } from "@/services/channel-booking/reference/get-agency-books-by-agency.service";

const E2E_RUN_ENABLED = process.env.E2E_RUN_FROM_APP === "true" || process.env.E2E_RUN_FROM_APP === "1";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  if (!E2E_RUN_ENABLED) {
    return NextResponse.json(
      { error: "E2E test runner is disabled." },
      { status: 403 }
    );
  }
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userType = (session.user as { userType?: number }).userType;
  if (userType !== userTypes.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { agencyId } = await params;
  if (!agencyId?.trim()) {
    return NextResponse.json({ data: [] });
  }
  try {
    const result = await getAgencyBooksByAgencyForChannelBookingService(agencyId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.message ?? "Failed to load books" },
        { status: 500 }
      );
    }
    return NextResponse.json(result.data ?? []);
  } catch (e) {
    console.error("GET /api/admin/run-e2e/reference/agencies/[agencyId]/books error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load agency books" },
      { status: 500 }
    );
  }
}
