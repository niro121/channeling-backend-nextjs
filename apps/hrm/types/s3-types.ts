/** Logical folders under the HRM bucket (override via env on the server). */
export const HRM_S3_PREFIXES = {
  resumes: 'resumes',
  appointmentLetters: 'appointment-letters',
  documents: 'documents'
} as const;

export type HrmS3PrefixKind = keyof typeof HRM_S3_PREFIXES;
