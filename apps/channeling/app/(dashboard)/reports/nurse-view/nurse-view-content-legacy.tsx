'use client';

import React, { useEffect, useState } from 'react';
import { getNurseViewReportData } from '@/app/actions/reports/nurse-view.action';
import { NurseViewSessionData } from '@/types/report';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { Printer } from 'lucide-react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { ReportPrintLayout, toBrandedPdfSummaryItems, downloadBrandedReportPdf } from '@/components/common/report-print';
import type { ReportPrintSummaryItem } from '@/components/common/report-print';
import { ExportWrapper } from '@/app/(dashboard)/export-wrapper';
import Loading from '@/app/(dashboard)/loading';

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
  agentRef: string;
  markAbsent: string;
};

export default function NurseViewReportContentLegacy({
  sessionId
}: NurseViewReportContentProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(Boolean(sessionId));
  const [sessionData, setSessionData] = useState<NurseViewSessionData | null>(
    null
  );

  useEffect(() => {
    if (!sessionId) return;

    const fetchReportData = async () => {
      setLoading(true);
      try {
        const result = await getNurseViewReportData({ sessionId });

        if (result.success && result.data) {
          setSessionData(result.data);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message || 'Failed to fetch report data'
          });
          setSessionData(null);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch report data';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage
        });
        setSessionData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [sessionId, toast]);

  const handlePrint = () => {
    if (!sessionData) return;
    window.print();
  };

  const handleExport = async () => {
    if (!sessionData) {
      return { success: false, message: 'No session data available' };
    }
    const data: NurseViewExportRow[] = (sessionData.bookings ?? []).map((b) => ({
      appointmentNo: String(b.appointmentNo ?? ''),
      patientName: `${b.title ?? ''} ${b.name ?? ''}`.trim() || '-',
      paymentStatus: b.status === 1 ? 'Paid' : 'Pending',
      remark: b.remarks || '-',
      area: b.area || '-',
      agentStaff: b.agency?.name ?? b.staff?.name ?? b.creditCustomer?.name ?? '-',
      agentRef: b.agencyId
        ? b.agency?.code ?? b.agencyRef ?? '-'
        : b.staffId
          ? b.staff?.code ?? '-'
          : b.creditCustomerId
            ? b.creditCustomer?.code ?? '-'
            : '-',
      markAbsent: '',
    }));
    return { success: true, data };
  };

  const formatTime = (date: Date) => {
    return moment(date).format('h:mm A');
  };

  const formatDate = (date: Date) => {
    return moment(date).format('YYYY-MM-DD');
  };

  const getPaymentStatus = (status: number) => {
    return status === 1 ? 'Paid' : 'Pending';
  };

  const getAgentStaffName = (
    booking: NurseViewSessionData['bookings'][0]
  ) => {
    if (booking.agency?.name) return booking.agency.name;
    if (booking.staff?.name) return booking.staff.name;
    if (booking.creditCustomer?.name) return booking.creditCustomer.name;
    return '-';
  };

  const getAgentStaffCreditCustomerRef = (
    booking: NurseViewSessionData['bookings'][0]
  ) => {
    if (booking.agencyId) return booking.agency?.code ?? booking.agencyRef ?? '-';
    if (booking.staffId) return booking.staff?.code ?? '-';
    if (booking.creditCustomerId) return booking.creditCustomer?.code ?? '-';
    return '-';
  };

  if (loading) {
    return <Loading />;
  }

  if (!sessionData) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8 text-muted-foreground">
          No session data available.
        </div>
      </div>
    );
  }

  const printSummaryItems = [
    { label: 'Branch', value: sessionData.location?.name || '-' },
    { label: 'Date', value: formatDate(sessionData.date) },
    {
      label: 'Session Time',
      value: `${formatTime(sessionData.startTime)} - ${formatTime(sessionData.endTime)}`,
    },
    { label: 'Department', value: sessionData.department?.name || '-' },
    {
      label: 'Consultant',
      value: sessionData.doctor
        ? `${sessionData.doctor.title} ${sessionData.doctor.name}`.trim()
        : '-',
      fullWidth: true,
    },
  ] satisfies ReportPrintSummaryItem[];

  return (
    <div className="nurse-view-print-root container mx-auto py-6 space-y-6 print:py-0">
      <style>{`
        @media print {
          .nurse-view-print-root,
          .nurse-view-print-root.container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .nurse-view-print-root > .print\\:shadow-none,
          .nurse-view-print-root [class*="p-6"] {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
          }
          .nurse-view-print-root .rpt-print-root,
          .nurse-view-print-root .rpt-print-header,
          .nurse-view-print-root .rpt-print-summary,
          .nurse-view-print-root .rpt-print-body {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-sizing: border-box !important;
          }
          .nurse-view-print-root .overflow-x-auto,
          .nurse-view-print-root .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .nurse-view-print-root .rpt-print-root table.nv-print-table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          .nurse-view-print-root .rpt-print-root table.nv-print-table thead {
            display: table-header-group !important;
          }
          .nurse-view-print-root .rpt-print-root table.nv-print-table th,
          .nurse-view-print-root .rpt-print-root table.nv-print-table td {
            overflow: hidden !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            box-sizing: border-box !important;
          }
          .nurse-view-print-root .rpt-print-root table.nv-print-table th:nth-child(1),
          .nurse-view-print-root .rpt-print-root table.nv-print-table td:nth-child(1) { width: 8% !important; }
          .nurse-view-print-root .rpt-print-root table.nv-print-table th:nth-child(2),
          .nurse-view-print-root .rpt-print-root table.nv-print-table td:nth-child(2) { width: 18% !important; }
          .nurse-view-print-root .rpt-print-root table.nv-print-table th:nth-child(3),
          .nurse-view-print-root .rpt-print-root table.nv-print-table td:nth-child(3) { width: 11% !important; }
          .nurse-view-print-root .rpt-print-root table.nv-print-table th:nth-child(4),
          .nurse-view-print-root .rpt-print-root table.nv-print-table td:nth-child(4) { width: 13% !important; }
          .nurse-view-print-root .rpt-print-root table.nv-print-table th:nth-child(5),
          .nurse-view-print-root .rpt-print-root table.nv-print-table td:nth-child(5) { width: 10% !important; }
          .nurse-view-print-root .rpt-print-root table.nv-print-table th:nth-child(6),
          .nurse-view-print-root .rpt-print-root table.nv-print-table td:nth-child(6) { width: 20% !important; }
          .nurse-view-print-root .rpt-print-root table.nv-print-table th:nth-child(7),
          .nurse-view-print-root .rpt-print-root table.nv-print-table td:nth-child(7) { width: 14% !important; }
          .nurse-view-print-root .rpt-print-root table.nv-print-table th:nth-child(8),
          .nurse-view-print-root .rpt-print-root table.nv-print-table td:nth-child(8) { width: 6% !important; }
          .nurse-view-print-root input[type="checkbox"] {
            width: 3.2mm !important;
            height: 3.2mm !important;
            margin: 0 !important;
          }
        }
      `}</style>
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">
                Nurse View Report
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <ExportWrapper<NurseViewExportRow>
                serverData={handleExport}
                columns={[
                  'App.No',
                  'Patient Name',
                  'Payment Status',
                  'Remark',
                  'Area',
                  'Agent/ Staff/ Credit Customer',
                  'Agent/ Staff/ Credit Customer Ref.',
                  'Mark Absent',
                ]}
                keys={[
                  'appointmentNo',
                  'patientName',
                  'paymentStatus',
                  'remark',
                  'area',
                  'agentStaff',
                  'agentRef',
                  'markAbsent',
                ]}
                title="Nurse View Report"
                fileName="nurse-view-report"
                exportOrientation="portrait"
                pdfSummaryItems={toBrandedPdfSummaryItems(printSummaryItems)}
                customDownloadPdf={async (args) => {
                  await downloadBrandedReportPdf({
                    reportName: args.title,
                    summaryItems: toBrandedPdfSummaryItems(printSummaryItems),
                    generatedAt: new Date().toLocaleString(),
                    data: args.data,
                    columns: args.columns,
                    keys: args.keys,
                    fileName: args.fileName,
                    orientation: 'portrait',
                    compactTable: true,
                    pageMarginMm: 5,
                  });
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="print:p-0">
          {/* Session Details (screen only — print uses ReportPrintLayout summary) */}
          <div className="mb-6 space-y-2 print:hidden">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Branch: </span>
                <span>{sessionData.location?.name || '-'}</span>
              </div>
              <div>
                <span className="font-semibold">Date: </span>
                <span>{formatDate(sessionData.date)}</span>
              </div>
              <div>
                <span className="font-semibold">Session Time: </span>
                <span>
                  {formatTime(sessionData.startTime)} -{' '}
                  {formatTime(sessionData.endTime)}
                </span>
              </div>
              <div>
                <span className="font-semibold">Department Name: </span>
                <span>{sessionData.department?.name || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="font-semibold">Consultant: </span>
                <span>
                  {sessionData.doctor
                    ? `${sessionData.doctor.title} ${sessionData.doctor.name}`.trim()
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Patient List Table */}
          <ReportPrintLayout
            reportName="Nurse View Report"
            pageSize="A4 portrait"
            pageMargins="7mm 5mm 18mm"
            generatedAt={new Date().toLocaleString()}
            summaryItems={printSummaryItems}
          >
          <div className="mt-6 print:mt-0">
            <div className="rounded-md border overflow-x-auto">
              <table className="nv-print-table w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left font-semibold">
                      App.No
                    </th>
                    <th className="border p-2 text-left font-semibold">
                      Patient Name
                    </th>
                    <th className="border p-2 text-left font-semibold">
                      Payment Status
                    </th>
                    <th className="border p-2 text-left font-semibold">
                      Remark
                    </th>
                    <th className="border p-2 text-left font-semibold">
                      Area
                    </th>
                    <th className="border p-2 text-left font-semibold">
                      Agent/ Staff/ Credit Customer
                    </th>
                    <th className="border p-2 text-left font-semibold">
                      Agent/ Staff/ Credit Customer Ref.
                    </th>
                    <th className="border p-2 text-left font-semibold">
                      Mark Absent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessionData.bookings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="border p-4 text-center text-muted-foreground"
                      >
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    sessionData.bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="border p-2">{booking.appointmentNo}</td>
                        <td className="border p-2">
                          {booking.title} {booking.name}
                        </td>
                        <td className="border p-2">
                          <span
                            className={
                              booking.status === 1
                                ? 'text-green-600'
                                : 'text-amber-600'
                            }
                          >
                            {getPaymentStatus(booking.status)}
                          </span>
                        </td>
                        <td className="border p-2">
                          {booking.remarks || '-'}
                        </td>
                        <td className="border p-2">
                          {booking.area || '-'}
                        </td>
                        <td className="border p-2">
                          {getAgentStaffName(booking)}
                        </td>
                        <td className="border p-2">
                          {getAgentStaffCreditCustomerRef(booking)}
                        </td>
                        <td className="border p-2">
                          <input
                            type="checkbox"
                            className="cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </ReportPrintLayout>
        </CardContent>
      </Card>
    </div>
  );
}

