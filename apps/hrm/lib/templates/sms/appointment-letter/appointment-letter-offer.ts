export type AppointmentLetterSmsInput = {
  candidateName: string;
  letterNumber: string;
  position: string;
  appointmentDate: string;
};

/**
 * SMS template notifying a candidate that an appointment letter was issued.
 */
export function appointmentLetterSmsTemplate(
  input: AppointmentLetterSmsInput
): string {
  return [
    `Dear ${input.candidateName},`,
    `Your appointment letter ${input.letterNumber} for ${input.position}`,
    input.appointmentDate
      ? `(reporting ${input.appointmentDate})`
      : '',
    'has been issued. Please check your email or contact HR.',
    '- Ruhunu Hospitals'
  ]
    .filter(Boolean)
    .join(' ');
}
