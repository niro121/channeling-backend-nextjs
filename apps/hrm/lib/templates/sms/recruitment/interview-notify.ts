export function interviewRescheduledSmsTemplate(input: {
  candidateName: string;
  position: string;
  interviewDate: string;
  startTime: string;
}): string {
  return `Dear ${input.candidateName}, your interview for ${input.position} is rescheduled to ${input.interviewDate} at ${input.startTime}. — Ruhunu Hospitals HR`;
}

export function interviewCancelledSmsTemplate(input: {
  candidateName: string;
  position: string;
}): string {
  return `Dear ${input.candidateName}, your interview for ${input.position} has been cancelled. HR will contact you if a new slot is arranged. — Ruhunu Hospitals HR`;
}
