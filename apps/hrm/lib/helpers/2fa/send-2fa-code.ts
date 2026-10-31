import { sendSms } from '@/lib/helpers/sms/send-sms';
import { sendEmail } from '@/lib/helpers/email';
import { twoFaCodeSmsTemplate } from '@/lib/templates/sms/2FA';
import { twoFaCodeEmailTemplate } from '@/lib/templates/email/2FA';

/**
 * Send 2FA verification code via SMS using the shared sendSms helper and template.
 */
export async function send2faSms(phoneNumber: string, code: string): Promise<{ success: boolean }> {
  const text = twoFaCodeSmsTemplate(code);
  const result = await sendSms(phoneNumber, text);
  return { success: result.status };
}

/**
 * Send 2FA verification code via Email using the shared sendEmail helper and template.
 */
export async function send2faEmail(email: string, code: string): Promise<{ success: boolean }> {
  const { subject, text, html } = twoFaCodeEmailTemplate(code);
  const result = await sendEmail(email, subject, text, { html });
  return { success: result.status };
}
