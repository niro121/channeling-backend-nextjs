import 'server-only';

import { sendEmail, type SendEmailOptions } from '@/lib/helpers/email';
import { sendSms } from '@/lib/helpers/sms';

export type CandidateContact = {
  email?: string | null;
  phone?: string | null;
};

export type CandidateEmailContent = {
  subject: string;
  text: string;
  html?: string;
};

export type NotifyCandidateResult = {
  emailed: boolean;
  smsSent: boolean;
  skipped: boolean;
  warnings: string[];
};

/**
 * Best-effort candidate notify. Never throws — callers decide whether to
 * treat missing contact / channel failures as hard errors.
 * Does not include internal notes; pass only candidate-safe template output.
 */
export async function notifyCandidate(options: {
  contact: CandidateContact;
  email?: CandidateEmailContent;
  smsText?: string;
  emailOptions?: Omit<SendEmailOptions, 'html'>;
}): Promise<NotifyCandidateResult> {
  const email = options.contact.email?.trim() ?? '';
  const phone = options.contact.phone?.trim() ?? '';
  const warnings: string[] = [];
  let emailed = false;
  let smsSent = false;

  if (!email && !phone) {
    return {
      emailed: false,
      smsSent: false,
      skipped: true,
      warnings: ['Candidate has no email or phone']
    };
  }

  if (email && options.email) {
    const sent = await sendEmail(
      email,
      options.email.subject,
      options.email.text,
      {
        ...options.emailOptions,
        html: options.email.html
      }
    );
    emailed = sent.status;
    if (!sent.status) {
      warnings.push(sent.error ?? 'Email failed');
    }
  } else if (!email && options.email) {
    warnings.push('No email on file');
  }

  if (phone && options.smsText) {
    const sent = await sendSms(phone, options.smsText);
    smsSent = sent.status;
    if (!sent.status) {
      warnings.push(sent.error ?? 'SMS failed');
    }
  } else if (!phone && options.smsText) {
    warnings.push('No phone on file');
  }

  return {
    emailed,
    smsSent,
    skipped: !emailed && !smsSent,
    warnings
  };
}
