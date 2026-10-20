function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type InterviewNotifyEmailInput = {
  candidateName: string;
  position: string;
  interviewCode: string;
  interviewDate: string;
  startTime: string;
  endTime: string;
  location: string;
  interviewType: string;
  notesToCandidate?: string;
};

export type InterviewNotifyEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function interviewRescheduledEmailTemplate(
  input: InterviewNotifyEmailInput
): InterviewNotifyEmailContent {
  const subject = `Interview rescheduled · ${input.position}`;
  const notes = input.notesToCandidate?.trim() || '';
  const text = [
    `Dear ${input.candidateName},`,
    '',
    `Your interview for ${input.position} has been rescheduled.`,
    `Reference: ${input.interviewCode}`,
    `Date: ${input.interviewDate}`,
    `Time: ${input.startTime} – ${input.endTime}`,
    `Type: ${input.interviewType || '—'}`,
    `Location: ${input.location || '—'}`,
    notes ? `Note: ${notes}` : null,
    '',
    'Please contact HR if you have any questions.',
    '',
    '— Ruhunu Hospitals HR'
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
      <p>Dear <strong>${escapeHtml(input.candidateName)}</strong>,</p>
      <p>Your interview for <strong>${escapeHtml(input.position)}</strong> has been rescheduled.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Reference</td><td>${escapeHtml(input.interviewCode)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Date</td><td>${escapeHtml(input.interviewDate)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Time</td><td>${escapeHtml(input.startTime)} – ${escapeHtml(input.endTime)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Type</td><td>${escapeHtml(input.interviewType || '—')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Location</td><td>${escapeHtml(input.location || '—')}</td></tr>
      </table>
      ${notes ? `<p><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ''}
      <p>Please contact HR if you have any questions.</p>
      <p style="color:#666;">— Ruhunu Hospitals HR</p>
    </div>
  `;

  return { subject, text, html };
}

export function interviewCancelledEmailTemplate(input: {
  candidateName: string;
  position: string;
  interviewCode: string;
}): InterviewNotifyEmailContent {
  const subject = `Interview cancelled · ${input.position}`;
  const text = [
    `Dear ${input.candidateName},`,
    '',
    `Your interview for ${input.position} (${input.interviewCode}) has been cancelled.`,
    'Our HR team will contact you if a new interview is arranged.',
    '',
    '— Ruhunu Hospitals HR'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
      <p>Dear <strong>${escapeHtml(input.candidateName)}</strong>,</p>
      <p>Your interview for <strong>${escapeHtml(input.position)}</strong> (${escapeHtml(
        input.interviewCode
      )}) has been cancelled.</p>
      <p>Our HR team will contact you if a new interview is arranged.</p>
      <p style="color:#666;">— Ruhunu Hospitals HR</p>
    </div>
  `;

  return { subject, text, html };
}
