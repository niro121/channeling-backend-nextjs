import type {
  SalaryCycleServiceRecord,
  SalaryCycleUiRecord
} from '@/types/salary-cycle';

export function mapSalaryCycleToUiRecord(
  record: SalaryCycleServiceRecord
): SalaryCycleUiRecord {
  return {
    id: record.id,
    institutionId: record.institutionId,
    salaryFromDate: record.salaryFromDate,
    salaryToDate: record.salaryToDate,
    advanceFromDate: record.advanceFromDate,
    advanceToDate: record.advanceToDate,
    otFromDate: record.otFromDate,
    otToDate: record.otToDate,
    dayOffFromDate: record.dayOffFromDate,
    dayOffToDate: record.dayOffToDate,
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
