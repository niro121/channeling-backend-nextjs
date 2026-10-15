import type { Prisma } from '@/lib/generated/prisma';
import type { BillLineItem, BillLineItemStatus } from '@/types/patient-bill';

export const BILL_LINE_ITEM_STATUS = {
  active: 'active',
  deleted: 'deleted',
} as const satisfies Record<string, BillLineItemStatus>;

/** Matches active items, including legacy rows before status existed. */
export const activeLineItemWhere: Prisma.PatientBillItemWhereInput = {
  NOT: { status: BILL_LINE_ITEM_STATUS.deleted },
};

export function normalizeLineItemStatus(status?: string | null): BillLineItemStatus {
  return status === BILL_LINE_ITEM_STATUS.deleted
    ? BILL_LINE_ITEM_STATUS.deleted
    : BILL_LINE_ITEM_STATUS.active;
}

export function isActiveLineItem(item: Pick<BillLineItem, 'status'>): boolean {
  return normalizeLineItemStatus(item.status) === BILL_LINE_ITEM_STATUS.active;
}

export function isDeletedLineItem(item: Pick<BillLineItem, 'status'>): boolean {
  return normalizeLineItemStatus(item.status) === BILL_LINE_ITEM_STATUS.deleted;
}

export function countActiveLineItems(items: BillLineItem[]): number {
  return items.filter(isActiveLineItem).length;
}

export function sumActiveLineItemAmounts(items: BillLineItem[]): number {
  return items
    .filter(isActiveLineItem)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}
