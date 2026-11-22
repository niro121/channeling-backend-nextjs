export function shortlistedSmsTemplate(input: {
  candidateName: string;
  position: string;
}): string {
  return `Dear ${input.candidateName}, you have been shortlisted for ${input.position}. HR will contact you with next steps. — Ruhunu Hospitals HR`;
}

export function applicationRejectedSmsTemplate(input: {
  candidateName: string;
  position: string;
}): string {
  return `Dear ${input.candidateName}, thank you for applying for ${input.position}. We will not be progressing your application at this time. — Ruhunu Hospitals HR`;
}

export function evaluationOutcomeSmsTemplate(input: {
  candidateName: string;
  position: string;
  progressed: boolean;
}): string {
  return input.progressed
    ? `Dear ${input.candidateName}, your interview for ${input.position} has progressed. HR will contact you with next steps. — Ruhunu Hospitals HR`
    : `Dear ${input.candidateName}, your interview evaluation for ${input.position} is complete. HR will contact you. — Ruhunu Hospitals HR`;
}
