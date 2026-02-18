import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateTotpSecret, generateTotpURI } from "@/lib/2fa/totp";
import { TWO_FACTOR_METHODS } from "@/lib/2fa/constants";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Ruhunu Channelling";

/** POST /api/auth/setup-2fa - Generate and save a per-user TOTP secret; return URI and secret for QR/manual entry */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true }
  });
  if (!user?.email) {
    return NextResponse.json({ error: "User email not found" }, { status: 400 });
  }
  const secret = generateTotpSecret();
  const uri = generateTotpURI({
    secret,
    label: user.email,
    issuer: APP_NAME
  });
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorMethod: TWO_FACTOR_METHODS.AUTH_APP,
      twoFactorSecret: secret,
      twoFactorVerified: false
    }
  });
  return NextResponse.json({ uri, secret });
}
