import type {
  PatientBill,
  PatientBillDetail,
  PatientBillDraft,
  PatientBillPaymentMethod,
  PatientBillReceipt,
} from '@/types/patient-bill';
import { calculateSubtotal, isLineItemFilled } from '@/lib/patient-bills/calculations';
import { computeBillPaymentStatus } from '@/lib/patient-bills/payment-status';

type BillWithItems = {
  id: string;
  bxtNumber: string;
  billNumber: string;
  admissionDate: Date;
  dischargeDate: Date | null;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  createdAt: Date;
  createdByName?: string | null;
  lineItems: Array<{ doctorName: string; sortOrder: number }>;
};

type BillDetailRecord = {
  id: string;
  bxtNumber: string;
  billNumber: string;
  admissionDate: Date;
  dischargeDate: Date | null;
  customerName: string;
  customerNicPhone: string | null;
  customerAddress: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  cancelReason?: string | null;
  canceledAt?: Date | null;
  canceledByName?: string | null;
  createdAt: Date;
  createdByName?: string | null;
  lineItems: Array<{
    id: string;
    doctorName: string;
    description: string;
    amount: number;
    sortOrder: number;
  }>;
  receipts: Array<{
    id: string;
    receiptNumber: string;
    amountPaid: number;
    paymentMethod: string;
    referenceNumber: string | null;
    remarks: string | null;
    outstandingAfter: number;
    paymentDate: Date;
    status?: string | null;
    cancelReason?: string | null;
    canceledAt?: Date | null;
    canceledByName?: string | null;
    createdByName?: string | null;
  }>;
};

function mapLineItems(
  lineItems: BillDetailRecord['lineItems']
): PatientBillDetail['lineItems'] {
  return [...lineItems]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.id,
      doctorName: item.doctorName,
      description: item.description,
      amount: item.amount,
    }));
}

function mapReceipts(receipts: BillDetailRecord['receipts']): PatientBillReceipt[] {
  return [...receipts]
    .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())
    .map((receipt) => ({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      amountPaid: receipt.amountPaid,
      paymentMethod: receipt.paymentMethod as PatientBillPaymentMethod,
      referenceNumber: receipt.referenceNumber,
      remarks: receipt.remarks,
      outstandingAfter: receipt.outstandingAfter,
      paymentDate: receipt.paymentDate.toISOString(),
      status: (receipt.status as PatientBillReceipt['status']) || 'active',
      cancelReason: receipt.cancelReason ?? null,
      canceledAt: receipt.canceledAt?.toISOString() ?? null,
      canceledByName: receipt.canceledByName ?? null,
      createdByName: receipt.createdByName ?? null,
    }));
}

export function mapPatientBillRecord(record: BillWithItems): PatientBill {
  const sortedItems = [...record.lineItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const primaryDoctor =
    sortedItems.find((item) => item.doctorName.trim())?.doctorName.trim() || '—';

  return {
    id: record.id,
    billNo: record.billNumber,
    bxtNo: record.bxtNumber,
    patient: {
      id: record.id,
      name: record.customerName,
      doctorName: primaryDoctor,
    },
    admissionDate: record.admissionDate.toISOString(),
    dischargeDate: record.dischargeDate?.toISOString() ?? null,
    totalAmount: record.totalAmount,
    paidAmount: record.paidAmount,
    outstandingAmount: record.outstandingAmount,
    status: record.status as PatientBill['status'],
    createdAt: record.createdAt.toISOString(),
    createdByName: record.createdByName ?? null,
  };
}

export function mapPatientBillDetail(record: BillDetailRecord): PatientBillDetail {
  return {
    id: record.id,
    bxtNumber: record.bxtNumber,
    billNumber: record.billNumber,
    customerName: record.customerName,
    customerNicPhone: record.customerNicPhone,
    customerAddress: record.customerAddress,
    admissionDate: record.admissionDate.toISOString(),
    dischargeDate: record.dischargeDate?.toISOString() ?? null,
    totalAmount: record.totalAmount,
    paidAmount: record.paidAmount,
    outstandingAmount: record.outstandingAmount,
    status: record.status as PatientBillDetail['status'],
    cancelReason: record.cancelReason ?? null,
    canceledAt: record.canceledAt?.toISOString() ?? null,
    canceledByName: record.canceledByName ?? null,
    createdAt: record.createdAt.toISOString(),
    createdByName: record.createdByName ?? null,
    lineItems: mapLineItems(record.lineItems),
    receipts: mapReceipts(record.receipts),
  };
}

export function recordToDraft(record: PatientBillDetail): PatientBillDraft {
  return {
    bxtNumber: record.bxtNumber,
    billNumber: record.billNumber,
    admissionDate: record.admissionDate,
    dischargeDate: record.dischargeDate ?? null,
    customerName: record.customerName,
    customerNicPhone: record.customerNicPhone ?? '',
    customerAddress: record.customerAddress ?? '',
    lineItems: record.lineItems,
  };
}

function buildLineItemPayload(draft: PatientBillDraft) {
  return draft.lineItems.filter(isLineItemFilled).map((item, index) => ({
    id: item.id,
    sortOrder: index,
    doctorName: item.doctorName.trim(),
    description: item.description.trim(),
    amount: item.amount,
  }));
}

export function draftToCreatePayload(draft: PatientBillDraft) {
  const lineItems = buildLineItemPayload(draft);
  const totalAmount = calculateSubtotal(draft.lineItems.filter(isLineItemFilled));

  return {
    bxtNumber: draft.bxtNumber,
    billNumber: draft.billNumber,
    admissionDate: new Date(draft.admissionDate!),
    dischargeDate: draft.dischargeDate ? new Date(draft.dischargeDate) : null,
    customerName: draft.customerName.trim(),
    customerNicPhone: draft.customerNicPhone.trim() || null,
    customerAddress: draft.customerAddress.trim() || null,
    totalAmount,
    paidAmount: 0,
    outstandingAmount: totalAmount,
    status: computeBillPaymentStatus(0, totalAmount),
    lineItems,
  };
}

export function draftToUpdatePayload(draft: PatientBillDraft, paidAmount: number) {
  const lineItems = buildLineItemPayload(draft);
  const totalAmount = calculateSubtotal(draft.lineItems.filter(isLineItemFilled));
  const outstandingAmount = Math.max(0, totalAmount - paidAmount);
  const status = computeBillPaymentStatus(paidAmount, totalAmount);

  return {
    admissionDate: new Date(draft.admissionDate!),
    dischargeDate: draft.dischargeDate ? new Date(draft.dischargeDate) : null,
    customerName: draft.customerName.trim(),
    customerNicPhone: draft.customerNicPhone.trim() || null,
    customerAddress: draft.customerAddress.trim() || null,
    totalAmount,
    outstandingAmount,
    status,
    lineItems,
  };
}
