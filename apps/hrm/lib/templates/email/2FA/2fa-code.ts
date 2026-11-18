export type TwoFaCodeEmailContent = {
  subject: string;
  text: string;
  html: string;
};

/**
 * Email template for 2FA verification code.
 * Use with: twoFaCodeEmailTemplate(code)
 */
export function twoFaCodeEmailTemplate(code: string): TwoFaCodeEmailContent {
  const subject = 'Your Archmage HRM verification code';
  const text = `Your Archmage HRM verification code is: ${code}. Valid for 5 minutes. Do not share this code.`;
  const html = `
    <p>Your Archmage HRM verification code is:</p>
    <p style="font-size:24px;font-weight:700;letter-spacing:4px;">${code}</p>
    <p>Valid for 5 minutes. Do not share this code.</p>
  `.trim();

  return { subject, text, html };
}
