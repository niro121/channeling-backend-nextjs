"use server";

import { getServerSession } from 'next-auth';
import moment from 'moment';
import { authOptions } from '@/lib/auth';
import { requireReport } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  ChannelScheduleWithChargesReportExportRow,
  ChannelScheduleWithChargesReportQuery
} from '@/types/reports/channel-schedule-with-charges';
import {
  getChannelScheduleWithChargesReportService
} from '@/services/reports/channel-schedule-with-charges.report.service';
import { DAY_TYPES } from '@/types/doctor.session';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';

function getDayTypeLabel(dayType: number): string {
  const match = DAY_TYPES.find((d) => Number(d.id) === dayType);
  return match?.name ?? '-';
}

function formatDateTime(value?: Date | null): string {
  if (!value) return '-';
  return moment(value).format('D/M/YY HH:mm');
}

function formatDateOnly(value?: Date | null): string {
  if (!value) return '-';
  return moment(value).format('D/M/YY');
}

function toFeeNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function getFeeById(
  fees: unknown,
  feeId: number
): { localFee?: number; foreignFee?: number } | null {
  if (!Array.isArray(fees)) return null;
  const match = fees.find((f: any) => String(f?.id) === String(feeId));
  if (!match) return null;
  const localFee = match.localFee;
  const foreignFee = match.foreignFee;
  return { localFee, foreignFee };
}

export async function getChannelScheduleWithChargesReportData(
  query: ChannelScheduleWithChargesReportQuery
) {
  await requireReport('channel-schedule-with-charges');
  try {
    const result = await getChannelScheduleWithChargesReportService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : 'Failed to fetch channel schedule with charges report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg
    };
  }
}

export async function exportChannelScheduleWithChargesReportData(
  query: ChannelScheduleWithChargesReportQuery
): Promise<{
  success: boolean;
  data?: ChannelScheduleWithChargesReportExportRow[];
  message?: string;
}> {
  await requireReport('channel-schedule-with-charges');
  try {
    const result = await getChannelScheduleWithChargesReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: ChannelScheduleWithChargesReportExportRow[] = result.data.map(
      (row: any) => {
        const fees = row.fees ?? [];

        // Fee ids (see `types/doctor.session.ts`)
        const doctorFee = getFeeById(fees, 0);
        const hospitalFee = getFeeById(fees, 1);
        const agencyFee = getFeeById(fees, 2);
        const scanFee = getFeeById(fees, 3);
        const onCallFee = getFeeById(fees, 4);
        const creditCardCommissionFee = getFeeById(fees, 5);
        const apiFee = getFeeById(fees, 6);

        return {
          locationName: row.location?.name ?? '-',
          doctorName: formatDoctorName(row.doctor as any) || '-',
          sessionName: row.name ?? '-',
          roomName: row.room?.number ?? row.room?.description ?? '-',
          startTime: formatDateTime(row.startTime),
          endTime: formatDateTime(row.endTime),
          dateType: getDayTypeLabel(row.dayType),
          applyOnlyTo: formatDateOnly(row.applyTo),

          doctorFeeLocal: toFeeNumber(doctorFee?.localFee),
          hospitalFeeLocal: toFeeNumber(hospitalFee?.localFee),
          agencyFeeLocal: toFeeNumber(agencyFee?.localFee),
          scanFeeLocal: toFeeNumber(scanFee?.localFee),
          onCallFeeLocal: toFeeNumber(onCallFee?.localFee),
          creditCardCommissionLocal: toFeeNumber(
            creditCardCommissionFee?.localFee
          ),
          apiFeeLocal: toFeeNumber(apiFee?.localFee),
          sessionValueLocal: toFeeNumber(row.amountLocal),

          doctorFeeForeign: toFeeNumber(doctorFee?.foreignFee),
          hospitalFeeForeign: toFeeNumber(hospitalFee?.foreignFee),
          agencyFeeForeign: toFeeNumber(agencyFee?.foreignFee),
          scanFeeForeign: toFeeNumber(scanFee?.foreignFee),
          onCallFeeForeign: toFeeNumber(onCallFee?.foreignFee),
          creditCardCommissionForeign: toFeeNumber(
            creditCardCommissionFee?.foreignFee
          ),
          apiFeeForeign: toFeeNumber(apiFee?.foreignFee),
          sessionValueForeign: toFeeNumber(row.amountForeign),

          startingPatientNo: row.startingPatientNumber ?? '-',
          maximumPatientNo: row.maxPatientNumber ?? '-',
          previousSession: row.previousSession?.name ?? '-',

          refundable: row.refundable === 1 ? 'Yes' : 'No',
          advanceBookingEnabled: row.advancedBookingEnabled ? 'Yes' : 'No',
          status: row.status === 1 ? 'Publish' : 'Unpublish'
        };
      }
    );

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.channel-schedule-with-charges.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mapped.length }
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}

