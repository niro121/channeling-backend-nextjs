import { generateSecret, verify } from 'otplib';

/** Generate a new TOTP secret for authenticator app (base32) */
export function generateTotpSecret(): string {
  return generateSecret();
}

/** Verify TOTP token from authenticator app */
export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  try {
    return await verify({ secret, token: token.trim() });
  } catch {
    return false;
  }
}

/** Generate a 6-digit code for SMS/EMAIL (one-time) */
export function generateSixDigitCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}
