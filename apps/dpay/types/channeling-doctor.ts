export type PublicDoctor = {
  id: string;
  title: string;
  name: string;
  code: string;
  specialityId: string | null;
  specialityName: string | null;
};

/** Display label stored on bill line items: "Dr. Name — Speciality" */
export function formatPublicDoctorLabel(doctor: PublicDoctor): string {
  const fullName = `${doctor.title ?? ''} ${doctor.name ?? ''}`.trim();
  if (doctor.specialityName?.trim()) {
    return `${fullName} — ${doctor.specialityName.trim()}`;
  }
  return fullName;
}
