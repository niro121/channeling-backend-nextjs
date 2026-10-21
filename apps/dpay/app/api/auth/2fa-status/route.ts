import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { authPrisma } from '@archmage/db-auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await authPrisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      twoFactorSecret: true,
      twoFactorEnabled: true,
      phone: true,
      userGroup: { select: { twoFactorEnabled: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const groupAllows2FA = user.userGroup == null || user.userGroup.twoFactorEnabled === true;
  const hasPhone = Boolean(user.phone?.trim());
  const userPreference2FA = user.twoFactorEnabled === true;
  const require2FAAtLogin = userPreference2FA && groupAllows2FA;

  return NextResponse.json({
    hasAuthenticator: Boolean(user.twoFactorSecret),
    require2FAAtLogin,
    userPreference2FA,
    hasPhone,
    groupAllows2FA,
  });
}
