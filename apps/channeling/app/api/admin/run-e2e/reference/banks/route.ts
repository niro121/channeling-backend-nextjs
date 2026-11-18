import { NextResponse } from "next/server";
import { routeDenied } from "@/lib/api-privilege";
import { getBanksForChannelBookingService } from "@/services/channel-booking/reference/get-banks.service";

const E2E_RUN_ENABLED = process.env.E2E_RUN_FROM_APP === "true" || process.env.E2E_RUN_FROM_APP === "1";

export async function GET() {
  if (!E2E_RUN_ENABLED) {
    return NextResponse.json(
      { error: "E2E test runner is disabled." },
      { status: 403 }
    );
  }
  const denied = await routeDenied("/admin/run-e2e");
  if (denied) return denied;
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
