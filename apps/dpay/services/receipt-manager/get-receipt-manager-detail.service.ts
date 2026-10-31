import { fetchChannelingDpayJournals } from '@/lib/channeling/public-api';
import { getReceiptById } from '@/services/receipts/get-receipts.service';
import type { ReceiptListItem } from '@/types/receipt';

export type ReceiptManagerJournalLine = {
  id: string;
  accountId: string;
  accountCode: string | null;
  accountName: string;
  accountType: string;
  debitAmount: number;
  creditAmount: number;
  memo: string | null;
  paymentMethod: number | null;
};

export type ReceiptManagerJournal = {
  id: string;
  journalNumber: number | null;
  date: string;
  description: string;
  lines: ReceiptManagerJournalLine[];
};

export type ReceiptManagerDetail = ReceiptListItem & {
  journals: ReceiptManagerJournal[];
};

export type GetReceiptManagerDetailResult =
  | { success: true; data: ReceiptManagerDetail }
  | { success: false; message: string };

const REFUND_JOURNAL_PREFIXES = [
  'DPAY refund',
  'DPAY bill cancel refund',
  'Reverse failed DPAY refund',
  'Reverse failed DPAY bill cancel refund',
];

function isObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value);
}

/** Refund journals are stored on the original receipt id. A refund slip shows those, not the payment. */
function journalsForReceipt(
  receipt: ReceiptListItem,
  journals: ReceiptManagerJournal[]
): ReceiptManagerJournal[] {
  if (!receipt.refundOfReceiptId) return journals;
  return journals.filter((journal) =>
    REFUND_JOURNAL_PREFIXES.some((prefix) => journal.description.trim().startsWith(prefix))
  );
}

export async function getReceiptManagerDetail(
  receiptId: string
): Promise<GetReceiptManagerDetailResult> {
  const id = receiptId.trim();
  if (!isObjectId(id)) {
    return { success: false, message: 'Receipt not found.' };
  }

  const receipt = await getReceiptById(id);
  if (!receipt) {
    return { success: false, message: 'Receipt not found.' };
  }

  const referenceId = receipt.refundOfReceiptId?.trim() || receipt.id;
  if (!isObjectId(referenceId)) {
    return { success: false, message: 'Receipt not found.' };
  }

  let journals: ReceiptManagerJournal[];
  try {
    const posted = await fetchChannelingDpayJournals({
      referenceType: 'DpayReceipt',
      referenceId,
    });
    journals = posted.map((journal) => ({
      id: journal.id,
      journalNumber: journal.journalNumber,
      date: journal.date,
      description: journal.description,
      lines: journal.lines,
    }));
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Could not load the linked journals.',
    };
  }

  return {
    success: true,
    data: {
      ...receipt,
      journals: journalsForReceipt(receipt, journals),
    },
  };
}
