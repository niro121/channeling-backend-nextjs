"use server";

import { getServerSession } from 'next-auth';
import moment from 'moment';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  ChannelScheduleWithChargesReportExportRow,
  ChannelScheduleWithChargesReportQuery
} from '@/types/reports/channel-schedule-with-charges';
import {
  getChannelScheduleWithChargesReportService
} from '@/services/reports/channel-schedule-with-charges.report.service';
import { formatLKR } from '@/lib/format-money';
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

function formatMoney(value: unknown): string {
  if (value == null || value === '') return '-';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '-';
  return formatLKR(n);
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
  await requirePermission('reports', 'view');
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
  await requirePermission('reports', 'view');
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

        return {
          locationName: row.location?.name ?? '-',
          doctorName: formatDoctorName(row.doctor as any) || '-',
          sessionName: row.name ?? '-',
          roomName: row.room?.number ?? row.room?.description ?? '-',
          startTime: formatDateTime(row.startTime),
          endTime: formatDateTime(row.endTime),
          dateType: getDayTypeLabel(row.dayType),
          applyOnlyTo: formatDateOnly(row.applyTo),

          doctorFeeLocal: formatMoney(doctorFee?.localFee),
          hospitalFeeLocal: formatMoney(hospitalFee?.localFee),
          agencyFeeLocal: formatMoney(agencyFee?.localFee),
          scanFeeLocal: formatMoney(scanFee?.localFee),
          onCallFeeLocal: formatMoney(onCallFee?.localFee),
          creditCardCommissionLocal: formatMoney(
            creditCardCommissionFee?.localFee
          ),
          sessionValueLocal: formatMoney(row.amountLocal),

          doctorFeeForeign: formatMoney(doctorFee?.foreignFee),
          hospitalFeeForeign: formatMoney(hospitalFee?.foreignFee),
          agencyFeeForeign: formatMoney(agencyFee?.foreignFee),
          scanFeeForeign: formatMoney(scanFee?.foreignFee),
          onCallFeeForeign: formatMoney(onCallFee?.foreignFee),
          creditCardCommissionForeign: formatMoney(
            creditCardCommissionFee?.foreignFee
          ),
          sessionValueForeign: formatMoney(row.amountForeign),

          startingPatientNo: row.startingPatientNumber ?? '-',
          maximumPatientNo: row.maxPatientNumber ?? '-',
          previousSession: row.previousSession?.name ?? '-',

          refundable: row.refundable === 1 ? 'Yes' : 'No',
          advanceBookingDays: row.advancedBookingDays ?? '-',
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

