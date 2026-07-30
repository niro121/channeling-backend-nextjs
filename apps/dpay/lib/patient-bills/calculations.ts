import type { BillLineItem, PatientBillSummary } from '@/types/patient-bill';

export function isLineItemFilled(item: BillLineItem): boolean {
  return (
    item.doctorName.trim() !== '' ||
    item.description.trim() !== '' ||
    item.amount > 0
  );
}

export function countFilledLineItems(lineItems: BillLineItem[]): number {
  return lineItems.filter(isLineItemFilled).length;
}

export function countUniqueDoctors(lineItems: BillLineItem[]): number {
  const names = lineItems
    .map((item) => item.doctorName.trim())
    .filter((name) => name.length > 0);
  return new Set(names).size;
}

export function calculateSubtotal(lineItems: BillLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function calculatePatientBillSummary(lineItems: BillLineItem[]): PatientBillSummary {
  const subtotal = calculateSubtotal(lineItems);
  return {
    lineItemCount: countFilledLineItems(lineItems),
    doctorCount: countUniqueDoctors(lineItems),
    subtotal,
    total: subtotal,
  };
}

export function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
