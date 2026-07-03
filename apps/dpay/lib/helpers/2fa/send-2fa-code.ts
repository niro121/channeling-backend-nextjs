import { sendSms } from '@/lib/helpers/sms/send-sms';

export async function send2faSms(phoneNumber: string, code: string): Promise<{ success: boolean }> {
  const text = `Your Archmage DPAY verification code is: ${code}. Valid for 5 minutes. Do not share this code.`;
  const result = await sendSms(phoneNumber, text);
  return { success: result.status };
}

export async function send2faEmail(_email: string, _code: string): Promise<{ success: boolean }> {
  return { success: false };
}
