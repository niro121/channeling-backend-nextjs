import type { Doctor } from '@/types/doctor';

/**
 * Format: "PROF. LAKMAL FONSEKA (DR0343)"
 */
export function formatDoctorName(
  doctor: Doctor | null | undefined
): string {
  if (!doctor) return '';

  let formattedTitle = '';

  if (doctor.title) {
    const cleanTitle = doctor.title.trim().toUpperCase();
    formattedTitle = cleanTitle.endsWith('.')
      ? cleanTitle
      : `${cleanTitle}.`;
  }

  const formattedName = doctor.name
    ? doctor.name.trim().toUpperCase()
    : '';

  const fullName = [formattedTitle, formattedName]
    .filter(Boolean)
    .join(' ');

  if (doctor.code) {
    return `${fullName} (${doctor.code.trim().toUpperCase()})`;
  }

  return fullName;
}

export function formatDoctorNameForSelect(
  doctor: Doctor | null | undefined
): string {
  return formatDoctorName(doctor);
}
