const RECEIPT_METHOD_NAMES: Record<number, string> = {
  0: "Refund",
  1: "Payment",
  2: "Debit Note",
  3: "Credit Note",
  4: "Doctor Payment",
  5: "Doctor Cancel",
  6: "Agency Deposit",
  7: "Agency Withdraw",
  8: "Branch Income",
  9: "Branch Expense",
};

export function getReceiptMethodLabel(method: number): string {
  return RECEIPT_METHOD_NAMES[method] ?? `Method ${method}`;
}
