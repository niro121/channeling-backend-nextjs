"use server";

import prisma from "@/lib/prisma";
import { REFERENCE_TYPES } from "@/types/accounting";

export type ReceiptDetailJournalLine = {
  accountId: string;
  accountName: string;
  accountCode: string | null;
  accountType: string;
  debitAmount: number;
  creditAmount: number;
  memo: string | null;
  paymentMethod: number | null;
};

export type ReceiptDetailJournal = {
  id: string;
  journalNumber: number | null;
  date: Date;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  locationId: string | null;
  locationName: string | null;
  lines: ReceiptDetailJournalLine[];
};

export type ReceiptDetail = {
  id: string;
  receiptNo: number;
  receiptNoString: string;
  method: number;
  type: number;
  paymentMethod: number;
  amount: number;
  whd: number;
  remarks: string;
  locationId: string | null;
  locationName: string | null;
  createdAt: Date;
  createdBy: string | null;
  bookingId: string | null;
  journal: ReceiptDetailJournal | null;
};

export type GetReceiptDetailResult =
  | { success: true; data: ReceiptDetail }
  | { success: false; message: string };

/**
 * Get a single receipt by id with its linked double-entry journal (if any).
 * Journal is the one with referenceType = 'Receipt' and referenceId = receipt.id.
 */
export async function getReceiptDetailService(
  receiptId: string
): Promise<GetReceiptDetailResult> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      receiptNo: true,
      receiptNoString: true,
      method: true,
      type: true,
      paymentMethod: true,
      amount: true,
      whd: true,
      remarks: true,
      locationId: true,
      createdAt: true,
      createdBy: true,
      bookingId: true,
      location: { select: { name: true } },
    },
  });

  if (!receipt) {
    return { success: false, message: "Receipt not found." };
  }

  const journal = await prisma.journal.findFirst({
    where: {
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receiptId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      journalLines: {
        include: {
          account: { select: { id: true, name: true, code: true, type: true } },
        },
      },
      location: { select: { name: true } },
    },
  });

  const journalDetail: ReceiptDetailJournal | null = journal
    ? {
        id: journal.id,
        journalNumber: journal.journalNumber,
        date: journal.date,
        description: journal.description,
        referenceType: journal.referenceType,
        referenceId: journal.referenceId,
        locationId: journal.locationId,
        locationName: journal.location?.name ?? null,
        lines: journal.journalLines.map((l) => ({
          accountId: l.accountId,
          accountName: l.account.name,
          accountCode: l.account.code ?? null,
          accountType: l.account.type,
          debitAmount: l.debitAmount,
          creditAmount: l.creditAmount,
          memo: l.memo,
          paymentMethod: l.paymentMethod,
        })),
      }
    : null;

  return {
    success: true,
    data: {
      id: receipt.id,
      receiptNo: receipt.receiptNo,
      receiptNoString: receipt.receiptNoString,
      method: receipt.method,
      type: receipt.type,
      paymentMethod: receipt.paymentMethod,
      amount: receipt.amount,
      whd: receipt.whd,
      remarks: receipt.remarks,
      locationId: receipt.locationId,
      locationName: receipt.location?.name ?? null,
      createdAt: receipt.createdAt,
      createdBy: receipt.createdBy,
      bookingId: receipt.bookingId,
      journal: journalDetail,
    },
  };
}
