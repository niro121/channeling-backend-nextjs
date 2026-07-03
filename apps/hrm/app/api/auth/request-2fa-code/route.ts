import { NextResponse } from 'next/server';
import { authPrisma } from '@archmage/db-auth';
import * as argon2 from 'argon2';
import { TWO_FACTOR_METHODS, TWO_FA_PENDING_EXPIRY_MINUTES, TWO_FA_CODE_EXPIRY_MINUTES } from '@/lib/helpers/2fa/constants';
import { generateSixDigitCode, generateTotpSecret, generateTotpURI } from '@/lib/helpers/2fa/totp';
import { send2faSms, send2faEmail } from '@/lib/helpers/2fa/send-2fa-code';
import crypto from 'crypto';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Archmage HRM';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const method = typeof body?.method === 'string' ? body.method.trim() : '';

    const validMethods = [TWO_FACTOR_METHODS.AUTH_APP, TWO_FACTOR_METHODS.SMS, TWO_FACTOR_METHODS.EMAIL];
    if (!identifier || !password || !validMethods.includes(method)) {
      return NextResponse.json({ error: 'Email/username, password, and method required' }, { status: 400 });
    }

    const user = await authPrisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }], status: 1 },
      include: { userGroup: true },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    if (user.twoFactorEnabled !== true) {
      return NextResponse.json({ error: '2FA not enabled for this account' }, { status: 403 });
    }

    const group = user.userGroup;
    const groupAllows2FA = group == null || group.twoFactorEnabled === true;
    if (!groupAllows2FA) {
      return NextResponse.json({ error: '2FA is disabled for your group.' }, { status: 403 });
    }

    const allowedMethods =
      Array.isArray(group?.twoFactorMethods) && group.twoFactorMethods.length > 0
        ? group.twoFactorMethods
        : ['1', '2', '3'];
    if (!allowedMethods.includes(method)) {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 403 });
    }

    const expiresMinutes =
      method === TWO_FACTOR_METHODS.AUTH_APP ? TWO_FA_PENDING_EXPIRY_MINUTES : TWO_FA_CODE_EXPIRY_MINUTES;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    if (method === TWO_FACTOR_METHODS.AUTH_APP) {
      const token = crypto.randomBytes(24).toString('hex');
      const hasExistingSecret = Boolean(user.twoFactorSecret);

      if (!hasExistingSecret) {
        const secret = generateTotpSecret();
        const uri = generateTotpURI({ secret, label: user.email, issuer: APP_NAME });
        await authPrisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorMethod: TWO_FACTOR_METHODS.AUTH_APP,
            twoFactorPendingSecret: secret,
            twoFactorTempCode: token,
            twoFactorExpires: expiresAt,
          },
        });
        return NextResponse.json({ twoFactorToken: token, needsSetup: true, uri, secret, message: 'Set up your authenticator app below, then enter the 6-digit code' });
      }

      await authPrisma.user.update({
        where: { id: user.id },
        data: { twoFactorTempCode: token, twoFactorExpires: expiresAt, twoFactorPendingSecret: null },
      });
      return NextResponse.json({ twoFactorToken: token, message: 'Enter the 6-digit code from your authenticator app' });
    }

    if (method === TWO_FACTOR_METHODS.SMS) {
      const phone = user.phone?.trim();
      if (!phone) {
        return NextResponse.json({ error: 'Phone number not set. Please add your mobile number in account settings.' }, { status: 400 });
      }
      const code = generateSixDigitCode();
      const smsResult = await send2faSms(phone, code);
      if (!smsResult.success) {
        return NextResponse.json({ error: 'Failed to send SMS. Please try again or use another method.' }, { status: 503 });
      }
      await authPrisma.user.update({
        where: { id: user.id },
        data: { twoFactorTempCode: code, twoFactorExpires: expiresAt, twoFactorPendingSecret: null },
      });
      return NextResponse.json({ message: 'A verification code has been sent to your phone' });
    }

    if (method === TWO_FACTOR_METHODS.EMAIL) {
      const emailResult = await send2faEmail(user.email, '');
      if (!emailResult.success) {
        return NextResponse.json({ error: 'Email verification is currently unavailable. Please use another method.' }, { status: 503 });
      }
      return NextResponse.json({ message: 'A verification code has been sent to your email' });
    }

    return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
  } catch (e) {
    console.error('request-2fa-code error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
