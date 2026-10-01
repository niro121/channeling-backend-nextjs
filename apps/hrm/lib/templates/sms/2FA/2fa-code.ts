/**
 * SMS template for 2FA verification code.
 * Use with: twoFaCodeSmsTemplate(code)
 */
export function twoFaCodeSmsTemplate(code: string): string {
  return `Your Archmage HRM verification code is: ${code}. Valid for 5 minutes. Do not share this code.`;
}
