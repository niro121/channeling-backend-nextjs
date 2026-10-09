import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { authPrisma } from '@archmage/db-auth';
import { verifyTotp } from '@/lib/helpers/2fa/totp';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: 'Enter the 6-digit code from your app' }, { status: 400 });
  }

  const user = await authPrisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true },
  });

  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: 'Set up authenticator first' }, { status: 400 });
  }

  const valid = await verifyTotp(code, user.twoFactorSecret);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 });
  }

  await authPrisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorVerified: true },
  });

  return NextResponse.json({ success: true });
}
