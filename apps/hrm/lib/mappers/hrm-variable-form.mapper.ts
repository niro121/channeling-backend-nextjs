import {
  emptyHrmVariableRecord,
  type HrmVariableServiceRecord,
  type HrmVariableUiRecord
} from '@/types/hrm-variable';

export function mapHrmVariableToUiRecord(
  record: HrmVariableServiceRecord | null | undefined
): HrmVariableUiRecord {
  if (!record) return emptyHrmVariableRecord();

  return {
    id: record.id,
    rates: {
      epfEmployee: record.epfEmployee,
      epfCompany: record.epfCompany,
      etfEmployee: record.etfEmployee,
      etfCompany: record.etfCompany
    },
    slabs: record.slabs.map((slab) => ({
      id: slab.id,
      fromSalary: slab.fromSalary,
      toSalary: slab.toSalary,
      taxRate: slab.taxRate
    })),
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    createdByUser: {
      name: record.createdUser?.name ?? '—',
      role: undefined
    },
    updatedByUser: {
      name: record.updatedUser?.name ?? '—',
      role: undefined
    }
  };
}
