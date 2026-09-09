import type { Prisma } from '@prisma/client';

/** Matches in-app `!receiptNoString?.trim()` — booking was never paid via receipt. */
export function bookingHasNoPaymentReceipt(receiptNoString: string | null | undefined): boolean {
  return !receiptNoString?.trim();
}

/**
 * Prisma/Mongo filter: no payment receipt on booking.
 * Pending bookings omit `receiptNoString`; `{ receiptNoString: null }` alone often does not match.
 */
export function bookingHasNoPaymentReceiptWhere(): Prisma.BookingWhereInput {
  return {
    OR: [
      { receiptNoString: { isSet: false } },
      { receiptNoString: null },
      { receiptNoString: '' },
    ],
  };
}

/** Prisma/Mongo filter: booking has a non-empty payment receipt number. */
export function bookingHasPaymentReceiptWhere(): Prisma.BookingWhereInput {
  return {
    AND: [{ receiptNoString: { isSet: true } }, { receiptNoString: { not: '' } }],
  };
}

/**
 * Unpaid cancel event in transaction window — same OR as report fetch
 * (`canceledAt` in range, or `updatedAt` when legacy rows lack `canceledAt`).
 */
export function isUnpaidCancelEventInRange(
  canceledAt: Date | null | undefined,
  updatedAt: Date | null | undefined,
  from: Date,
  to: Date
): boolean {
  const inRange = (date: Date | null | undefined) => {
    if (!date) return false;
    const t = date.getTime();
    return t >= from.getTime() && t <= to.getTime();
  };
  return inRange(canceledAt) || inRange(updatedAt);
}
