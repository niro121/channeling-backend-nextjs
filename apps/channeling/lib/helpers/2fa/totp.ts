import { generateSecret, generateURI, verify } from 'otplib';

/** Generate a new TOTP secret for authenticator app (base32) */
export function generateTotpSecret(): string {
  return generateSecret();
}

/** Generate otpauth:// URI for QR code or manual entry in authenticator apps */
export function generateTotpURI(options: { secret: string; label: string; issuer: string }): string {
  return generateURI({
    secret: options.secret,
    label: options.label,
    issuer: options.issuer
  });
}

/** Verify TOTP token from authenticator app */
export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ secret, token: token.trim() });
    return result.valid === true;
  } catch {
    return false;
  }
}

/** Generate a 6-digit code for SMS/EMAIL (one-time) */
export function generateSixDigitCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}
