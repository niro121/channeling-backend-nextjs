'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import { DAY_TYPES } from '@/types/doctor.session';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';
import type { ChannelScheduleWithChargesReportRow } from '@/types/reports/channel-schedule-with-charges';
import type { Doctor } from '@/types/doctor';

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

function getFeeById(fees: unknown, feeId: number): any | null {
  if (!Array.isArray(fees)) return null;
  return fees.find((f: any) => String(f?.id) === String(feeId)) ?? null;
}

function getDayTypeLabel(dayType: number): string {
  const match = DAY_TYPES.find((d) => Number(d.id) === dayType);
  return match?.name ?? '-';
}

export const ChannelScheduleWithChargesColumns: ColumnDef<ChannelScheduleWithChargesReportRow>[] =
  [
    {
      id: 'locationName',
      header: () => <span className="whitespace-nowrap">Location</span>,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.location?.name ?? '-'}</span>
      )
    },
    {
      id: 'doctorName',
      header: () => <span className="whitespace-nowrap">Doctor Name</span>,
      cell: ({ row }) => (
        <span className="text-xs">
          {formatDoctorName(row.original.doctor as Doctor | null)}
        </span>
      )
    },
    {
      id: 'sessionName',
      header: () => <span className="whitespace-nowrap">Session Name</span>,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.name ?? '-'}</span>
      )
    },
    {
      id: 'roomName',
      header: () => <span className="whitespace-nowrap">Room</span>,
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.room?.number ?? row.original.room?.description ?? '-'}
        </span>
      )
    },
    {
      id: 'startTime',
      header: () => <span className="whitespace-nowrap">Start Time</span>,
      cell: ({ row }) => {
        const v = row.original.startTime;
        if (!v) return '-';
        return (
          <div className="whitespace-nowrap text-xs">
            <div>
              {moment(v).format('hh:mm A')}
            </div>
            <div className="text-muted-foreground">{moment(v).format('Do MMMM YYYY')}</div>
          </div>
        );
      }
    },
    {
      id: 'endTime',
      header: () => <span className="whitespace-nowrap">End Time</span>,
      cell: ({ row }) => {
        const v = row.original.endTime;
        if (!v) return '-';
        return (
          <div className="whitespace-nowrap text-xs">
            <div>
              {moment(v).format('hh:mm A')}
            </div>
            <div className="text-muted-foreground">{moment(v).format('Do MMMM YYYY')}</div>
          </div>
        );
      }
    },
    {
      id: 'dateType',
      header: () => <span className="whitespace-nowrap">Date Type</span>,
      cell: ({ row }) => (
        <span className="text-xs">{getDayTypeLabel(row.original.dayType)}</span>
      )
    },
    {
      id: 'applyOnlyTo',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Apply Only To</div>
          <div className="whitespace-nowrap">(Ignores Date Type)</div>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-xs">{formatDateOnly(row.original.applyTo)}</span>
      )
    },
    {
      id: 'doctorFeeLocal',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Doctor Fee</div>
          <div className="whitespace-nowrap">(Local)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 0);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.localFee)}
          </span>
        );
      }
    },
    {
      id: 'hospitalFeeLocal',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Hospital Fee</div>
          <div className="whitespace-nowrap">(Local)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 1);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.localFee)}
          </span>
        );
      }
    },
    {
      id: 'agencyFeeLocal',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Agency Fee</div>
          <div className="whitespace-nowrap">(Local)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 2);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.localFee)}
          </span>
        );
      }
    },
    {
      id: 'scanFeeLocal',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Scan Fee</div>
          <div className="whitespace-nowrap">(Local)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 3);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.localFee)}
          </span>
        );
      }
    },
    {
      id: 'onCallFeeLocal',
      header: () => (
        <div>
          <div className="whitespace-nowrap">On-Call Fee</div>
          <div className="whitespace-nowrap">(Local)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 4);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.localFee)}
          </span>
        );
      }
    },
    {
      id: 'creditCardCommissionLocal',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Credit Card Commission</div>
          <div className="whitespace-nowrap">(Local)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 5);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.localFee)}
          </span>
        );
      }
    },
    {
      id: 'sessionValueLocal',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Session Value</div>
          <div className="whitespace-nowrap">(Local)</div>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-right tabular-nums block">
          {formatMoney(row.original.amountLocal)}
        </span>
      )
    },
    {
      id: 'doctorFeeForeign',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Doctor Fee</div>
          <div className="whitespace-nowrap">(Foreign)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 0);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.foreignFee)}
          </span>
        );
      }
    },
    {
      id: 'hospitalFeeForeign',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Hospital Fee</div>
          <div className="whitespace-nowrap">(Foreign)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 1);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.foreignFee)}
          </span>
        );
      }
    },
    {
      id: 'agencyFeeForeign',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Agency Fee</div>
          <div className="whitespace-nowrap">(Foreign)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 2);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.foreignFee)}
          </span>
        );
      }
    },
    {
      id: 'scanFeeForeign',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Scan Fee</div>
          <div className="whitespace-nowrap">(Foreign)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 3);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.foreignFee)}
          </span>
        );
      }
    },
    {
      id: 'onCallFeeForeign',
      header: () => (
        <div>
          <div className="whitespace-nowrap">On-Call Fee</div>
          <div className="whitespace-nowrap">(Foreign)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 4);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.foreignFee)}
          </span>
        );
      }
    },
    {
      id: 'creditCardCommissionForeign',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Credit Card Commission Fee</div>
          <div className="whitespace-nowrap">(Foreign)</div>
        </div>
      ),
      cell: ({ row }) => {
        const fee = getFeeById(row.original.fees, 5);
        return (
          <span className="text-right tabular-nums block">
            {formatMoney(fee?.foreignFee)}
          </span>
        );
      }
    },
    {
      id: 'sessionValueForeign',
      header: () => (
        <div>
          <div className="whitespace-nowrap">Session Value</div>
          <div className="whitespace-nowrap">(Foreign)</div>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-right tabular-nums block">
          {formatMoney(row.original.amountForeign)}
        </span>
      )
    },
    {
      id: 'startingPatientNo',
      header: 'Starting Patient No',
      cell: ({ row }) => (
        <span className="text-right tabular-nums block">
          {row.original.startingPatientNumber ?? '-'}
        </span>
      )
    },
    {
      id: 'maximumPatientNo',
      header: 'Maximum Patient No',
      cell: ({ row }) => (
        <span className="text-right tabular-nums block">
          {row.original.maxPatientNumber ?? '-'}
        </span>
      )
    },
    {
      id: 'previousSession',
      header: () => <span className="whitespace-nowrap">Previous Session</span>,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.previousSession?.name ?? '-'}</span>
      )
    },
    {
      id: 'refundable',
      header: 'Refundable',
      cell: ({ row }) => {
        const refundable = row.original.refundable;
        const isYes = refundable === 1;
        return (
          <Badge
            variant={isYes ? 'default' : 'secondary'}
            className={
              isYes
                ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
                : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
            }
          >
            {isYes ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isYes ? 'Yes' : 'No'}
          </Badge>
        );
      }
    },
    {
      id: 'advanceBookingDays',
      header: () => <span className="whitespace-nowrap">Advance /Booking Days</span>,
      cell: ({ row }) => (
        <span className="text-right tabular-nums block">
          {row.original.advancedBookingDays ?? '-'}
        </span>
      )
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isPublished = row.original.status === 1;
        return (
          <Badge
            variant={isPublished ? 'default' : 'secondary'}
            className={
              isPublished
                ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
                : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
            }
          >
            {isPublished ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isPublished ? 'Publish' : 'Unpublish'}
          </Badge>
        );
      }
    }
  ];
