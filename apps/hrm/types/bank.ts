type BankItem = {
  id: string;
  name: string;
};

/** Sri Lankan bank options for payroll loans & advances (no bank master). */
export const BANK_LIST: readonly BankItem[] = [
  { id: 'boc', name: 'Bank of Ceylon (BOC)' },
  { id: 'peoples', name: "People's Bank" },
  { id: 'commercial', name: 'Commercial Bank of Ceylon' },
  { id: 'hnb', name: 'Hatton National Bank (HNB)' },
  { id: 'sampath', name: 'Sampath Bank' },
  { id: 'ndb', name: 'National Development Bank (NDB)' },
  { id: 'seylan', name: 'Seylan Bank' },
  { id: 'dfcc', name: 'DFCC Bank' },
  { id: 'nsb', name: 'National Savings Bank (NSB)' },
  { id: 'pan_asia', name: 'Pan Asia Banking Corporation' },
  { id: 'union', name: 'Union Bank of Colombo' },
  { id: 'cargills', name: 'Cargills Bank' },
  { id: 'amana', name: 'Amana Bank' },
  { id: 'hsbc', name: 'HSBC' },
  { id: 'standard_chartered', name: 'Standard Chartered Bank' },
  { id: 'other', name: 'Other' }
] as const;

export type BankOption = {
  id: string;
  name: string;
};

export const BANK_OPTIONS: BankOption[] = BANK_LIST.map((item) => ({
  id: item.id,
  name: item.name
}));

export function getBankName(id: string | null | undefined): string {
  if (!id?.trim()) return '—';
  return BANK_LIST.find((item) => item.id === id)?.name ?? id;
}
