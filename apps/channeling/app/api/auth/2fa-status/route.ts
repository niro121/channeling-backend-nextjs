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
    select: {
      twoFactorSecret: true,
      twoFactorEnabled: true,
      phone: true,
      userGroup: { select: { twoFactorEnabled: true } }
    }
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const group = user.userGroup;
  const groupAllows2FA = group == null || group.twoFactorEnabled === true;
  const hasPhone = Boolean(user.phone?.trim());
  const userPreference2FA = user.twoFactorEnabled === true;
  const require2FAAtLogin = userPreference2FA && groupAllows2FA;
  return NextResponse.json({
    hasAuthenticator: Boolean(user.twoFactorSecret),
    require2FAAtLogin,
    userPreference2FA,
    hasPhone,
    groupAllows2FA
  });
}
