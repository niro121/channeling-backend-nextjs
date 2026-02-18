/**
 * Dummy SMS/Email sending for 2FA codes.
 * No real API/SMTP is called; logs to console for development.
 * Replace with actual sendSmsService / SMTP when credentials are available.
 */

const DUMMY_PHONE = process.env.DUMMY_2FA_PHONE ?? '+94000000000';

export async function send2faSms(phoneNumber: string, code: string): Promise<{ success: boolean }> {
  const target = phoneNumber && phoneNumber !== DUMMY_PHONE ? phoneNumber : DUMMY_PHONE;
  console.log('[2FA SMS - dummy] Would send code to', target, '| Code:', code);
  return { success: true };
}

export async function send2faEmail(email: string, code: string): Promise<{ success: boolean }> {
  console.log('[2FA Email - dummy] Would send code to', email, '| Code:', code);
  return { success: true };
}
