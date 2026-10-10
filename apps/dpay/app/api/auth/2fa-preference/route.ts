import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { authPrisma } from '@archmage/db-auth';

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const require2FA = body?.require2FA;
  if (typeof require2FA !== 'boolean') {
    return NextResponse.json({ error: 'require2FA (boolean) required' }, { status: 400 });
  }

  if (require2FA) {
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    });
    if (!user?.phone?.trim()) {
      return NextResponse.json(
        { error: 'Add a mobile number in your profile before enabling 2FA.' },
        { status: 400 }
      );
    }
  }

  await authPrisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: require2FA },
  });

  return NextResponse.json({ require2FAAtLogin: require2FA });
}
