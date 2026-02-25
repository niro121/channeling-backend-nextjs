import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as argon2 from "argon2";

const MIN_PASSWORD_LENGTH = 8;

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

    if (!identifier || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Email/username, current password, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
        status: 1
      }
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.mustChangePassword !== true) {
      return NextResponse.json(
        { error: "This account does not require a password change" },
        { status: 400 }
      );
    }

    const isCorrect = await argon2.verify(user.password, currentPassword);
    if (!isCorrect) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const hashedPassword = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("change-initial-password error", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
