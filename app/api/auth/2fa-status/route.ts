import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/** GET /api/auth/2fa-status - Returns 2FA setup and preference for the current user */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true, phone: true }
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const hasPhone = Boolean(user.phone?.trim());
  return NextResponse.json({
    hasAuthenticator: Boolean(user.twoFactorSecret),
    require2FAAtLogin: user.twoFactorEnabled === true,
    hasPhone
  });
}
