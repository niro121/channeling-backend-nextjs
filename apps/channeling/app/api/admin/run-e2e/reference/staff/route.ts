import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userTypes } from "@/lib/roles";
import { getStaffForSelectService } from "@/services/reference/reference-data.service";

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
    const data = await getStaffForSelectService();
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/admin/run-e2e/reference/staff error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load staff" },
      { status: 500 }
    );
  }
}
