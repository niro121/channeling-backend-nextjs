const MOBITEL_SMS_USER = process.env.MOBITEL_SMS_USER;
const MOBITEL_SMS_API_PASSWORD = process.env.MOBITEL_SMS_API_PASSWORD;
const MOBITEL_SMS_URL = process.env.MOBITEL_SMS_URL;
const DEFAULT_FROM = 'Archmage DPAY';
const MOBITEL_RESULT_SUCCESS = 200;

export type SendSmsResult = {
  status: boolean;
  error?: string;
};

export async function sendSms(phone: string, text: string): Promise<SendSmsResult> {
  if (!MOBITEL_SMS_USER || !MOBITEL_SMS_API_PASSWORD || !MOBITEL_SMS_URL) {
    return { status: false, error: 'SMS config missing (MOBITEL_SMS_* env)' };
  }
  try {
    const res = await fetch(MOBITEL_SMS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: MOBITEL_SMS_USER,
        password: MOBITEL_SMS_API_PASSWORD,
        from: DEFAULT_FROM,
        to: phone,
        text,
        mesageType: 1,
      }),
    });
    const data = (await res.json()) as { resultcode?: number | string };
    const code = data.resultcode != null ? Number(data.resultcode) : undefined;
    return { status: code === MOBITEL_RESULT_SUCCESS };
  } catch (e) {
    console.error('sendSms error', e);
    return { status: false, error: e instanceof Error ? e.message : 'SMS exception' };
  }
}
