import { sendSms } from '@/lib/helpers/sms/send-sms';
import { APP_DISPLAY_NAME, TWO_FA_CODE_EXPIRY_MINUTES } from '@/lib/helpers/2fa/constants';

export async function send2faSms(phoneNumber: string, code: string): Promise<{ success: boolean }> {
  const text = `Your ${APP_DISPLAY_NAME} verification code is: ${code}. Valid for ${TWO_FA_CODE_EXPIRY_MINUTES} minutes. Do not share this code.`;
  const result = await sendSms(phoneNumber, text);
  return { success: result.status };
}

export async function send2faEmail(_email: string, _code: string): Promise<{ success: boolean }> {
  return { success: false };
}
