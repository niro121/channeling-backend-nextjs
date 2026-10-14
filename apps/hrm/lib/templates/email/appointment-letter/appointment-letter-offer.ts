export type AppointmentLetterEmailInput = {
  candidateName: string;
  letterNumber: string;
  position: string;
  department: string;
  appointmentDate: string;
  salary: string;
};

export type AppointmentLetterEmailContent = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Email template notifying a candidate that an appointment letter is ready.
 */
export function appointmentLetterEmailTemplate(
  input: AppointmentLetterEmailInput
): AppointmentLetterEmailContent {
  const subject = `Appointment letter · ${input.letterNumber} · ${input.position}`;
  const text = [
    `Dear ${input.candidateName},`,
    '',
    'We are pleased to share your appointment letter from Ruhunu Hospitals.',
    `Letter: ${input.letterNumber}`,
    `Position: ${input.position}`,
    `Department: ${input.department || '—'}`,
    `Reporting date: ${input.appointmentDate || '—'}`,
    `Salary: ${input.salary || '—'}`,
    '',
    'Please contact HR if you have any questions.',
    '',
    '— Ruhunu Hospitals HR'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
      <p>Dear <strong>${escapeHtml(input.candidateName)}</strong>,</p>
      <p>We are pleased to share your appointment letter from Ruhunu Hospitals.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Letter</td><td>${escapeHtml(input.letterNumber)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Position</td><td>${escapeHtml(input.position)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Department</td><td>${escapeHtml(input.department || '—')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Reporting date</td><td>${escapeHtml(input.appointmentDate || '—')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Salary</td><td>${escapeHtml(input.salary || '—')}</td></tr>
      </table>
      <p>Please contact HR if you have any questions.</p>
      <p style="color:#666;">— Ruhunu Hospitals HR</p>
    </div>
  `;

  return { subject, text, html };
}
