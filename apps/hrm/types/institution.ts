type InstitutionItem = {
  id: number;
  name: string;
};

/** Institution master options (aligned with Channeling). */
export const INSTITUTION_LIST: readonly InstitutionItem[] = [
  { id: 0, name: 'Ruhunu Hospital (Pvt) Ltd  (RH)' },
  { id: 1, name: 'Ruhunu Hospital Diagnostics (Private) Limited  (RHD)' },
  { id: 2, name: 'Ruhunu Hospital Training  (RHT)' },
  { id: 3, name: 'Ruhunu Pharmaceuticals & Services (Pvt) Ltd  (RPS)' }
] as const;

export type InstitutionOption = {
  id: string;
  name: string;
};

export const INSTITUTION_OPTIONS: InstitutionOption[] = INSTITUTION_LIST.map(
  (item) => ({
    id: String(item.id),
    name: item.name
  })
);

export function getInstitutionName(id: number | null | undefined): string {
  if (id == null) return '—';
  return INSTITUTION_LIST.find((item) => item.id === id)?.name ?? '—';
}
