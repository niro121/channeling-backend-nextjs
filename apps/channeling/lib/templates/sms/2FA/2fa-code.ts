/**
 * SMS template for 2FA verification code.
 * Use with: twoFaCodeSmsTemplate(code)
 */
export function twoFaCodeSmsTemplate(code: string): string {
  return `Ruhunu Channelling: Your verification code is ${code}. Do not share this code. Valid for a few minutes only.`;
}
