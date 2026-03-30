'use server';

import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import type { ChannelAgentReceiptReportQuery, ChannelAgentReceiptReportRow } from '@/types/reports/channel-agent-receipt';

const BOOKING_STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Paid',
  2: 'Cancel',
  3: 'Refund',
};

export async function getChannelAgentReceiptReportService(
  query: ChannelAgentReceiptReportQuery
): Promise<{
  success: boolean;
  data?: ChannelAgentReceiptReportRow[];
  totalRecords?: number;
  message?: string;
}> {
  try {
    const bookNo = query.bookNo?.trim();
    if (!bookNo) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        agencyRef: {
          startsWith: bookNo,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        bookingid_string: true,
        title: true,
        name: true,
        status: true,
        agency: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (bookings.length === 0) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const bookingById = new Map(bookings.map((b) => [b.id, b]));

    const receipts = await prisma.receipt.findMany({
      where: {
        bookingId: { in: bookings.map((b) => b.id) },
      },
      select: {
        id: true,
        receiptNoString: true,
        amount: true,
        createdAt: true,
        createdBy: true,
        bookingId: true,
      },
      orderBy: [{ createdAt: 'desc' }, { receiptNo: 'desc' }],
    });

    const creatorIds = Array.from(new Set(receipts.map((r) => r.createdBy).filter(Boolean))) as string[];
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: {
            id: true,
            name: true,
            staff: { select: { code: true } },
          },
        })
      : [];
    const creatorById = new Map(creators.map((u) => [u.id, formatUserDisplayName(u.name, u.id, u.staff?.code)]));

    const data: ChannelAgentReceiptReportRow[] = receipts.map((receipt) => {
      const booking = receipt.bookingId ? bookingById.get(receipt.bookingId) : null;
      const patientName = [booking?.title, booking?.name].filter(Boolean).join(' ').trim() || '-';
      const statusNum = Number(booking?.status ?? 0);

      return {
        id: receipt.id,
        refNo: receipt.receiptNoString || '-',
        billNo: booking?.bookingid_string || '-',
        agency: booking?.agency?.name || '-',
        patient: patientName,
        status: BOOKING_STATUS_LABELS[statusNum] ?? String(statusNum),
        creator: receipt.createdBy ? creatorById.get(receipt.createdBy) || 'Unknown user' : 'System',
        createdDate: receipt.createdAt,
        billValue: Number(receipt.amount ?? 0),
      };
    });

    return {
      success: true,
      data,
      totalRecords: data.length,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch channel agent receipt report';
    console.error('getChannelAgentReceiptReportService error:', error);
    return {
      success: false,
      message: msg,
    };
  }
}
