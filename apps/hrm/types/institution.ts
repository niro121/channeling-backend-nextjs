type InstitutionItem = {
  id: number;
  name: string;
  /** Compact code for dense UI (pending cards, filters, etc.). */
  code: string;
};

/** Institution master options (aligned with Channeling). */
export const INSTITUTION_LIST: readonly InstitutionItem[] = [
  { id: 0, name: 'Ruhunu Hospital (Pvt) Ltd  (RH)', code: 'RH' },
  {
    id: 1,
    name: 'Ruhunu Hospital Diagnostics (Private) Limited  (RHD)',
    code: 'RHD'
  },
  { id: 2, name: 'Ruhunu Hospital Training  (RHT)', code: 'RHT' },
  {
    id: 3,
    name: 'Ruhunu Pharmaceuticals & Services (Pvt) Ltd  (RPS)',
    code: 'RPS'
  }
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

export function getInstitutionShortCode(
  id: number | null | undefined
): string {
  if (id == null) return '';
  return INSTITUTION_LIST.find((item) => item.id === id)?.code ?? '';
}
