import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/** PATCH /api/auth/2fa-preference - Set whether to require 2FA at login for the current user (only applies when group has 2FA) */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const require2FA = body?.require2FA;
  if (typeof require2FA !== "boolean") {
    return NextResponse.json({ error: "require2FA (boolean) required" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorSkipped: !require2FA }
  });
  return NextResponse.json({ require2FAAtLogin: require2FA });
}
