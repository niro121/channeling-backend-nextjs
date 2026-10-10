'use server';

import prisma from '@/lib/prisma';
import { AllDoctorViewReportQuery } from '@/types/report';
import moment from 'moment';

export type AllDoctorViewRowData = {
  no: number;
  consultantId: string;
  consultantName: string;
  consultantCode: string;
  notPaid: number;
  paid: number;
  cancel: number;
  hosRefund: number;
  proRefund: number;
  hosValid: number;
  proValid: number;
  nettValid: number;
  total: number;
  doctorSessionTimes: string[];
};

// ==== GET ALL DOCTOR VIEW REPORT DATA ==== //
export const getAllDoctorViewReportDataService = async ({
  date,
  sessionType,
  feeType,
  locationId
}: AllDoctorViewReportQuery) => {
  try {
    if (!date) {
      throw new Error('Date is required');
    }

    const sessionDateStart = moment(date).startOf('day').toDate();
    const sessionDateEnd = moment(date).endOf('day').toDate();

    // Build where clause for sessions
    const sessionWhere: any = {
      date: {
        gte: sessionDateStart,
        lte: sessionDateEnd,
      },
    };

    // Filter by location if provided
    if (locationId && locationId !== '__all__') {
      sessionWhere.locationId = locationId;
    }

    // Filter by session type (morning/evening)
    if (sessionType && sessionType !== '__all__') {
      const startOfDay = new Date(sessionDateStart);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(sessionDateEnd);
      endOfDay.setHours(23, 59, 59, 999);

      if (sessionType === 'morning') {
        // Morning: 12:00 AM to 11:59:59 AM
        const morningStart = new Date(startOfDay);
        morningStart.setHours(0, 0, 0, 0);
        const morningEnd = new Date(startOfDay);
        morningEnd.setHours(12, 0, 0, 0);
        sessionWhere.startTime = {
          gte: morningStart,
          lt: morningEnd,
        };
      } else if (sessionType === 'evening') {
        // Evening: 12:00 PM to 11:59:59 PM
        const eveningStart = new Date(startOfDay);
        eveningStart.setHours(12, 0, 0, 0);
        sessionWhere.startTime = {
          gte: eveningStart,
          lte: endOfDay,
        };
      }
    }

    // Fetch sessions with bookings
    const sessions = await prisma.session.findMany({
      where: sessionWhere,
      include: {
        doctor: {
          select: {
            id: true,
            title: true,
            name: true,
            code: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        bookings: {
          select: {
            id: true,
            status: true,
            receiptNoString: true,
            refund: true,
            canceledAt: true,
            refundReceiptCreatedAt: true,
            hospitalFee: true,
            hospitalFeeDiscount: true,
            professionalFee: true,
            professionsalFeeDiscount: true,
            amount: true,
          },
        },
      },
      orderBy: [
        { doctor: { name: 'asc' } },
        { startTime: 'asc' },
      ],
    });

    // Group by doctor and aggregate
    const doctorMap = new Map<string, AllDoctorViewRowData>();

    sessions.forEach((session) => {
      if (!session.doctor) return;

      const doctorId = session.doctor.id;
      const doctorKey = `${session.doctor.id}_${session.locationId || 'no-location'}`;

      if (!doctorMap.has(doctorKey)) {
        doctorMap.set(doctorKey, {
          no: 0, // Will be set later
          consultantId: doctorId,
          consultantName: `${session.doctor.title} ${session.doctor.name}`.trim(),
          consultantCode: session.doctor.code,
          notPaid: 0,
          paid: 0,
          cancel: 0,
          hosRefund: 0,
          proRefund: 0,
          hosValid: 0,
          proValid: 0,
          nettValid: 0,
          total: 0,
          doctorSessionTimes: [],
        });
      }

      const row = doctorMap.get(doctorKey)!;

      // Format session time
      const startTime = session.startTime instanceof Date 
        ? session.startTime 
        : (() => {
            const n = Number(session.startTime);
            if (n >= 1e9 && n < 1e13) return new Date(n * 1000);
            const d = session.date instanceof Date ? session.date : new Date(session.date);
            const t = new Date(d);
            t.setUTCHours(Math.floor(n / 60), n % 60, 0, 0);
            return t;
          })();
      
      const timeStr = moment(startTime).format('h:mm A');
      if (!row.doctorSessionTimes.includes(timeStr)) {
        row.doctorSessionTimes.push(timeStr);
      }

      // Aggregate bookings
      session.bookings.forEach((booking) => {
        const refund = booking.refund ?? 0;
        const paidBeforeCancel = Boolean(booking.receiptNoString?.trim());
        const isCancelByRefundReceipt = refund === 3 && !!booking.refundReceiptCreatedAt;
        const isCancelled = booking.status === 2 || !!booking.canceledAt || isCancelByRefundReceipt;
        const isPaidBooking = booking.status === 1 || paidBeforeCancel;

        if (isCancelled) {
          row.cancel++;
        }

        // refund: 0 = none, 1 = prof only, 2 = hosp only, 3 = full
        // Refund counters should include only non-cancelled paid bookings.
        if (isPaidBooking && !isCancelled) {
          if (refund === 2 || refund === 3) {
            row.hosRefund++;
          }
          if (refund === 1 || refund === 3) {
            row.proRefund++;
          }
        }

        // Not paid bucket should only include active pending bookings.
        if (booking.status === 0 && !isCancelled) {
          row.notPaid++;
          return;
        }

        // Paid bucket should include all paid bookings, including cancelled ones.
        // Cancellations/refunds are handled by separate derived counters.
        if (isPaidBooking) {
          row.paid++;

          // Use net fee values after discounts for fee-type filtered totals.
          const netHospitalFee = Math.max(
            0,
            (booking.hospitalFee ?? 0) - (booking.hospitalFeeDiscount ?? 0)
          );
          const netProfessionalFee = Math.max(
            0,
            (booking.professionalFee ?? 0) - (booking.professionsalFeeDiscount ?? 0)
          );

          // Calculate total based on fee type and partial refund type:
          // - refund=1 (professional): deduct only professional part
          // - refund=2 (hospital): deduct only hospital part
          // - cancelled bookings are still counted in paid, but should not add to amount totals
          if (feeType === '__all__' || !feeType || feeType === 'total') {
            if (isCancelled) {
              return;
            }
            let effectiveTotal = booking.amount || 0;
            if (refund === 1) {
              effectiveTotal -= netProfessionalFee;
            } else if (refund === 2) {
              effectiveTotal -= netHospitalFee;
            }
            row.total += Math.max(0, effectiveTotal);
          } else if (feeType === 'hospital') {
            if (isCancelled) {
              return;
            }
            row.total += refund === 2 ? 0 : netHospitalFee;
          } else if (feeType === 'professional') {
            if (isCancelled) {
              return;
            }
            row.total += refund === 1 ? 0 : netProfessionalFee;
          }
        }
      });
    });

    // Convert map to array and derive valid columns:
    // nettValid = paid - cancel - proRefund
    // proValid = paid - cancel - proRefund
    // hosValid = paid - cancel - hosRefund
    const rows = Array.from(doctorMap.values());
    rows.forEach((row) => {
      row.nettValid = Math.max(0, row.paid - row.cancel - row.proRefund);
      row.proValid = Math.max(0, row.paid - row.cancel - row.proRefund);
      row.hosValid = Math.max(0, row.paid - row.cancel - row.hosRefund);
    });

    // Sort rows by consultant
    rows.sort((a, b) => {
      if (a.consultantName < b.consultantName) return -1;
      if (a.consultantName > b.consultantName) return 1;
      return 0;
    });

    // Set row numbers
    rows.forEach((row, index) => {
      row.no = index + 1;
    });

    // Calculate totals
    const totals = {
      no: rows.length,
      notPaid: rows.reduce((sum, r) => sum + r.notPaid, 0),
      paid: rows.reduce((sum, r) => sum + r.paid, 0),
      cancel: rows.reduce((sum, r) => sum + r.cancel, 0),
      hosRefund: rows.reduce((sum, r) => sum + r.hosRefund, 0),
      proRefund: rows.reduce((sum, r) => sum + r.proRefund, 0),
      hosValid: rows.reduce((sum, r) => sum + r.hosValid, 0),
      proValid: rows.reduce((sum, r) => sum + r.proValid, 0),
      nettValid: rows.reduce((sum, r) => sum + r.nettValid, 0),
      total: rows.reduce((sum, r) => sum + r.total, 0),
    };

    return {
      success: true,
      data: rows,
      totals,
      totalRecords: rows.length,
    };
  } catch (error: unknown) {
    console.error('getAllDoctorViewReportDataService error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting all doctor view report data';
    throw new Error(errorMessage);
  }
};
