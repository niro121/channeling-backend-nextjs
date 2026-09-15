import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userTypes } from "@/lib/roles";
import { getBanksForChannelBookingService } from "@/services/channel-booking/reference/get-banks.service";

const E2E_RUN_ENABLED = process.env.E2E_RUN_FROM_APP === "true" || process.env.E2E_RUN_FROM_APP === "1";

export async function GET() {
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
  try {
    const result = await getBanksForChannelBookingService();
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.message ?? "Failed to load banks" },
        { status: 500 }
      );
    }
    return NextResponse.json(result.data);
  } catch (e) {
    console.error("GET /api/admin/run-e2e/reference/banks error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load banks" },
      { status: 500 }
    );
  }
}
