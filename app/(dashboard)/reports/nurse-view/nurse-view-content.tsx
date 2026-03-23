'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { getNurseViewReportData } from '@/app/actions/reports/nurse-view.action';
import { NurseViewBookingData, NurseViewSessionData } from '@/types/report';
import Loading from '@/app/(dashboard)/loading';
import moment from 'moment';
import { NurseViewReportColumns } from './columns';
import { printPdfUtilWithHeader } from '@/lib/utils';

type NurseViewReportContentProps = {
  sessionId: string;
};

type NurseViewExportRow = {
  appointmentNo: string;
  patientName: string;
  paymentStatus: string;
  remark: string;
  area: string;
  agentStaff: string;
  creditCustomer: string;
  agentRef: string;
  markAbsent: string;
};

export default function NurseViewReportContent({
  sessionId
}: NurseViewReportContentProps) {
  const searchParams = useSearchParams();
  const [sessionData, setSessionData] = useState<NurseViewSessionData | null>(null);

  const formatTime = (date: Date) => {
    return moment(date).format('h:mm A');
  };

  const formatDate = (date: Date) => {
    return moment(date).format('YYYY-MM-DD');
  };

  const toExportRow = (b: NurseViewBookingData): NurseViewExportRow => ({
    appointmentNo: String(b.appointmentNo ?? ''),
    patientName: `${b.title ?? ''} ${b.name ?? ''}`.trim() || '-',
    paymentStatus: b.status === 1 ? 'Paid' : 'Pending',
    remark: b.remarks || '-',
    area: b.area || '-',
    agentStaff: b.agency?.name ?? b.staff?.name ?? '-',
    creditCustomer: b.creditCustomer?.name ?? '-',
    agentRef: b.agencyRef || '-',
    markAbsent: ''
  });

  const effectiveSessionId = useMemo(() => {
    // Prefer URL param if present (so report-template fetch works on refresh / navigation)
    return searchParams.get('sessionId') ?? sessionId ?? '';
  }, [searchParams, sessionId]);

  return (
    <Suspense fallback={<Loading />}>
      <div data-nurse-view-report>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* Hide Search + Clear in Nurse View (FilterWrapper buttons) */
            [data-nurse-view-report] .flex.flex-wrap.items-center.gap-3 > button {
              display: none !important;
            }

            /* Keep only Print button in ExportWrapper (hide PDF + Excel) */
            [data-nurse-view-report] .flex.gap-2 > button:first-child,
            [data-nurse-view-report] .flex.gap-2 > button:nth-child(2) {
              display: none !important;
            }
          `
          }}
        />

          <ReportTemplate<NurseViewBookingData, NurseViewExportRow>
          title="Nurse View Report"
          description="View session details and patient list for the selected session"
          filterButtonLabel="Search"
          // This report is session-driven; if sessionId is missing, don't auto-fetch.
          skipFetchWhenNoParams={true}
          showPrintButton={Boolean(sessionData)}
          customPrintPdf={({ title, data, columns, keys }) => {
            if (!sessionData) return;

            const headerLines = [
              `Branch: ${sessionData.location?.name ?? '-'}`,
              `Date: ${formatDate(sessionData.date)}`,
              `Session Time: ${formatTime(sessionData.startTime)} - ${formatTime(sessionData.endTime)}`,
              `Department Name: ${sessionData.department?.name ?? '-'}`,
              `Consultant: ${
                sessionData.doctor
                  ? `${sessionData.doctor.title} ${sessionData.doctor.name}`.trim()
                  : '-'
              }`
            ];

            printPdfUtilWithHeader<NurseViewExportRow>({
              title,
              headerLines,
              data,
              columns,
              keys
            });
          }}
          filterContent={() => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <div>
                <span className="font-semibold">Branch: </span>
                <span>{sessionData?.location?.name || '-'}</span>
              </div>
              <div>
                <span className="font-semibold">Date: </span>
                <span>{sessionData?.date ? formatDate(sessionData.date) : '-'}</span>
              </div>
              <div>
                <span className="font-semibold">Session Time: </span>
                <span>
                  {sessionData?.startTime && sessionData?.endTime
                    ? `${formatTime(sessionData.startTime)} - ${formatTime(sessionData.endTime)}`
                    : '-'}
                </span>
              </div>
              <div>
                <span className="font-semibold">Department Name: </span>
                <span>{sessionData?.department?.name || '-'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-semibold">Consultant: </span>
                <span>
                  {sessionData?.doctor
                    ? `${sessionData.doctor.title} ${sessionData.doctor.name}`.trim()
                    : '-'}
                </span>
              </div>
            </div>
          )}
          fetchData={async (params) => {
            const id = params.get('sessionId') ?? effectiveSessionId;
            if (!id) {
              setSessionData(null);
              return { success: true, data: [], totalRecords: 0 };
            }
            const result = await getNurseViewReportData({ sessionId: id });
            if (result.success && result.data) {
              setSessionData(result.data);
              return {
                success: true,
                data: result.data.bookings ?? [],
                totalRecords: result.totalRecords ?? (result.data.bookings?.length ?? 0)
              };
            }
            setSessionData(null);
            return {
              success: false,
              data: [],
              totalRecords: 0,
              message: result.message || 'Failed to fetch nurse view report data'
            };
          }}
          exportData={async () => {
            // Export uses same data currently in view; fetch fresh using sessionId.
            const id = effectiveSessionId;
            if (!id) return { success: true, data: [] };
            const result = await getNurseViewReportData({ sessionId: id });
            return {
              success: Boolean(result.success),
              data:
                result.success && result.data
                  ? (result.data.bookings ?? []).map(toExportRow)
                  : []
            };
          }}
          columns={NurseViewReportColumns}
          exportColumns={[
            'App.No',
            'Patient Name',
            'Payment Status',
            'Remark',
            'Area',
            'Agent/ Staff',
            'Credit Customer',
            'Agent Ref.',
            'Mark Absent'
          ]}
          exportKeys={
            [
              'appointmentNo',
              'patientName',
              'paymentStatus',
              'remark',
              'area',
              'agentStaff',
              'creditCustomer',
              'agentRef',
              'markAbsent'
            ] as (keyof NurseViewExportRow)[]
          }
          exportTitle="Nurse View Report"
          exportFileName="nurse-view-report"
          getRowId={(row) => row.id}
          emptyMessage="No bookings found for this session."
        />
      </div>
    </Suspense>
  );
}
