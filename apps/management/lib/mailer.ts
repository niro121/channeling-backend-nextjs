import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Outgoing email over SMTP (any provider: Google Workspace, Microsoft 365, Resend, SendGrid…).
 * SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465) or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD,
 * plus MAIL_FROM (e.g. "Ruhunu Management <tasks@ruhunuhospital.lk>").
 * Without SMTP settings, email is skipped and logged; in-app notifications and pushes still go out.
 */
let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const url = process.env.SMTP_URL;
  const host = process.env.SMTP_HOST;
  if (url) {
    transporter = nodemailer.createTransport(url);
  } else if (host) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
    });
  } else {
    console.warn('[mail] SMTP not configured (SMTP_URL or SMTP_HOST); emails are skipped');
    transporter = null;
  }
  return transporter;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL || process.env.SMTP_HOST);
}

export async function sendMail(input: { to: string[]; subject: string; text: string; html?: string }): Promise<boolean> {
  const to = [...new Set(input.to.map((t) => t.trim()).filter(Boolean))];
  if (to.length === 0) return false;
  const tx = getTransporter();
  if (!tx) return false;
  try {
    // One message per person so addresses aren't shared between staff
    await Promise.all(
      to.map((address) =>
        tx.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: address,
          subject: input.subject,
          text: input.text,
          html: input.html
        })
      )
    );
    return true;
  } catch (error) {
    console.error('[mail] send failed', error instanceof Error ? error.message : error);
    return false;
  }
}
