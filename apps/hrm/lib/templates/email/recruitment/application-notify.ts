function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type ApplicationNotifyEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function shortlistedEmailTemplate(input: {
  candidateName: string;
  position: string;
  applicationCode: string;
}): ApplicationNotifyEmailContent {
  const subject = `Shortlisted · ${input.position}`;
  const text = [
    `Dear ${input.candidateName},`,
    '',
    `You have been shortlisted for ${input.position}.`,
    `Application: ${input.applicationCode}`,
    'Our HR team will contact you about the next steps.',
    '',
    '— Ruhunu Hospitals HR'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
      <p>Dear <strong>${escapeHtml(input.candidateName)}</strong>,</p>
      <p>You have been shortlisted for <strong>${escapeHtml(input.position)}</strong>.</p>
      <p>Application: ${escapeHtml(input.applicationCode)}</p>
      <p>Our HR team will contact you about the next steps.</p>
      <p style="color:#666;">— Ruhunu Hospitals HR</p>
    </div>
  `;

  return { subject, text, html };
}

export function applicationRejectedEmailTemplate(input: {
  candidateName: string;
  position: string;
  applicationCode: string;
}): ApplicationNotifyEmailContent {
  const subject = `Application update · ${input.position}`;
  const text = [
    `Dear ${input.candidateName},`,
    '',
    `Thank you for your interest in ${input.position} at Ruhunu Hospitals.`,
    `After careful review of application ${input.applicationCode}, we will not be progressing your application at this time.`,
    '',
    'We appreciate the time you invested and wish you every success.',
    '',
    '— Ruhunu Hospitals HR'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
      <p>Dear <strong>${escapeHtml(input.candidateName)}</strong>,</p>
      <p>Thank you for your interest in <strong>${escapeHtml(
        input.position
      )}</strong> at Ruhunu Hospitals.</p>
      <p>After careful review of application ${escapeHtml(
        input.applicationCode
      )}, we will not be progressing your application at this time.</p>
      <p>We appreciate the time you invested and wish you every success.</p>
      <p style="color:#666;">— Ruhunu Hospitals HR</p>
    </div>
  `;

  return { subject, text, html };
}

export function evaluationOutcomeEmailTemplate(input: {
  candidateName: string;
  position: string;
  progressed: boolean;
}): ApplicationNotifyEmailContent {
  const subject = `Interview update · ${input.position}`;
  const outcome = input.progressed
    ? 'Your interview evaluation has been completed and you have progressed to the next stage. Our HR team will contact you with next steps.'
    : 'Your interview evaluation has been completed. Our HR team will contact you regarding the outcome.';

  const text = [
    `Dear ${input.candidateName},`,
    '',
    outcome,
    '',
    '— Ruhunu Hospitals HR'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
      <p>Dear <strong>${escapeHtml(input.candidateName)}</strong>,</p>
      <p>${escapeHtml(outcome)}</p>
      <p style="color:#666;">— Ruhunu Hospitals HR</p>
    </div>
  `;

  return { subject, text, html };
}
