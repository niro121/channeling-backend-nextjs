import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as argon2 from "argon2";

/**
 * POST /api/auth/check-login
 * Validates email + password and returns whether 2FA is required.
 * Body: { email: string, password: string }
 * Returns:
 *   - { success: true, requiresTwoFactor: false } when no 2FA
 *   - { requiresTwoFactor: true, allowedMethods: string[] } when user is in a 2FA group (user then chooses method and calls request-2fa-code)
 *   - 401 when invalid credentials
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email, status: 1 },
      include: { userGroup: true }
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2FA required only when BOTH: (1) user has enabled it in Settings, AND (2) group allows 2FA (admin has not disabled it for the group)
    const group = user.userGroup;
    const groupAllows2FA = group == null || group.twoFactorEnabled === true;
    const userRequires2FA = user.twoFactorEnabled === true && groupAllows2FA;
    const allowedMethods =
      Array.isArray(group?.twoFactorMethods) && group.twoFactorMethods.length > 0
        ? group.twoFactorMethods
        : ["1", "2", "3"];

    if (!userRequires2FA) {
      return NextResponse.json({ success: true, requiresTwoFactor: false });
    }

    return NextResponse.json({
      requiresTwoFactor: true,
      allowedMethods
    });
  } catch (e) {
    console.error("check-login error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
