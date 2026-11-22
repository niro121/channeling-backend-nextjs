/**
 * Employment staff category const options (not Staff Speciality categories).
 * Single source for filters, Employment tab, Change Staff, and payroll.
 */
export const STAFF_CATEGORIES = [
  'medical',
  'nursing',
  'administrative',
  'technical',
  'support'
] as const;

export type StaffCategoryId = (typeof STAFF_CATEGORIES)[number];

export const STAFF_CATEGORY_LABELS: Record<StaffCategoryId, string> = {
  medical: 'Medical',
  nursing: 'Nursing',
  administrative: 'Administrative',
  technical: 'Technical',
  support: 'Support'
};

/** Select / Combobox options (`id` + `name`). */
export const STAFF_CATEGORY_OPTIONS = STAFF_CATEGORIES.map((id) => ({
  id,
  name: STAFF_CATEGORY_LABELS[id]
})) as ReadonlyArray<{ id: StaffCategoryId; name: string }>;

export function staffCategoryLabel(
  id: string | null | undefined
): string {
  if (!id) return '';
  if (id in STAFF_CATEGORY_LABELS) {
    return STAFF_CATEGORY_LABELS[id as StaffCategoryId];
  }
  return id;
}
