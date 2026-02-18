import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { verifyTotp } from "@/lib/2fa/totp";

/** POST /api/auth/verify-2fa-setup - Verify the code from the app and mark 2FA as confirmed */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code from your app" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true }
  });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "Set up authenticator first" }, { status: 400 });
  }
  const valid = await verifyTotp(code, user.twoFactorSecret);
  if (!valid) {
    return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorVerified: true }
  });
  return NextResponse.json({ success: true });
}
