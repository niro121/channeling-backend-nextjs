import { NextResponse } from 'next/server';
import { authPrisma } from '@archmage/db-auth';
import * as argon2 from 'argon2';
import { isDashboardLoginUserType } from '@/lib/roles';
import { canAccessHrmApp } from '@/lib/auth-app-access';

export async function POST(request: Request) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const identifier = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/username and password required' }, { status: 400 });
    }

    const user = await authPrisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }], status: 1 },
      include: { userGroup: true },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!isDashboardLoginUserType(user.userType) || !canAccessHrmApp(user)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.mustChangePassword === true) {
      return NextResponse.json({ requiresPasswordChange: true });
    }

    const group = user.userGroup;
    const groupAllows2FA = group == null || group.twoFactorEnabled === true;
    const userRequires2FA = user.twoFactorEnabled === true && groupAllows2FA;
    const allowedMethods =
      Array.isArray(group?.twoFactorMethods) && group.twoFactorMethods.length > 0
        ? group.twoFactorMethods
        : ['1', '2', '3'];

    if (!userRequires2FA) {
      return NextResponse.json({ success: true, requiresTwoFactor: false });
    }

    return NextResponse.json({ requiresTwoFactor: true, allowedMethods });
  } catch (e) {
    console.error('check-login error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
