import { NextResponse } from "next/server";
import { changeInitialPassword } from "@/lib/helpers/auth/change-initial-password";

/**
 * POST /api/auth/change-initial-password
 * For first-login: user provides current (admin-set) password and new password.
 * Body: { email: string, currentPassword: string, newPassword: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = typeof body?.email === "string" ? body.email.trim() : "";
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    const result = await changeInitialPassword({
      identifier,
      currentPassword,
      newPassword,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("change-initial-password error", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
