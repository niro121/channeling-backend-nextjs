import type { BillLineItemHistoryEntry } from '@/types/patient-bill';

export function isMongoObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

export function lineItemSnapshotChanged(
  previous: {
    doctorName: string;
    description: string;
    amount: number;
    sortOrder: number;
  },
  next: {
    doctorName: string;
    description: string;
    amount: number;
    sortOrder: number;
  }
): boolean {
  return (
    previous.doctorName !== next.doctorName ||
    previous.description !== next.description ||
    previous.amount !== next.amount ||
    previous.sortOrder !== next.sortOrder
  );
}

export function mapLineItemHistoryRecord(record: {
  id: string;
  action: string;
  changedAt: Date;
  changedByName?: string | null;
  doctorName?: string | null;
  description?: string | null;
  amount?: number | null;
  sortOrder?: number | null;
  previousDoctorName?: string | null;
  previousDescription?: string | null;
  previousAmount?: number | null;
  previousSortOrder?: number | null;
}): BillLineItemHistoryEntry {
  return {
    id: record.id,
    action: record.action as BillLineItemHistoryEntry['action'],
    changedAt: record.changedAt.toISOString(),
    changedByName: record.changedByName ?? null,
    doctorName: record.doctorName ?? null,
    description: record.description ?? null,
    amount: record.amount ?? null,
    sortOrder: record.sortOrder ?? null,
    previousDoctorName: record.previousDoctorName ?? null,
    previousDescription: record.previousDescription ?? null,
    previousAmount: record.previousAmount ?? null,
    previousSortOrder: record.previousSortOrder ?? null,
  };
}
