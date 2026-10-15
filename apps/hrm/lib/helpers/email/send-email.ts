import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_SECURE = process.env.SMTP_SECURE;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;

const DEFAULT_FROM = 'Archmage HRM <noreply@archmage.lk>';

export type SendEmailResult = {
  status: boolean;
  error?: string;
  messageId?: string;
};

export type SendEmailOptions = {
  /** Override sender (default: SMTP_FROM or "Archmage HRM") */
  from?: string;
  /** HTML body; when set, sent alongside text */
  html?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
};

function resolvePort(): number {
  const parsed = SMTP_PORT != null ? Number(SMTP_PORT) : NaN;
  return Number.isFinite(parsed) ? parsed : 587;
}

function resolveSecure(port: number): boolean {
  if (SMTP_SECURE === 'true' || SMTP_SECURE === '1') return true;
  if (SMTP_SECURE === 'false' || SMTP_SECURE === '0') return false;
  return port === 465;
}

/**
 * Reusable email sender for any task (2FA, notifications, etc.).
 * Uses SMTP_* env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE.
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  options: SendEmailOptions = {}
): Promise<SendEmailResult> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return { status: false, error: 'Email config missing (SMTP_HOST / SMTP_USER / SMTP_PASS env)' };
  }

  const port = resolvePort();
  const from = options.from ?? SMTP_FROM ?? DEFAULT_FROM;

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: resolveSecure(port),
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc
    });

    return { status: true, messageId: info.messageId };
  } catch (e) {
    console.error('sendEmail error', e);
    return { status: false, error: e instanceof Error ? e.message : 'Email exception' };
  }
}
