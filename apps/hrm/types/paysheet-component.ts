import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

export const PAYSHEET_COMPONENT_CODE_PREFIX = 'PSC';

/** Tab / persistence kind — same form for both. */
export const PAYSHEET_COMPONENT_KINDS = ['system', 'custom'] as const;
export type PaysheetComponentKind = (typeof PAYSHEET_COMPONENT_KINDS)[number];

export const PAYSHEET_COMPONENT_KIND_LABELS: Record<
  PaysheetComponentKind,
  string
> = {
  system: 'System based',
  custom: 'Custom'
};

/** Component type ids — store `typeId` on the record. */
export const PAYSHEET_COMPONENT_TYPES = [
  'basic_salary',
  'fixed_allowance',
  'percentage_allowance',
  'fixed_deduction',
  'loan',
  'advance',
  'ot'
] as const;
export type PaysheetComponentTypeId =
  (typeof PAYSHEET_COMPONENT_TYPES)[number];

export const PAYSHEET_COMPONENT_TYPE_LABELS: Record<
  PaysheetComponentTypeId,
  string
> = {
  basic_salary: 'Basic salary',
  fixed_allowance: 'Fixed allowance',
  percentage_allowance: 'Percentage allowance',
  fixed_deduction: 'Fixed deduction',
  loan: 'Loan',
  advance: 'Advance',
  ot: 'OT'
};

/** Included-for flag ids — store checked ids in `includedForIds`. */
export const PAYSHEET_COMPONENT_INCLUDED_FOR = [
  'epf',
  'etf',
  'pay_tax',
  'ot',
  'no_pay',
  'ph',
  'allowances_ph_day_off'
] as const;
export type PaysheetComponentIncludedForId =
  (typeof PAYSHEET_COMPONENT_INCLUDED_FOR)[number];

export const PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS: Record<
  PaysheetComponentIncludedForId,
  string
> = {
  epf: 'Included for EPF',
  etf: 'Included for ETF',
  pay_tax: 'Included for Pay Tax',
  ot: 'Included for OT',
  no_pay: 'Included for No Pay',
  ph: 'Included for PH',
  allowances_ph_day_off:
    'Included for Allowances (for payment in PH and Day-off)'
};

export type PaysheetComponentAuditUser = {
  name: string;
  role?: string;
};

export type PaysheetComponentUiRecord = {
  id: string;
  code: string;
  name: string;
  kind: PaysheetComponentKind;
  typeId: PaysheetComponentTypeId | string;
  orderNo: number;
  /** Required when typeId is percentage_allowance; otherwise null/undefined. */
  percentage: number | null;
  includedForIds: PaysheetComponentIncludedForId[] | string[];
  createdAt: string;
  updatedAt: string;
  createdByUser: PaysheetComponentAuditUser;
  updatedByUser: PaysheetComponentAuditUser;
};

export type PaysheetComponentFormValues = {
  name: string;
  code: string;
  typeId: string;
  orderNo: string;
  percentage: string;
  includedForIds: string[];
};

export type PaysheetComponentPayload = {
  name: string;
  kind: PaysheetComponentKind;
  typeId: PaysheetComponentTypeId | string;
  orderNo: number;
  percentage?: number | null;
  includedForIds: string[];
};

export type GetPaysheetComponentParams = {
  search?: string;
  kind?: PaysheetComponentKind;
  /** When set, only components whose typeId is in this list. */
  typeIds?: string[];
};

/** Lightweight option for Combobox / filters outside the master module. */
export type PaysheetComponentOption = {
  id: string;
  name: string;
};

export type PaysheetComponentServiceRecord = {
  id: string;
  code: string;
  name: string;
  kind: PaysheetComponentKind | string;
  typeId: string;
  orderNo: number;
  percentage: number | null;
  includedForIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export function emptyPaysheetComponentFormValues(): PaysheetComponentFormValues {
  return {
    name: '',
    code: '',
    typeId: '',
    orderNo: '0',
    percentage: '',
    includedForIds: []
  };
}

export function paysheetComponentTypeOptions() {
  return PAYSHEET_COMPONENT_TYPES.map((id) => ({
    id,
    name: PAYSHEET_COMPONENT_TYPE_LABELS[id]
  }));
}
