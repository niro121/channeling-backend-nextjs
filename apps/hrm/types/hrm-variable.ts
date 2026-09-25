export type HrmVariableAuditUser = {
  name: string;
  role?: string;
};

/** Singleton statutory contribution rates (employee + company). */
export type HrmStatutoryRates = {
  epfEmployee: number | null;
  epfCompany: number | null;
  etfEmployee: number | null;
  etfCompany: number | null;
};

export type HrmStatutoryRatesFormValues = {
  epfEmployee: string;
  epfCompany: string;
  etfEmployee: string;
  etfCompany: string;
};

/** Progressive PAYE tax slab. `toSalary` null = open-ended (∞). */
export type HrmPayeSlab = {
  id: string;
  fromSalary: number;
  toSalary: number | null;
  taxRate: number;
};

export type HrmPayeSlabDraft = {
  fromSalary: string;
  toSalary: string;
  taxRate: string;
};

/** Full UI record for the HRM Variable screen (singleton + slabs). */
export type HrmVariableUiRecord = {
  id: string | null;
  rates: HrmStatutoryRates;
  slabs: HrmPayeSlab[];
  createdAt: string | null;
  updatedAt: string | null;
  createdByUser: HrmVariableAuditUser | null;
  updatedByUser: HrmVariableAuditUser | null;
};

export const emptyStatutoryRatesFormValues =
  (): HrmStatutoryRatesFormValues => ({
    epfEmployee: '',
    epfCompany: '',
    etfEmployee: '',
    etfCompany: ''
  });

export const emptyPayeSlabDraft = (): HrmPayeSlabDraft => ({
  fromSalary: '',
  toSalary: '',
  taxRate: ''
});

export const emptyHrmVariableRecord = (): HrmVariableUiRecord => ({
  id: null,
  rates: {
    epfEmployee: null,
    epfCompany: null,
    etfEmployee: null,
    etfCompany: null
  },
  slabs: [],
  createdAt: null,
  updatedAt: null,
  createdByUser: null,
  updatedByUser: null
});

export function ratesToFormValues(
  rates: HrmStatutoryRates
): HrmStatutoryRatesFormValues {
  const fmt = (n: number | null) =>
    n == null || Number.isNaN(n) ? '' : String(n);
  return {
    epfEmployee: fmt(rates.epfEmployee),
    epfCompany: fmt(rates.epfCompany),
    etfEmployee: fmt(rates.etfEmployee),
    etfCompany: fmt(rates.etfCompany)
  };
}

export function formatRatePercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
}

export function formatSalaryLkr(value: number | null | undefined): string {
  if (value == null) return '∞';
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}
