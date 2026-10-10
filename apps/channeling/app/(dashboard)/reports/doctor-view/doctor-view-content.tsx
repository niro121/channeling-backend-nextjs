'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getDoctorViewReportData } from '@/app/actions/reports/doctor-view.action';
import { DoctorViewSessionData } from '@/types/report';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { Printer } from 'lucide-react';
import moment from 'moment';
import { ReportPrintLayout, toBrandedPdfSummaryItems, downloadBrandedReportPdf } from '@/components/common/report-print';
import type { ReportPrintSummaryItem } from '@/components/common/report-print';
import { ExportWrapper } from '@/app/(dashboard)/export-wrapper';
import Loading from '@/app/(dashboard)/loading';

type DoctorViewReportContentProps = {
  sessionId: string;
};

type DoctorViewExportRow = {
  appNo: string;
  patientName: string;
  billNo: string;
  agent: string;
  paidOrNot: string;
  cOrR: string;
  pOrA: string;
  doctorFee: string;
  total: string;
};

export default function DoctorViewReportContent({
  sessionId
}: DoctorViewReportContentProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [sessionData, setSessionData] = useState<DoctorViewSessionData | null>(null);
  
  useEffect(() => {
    if (sessionId) {
      fetchReportData();
    }
  }, [sessionId]);

  const fetchReportData = async () => {
    if (!sessionId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Session ID is required'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await getDoctorViewReportData({ sessionId });

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
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch report data';
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

  const handlePrint = () => {
    if (!sessionData) return;
    window.print();
  };

  const handleExport = async () => {
    if (!sessionData) {
      return { success: false, message: 'No session data available' };
    }
    const data: DoctorViewExportRow[] = (sessionData.bookings ?? []).map((booking) => ({
      appNo: String(booking.appointmentNo ?? '-'),
      patientName: `${booking.title ?? ''} ${booking.name ?? ''}`.trim() || '-',
      billNo: booking.receiptNoString || '-',
      agent: getAgentName(booking),
      paidOrNot: getPaymentStatus(booking.status),
      cOrR: getCancelRefundStatus(booking),
      pOrA: getPresentAbsentStatus(booking.status),
      doctorFee: formatCurrency(booking.professionalFee),
      total: formatCurrency(booking.amount),
    }));
    return { success: true, data };
  };

  const formatTime = (date: Date) => {
    return moment(date).format('h:mm A');
  };

  const formatDate = (date: Date) => {
    return moment(date).format('YYYY-MM-DD');
  };

  const formatSessionName = (date: Date, startTime: Date) => {
    const dateStr = moment(date).format('DD MM YYYY');
    const timeStr = moment(startTime).format('h.mm A');
    return `${dateStr} ${timeStr}`;
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPaymentStatus = (status: number) => {
    return status === 1 ? 'Paid' : 'Pending';
  };

  const getCancelRefundStatus = (booking: DoctorViewSessionData['bookings'][0]) => {
    const refund = Number(booking.refund ?? 0);
    if (refund === 3) return 'C';
    if (refund === 1) return 'R';
    if (refund === 2) return 'R';
    if (refund === 0) return '-';
    return '-';
  };

  const getPresentAbsentStatus = (status: number) => {
    // Assuming status 1 = paid means present, status 0 = pending might be absent
    // This logic might need adjustment based on actual business rules
    return status === 1 ? 'Present' : 'Absent';
  };

  const getAgentName = (booking: DoctorViewSessionData['bookings'][0]) => {
    if (booking.agency?.name) {
      return booking.agency.name;
    }
    if (booking.staff?.name) {
      return booking.staff.name;
    }
    if (booking.creditCustomer?.name) {
      return booking.creditCustomer.name;
    }
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
    {
      label: 'Branch',
      value: sessionData.location?.name || 'Ruhunu Hospital (Pvt) Ltd',
    },
    ...(sessionData.location?.address
      ? [{ label: 'Address', value: sessionData.location.address, fullWidth: true }]
      : []),
    {
      label: 'Consultant',
      value: sessionData.doctor
        ? `${sessionData.doctor.title} ${sessionData.doctor.name}`.trim()
        : '-',
    },
    { label: 'Date', value: formatDate(sessionData.date) },
    {
      label: 'Session',
      value: formatSessionName(sessionData.date, sessionData.startTime),
      fullWidth: true,
    },
  ] satisfies ReportPrintSummaryItem[];

  return (
    <div className="doctor-view-print-root container mx-auto py-6 space-y-6 print:py-0">
      <style>{`
        @media print {
          .doctor-view-print-root,
          .doctor-view-print-root.container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .doctor-view-print-root > .print\\:shadow-none,
          .doctor-view-print-root [class*="p-6"] {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
          }
          .doctor-view-print-root .rpt-print-root,
          .doctor-view-print-root .rpt-print-header,
          .doctor-view-print-root .rpt-print-summary,
          .doctor-view-print-root .rpt-print-body {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-sizing: border-box !important;
          }
          .doctor-view-print-root .overflow-x-auto,
          .doctor-view-print-root .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .doctor-view-print-root .rpt-print-root table.dv-print-table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          .doctor-view-print-root .rpt-print-root table.dv-print-table thead {
            display: table-header-group !important;
          }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th,
          .doctor-view-print-root .rpt-print-root table.dv-print-table td {
            overflow: hidden !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            box-sizing: border-box !important;
          }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th:nth-child(1),
          .doctor-view-print-root .rpt-print-root table.dv-print-table td:nth-child(1) { width: 7% !important; }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th:nth-child(2),
          .doctor-view-print-root .rpt-print-root table.dv-print-table td:nth-child(2) { width: 18% !important; }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th:nth-child(3),
          .doctor-view-print-root .rpt-print-root table.dv-print-table td:nth-child(3) { width: 12% !important; }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th:nth-child(4),
          .doctor-view-print-root .rpt-print-root table.dv-print-table td:nth-child(4) { width: 18% !important; }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th:nth-child(5),
          .doctor-view-print-root .rpt-print-root table.dv-print-table td:nth-child(5) { width: 10% !important; }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th:nth-child(6),
          .doctor-view-print-root .rpt-print-root table.dv-print-table td:nth-child(6) { width: 6% !important; }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th:nth-child(7),
          .doctor-view-print-root .rpt-print-root table.dv-print-table td:nth-child(7) { width: 7% !important; }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th:nth-child(8),
          .doctor-view-print-root .rpt-print-root table.dv-print-table td:nth-child(8) { width: 11% !important; }
          .doctor-view-print-root .rpt-print-root table.dv-print-table th:nth-child(9),
          .doctor-view-print-root .rpt-print-root table.dv-print-table td:nth-child(9) { width: 11% !important; }
        }
      `}</style>
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Doctor View</CardTitle>
            </div>
            <div className="flex gap-2">
              <ExportWrapper<DoctorViewExportRow>
                serverData={handleExport}
                columns={[
                  'App No.',
                  'Patient Name',
                  'Bill No',
                  'Agent/ Staff/ Credit Customer',
                  'Paid or Not',
                  'C / R',
                  'P/A',
                  'Doctor Fee',
                  'Total',
                ]}
                keys={[
                  'appNo',
                  'patientName',
                  'billNo',
                  'agent',
                  'paidOrNot',
                  'cOrR',
                  'pOrA',
                  'doctorFee',
                  'total',
                ]}
                title="Doctor View Report"
                fileName="doctor-view-report"
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
          {/* Header Information (screen only — print uses ReportPrintLayout summary) */}
          <div className="mb-6 space-y-2 text-center print:hidden">
            <div className="font-bold text-lg">
              {sessionData.location?.name || 'Ruhunu Hospital (Pvt) Ltd'}
            </div>
            {sessionData.location?.address && (
              <div className="text-sm text-muted-foreground">
                {sessionData.location.address}
              </div>
            )}
            <div className="font-semibold text-base mt-2">Doctor View</div>
            <div className="text-sm">
              <span className="font-semibold">Consultant: </span>
              <span>
                {sessionData.doctor 
                  ? `${sessionData.doctor.title} ${sessionData.doctor.name}`.trim()
                  : '-'}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Date: </span>
              <span>{formatDate(sessionData.date)}</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Session Name: </span>
              <span>{formatSessionName(sessionData.date, sessionData.startTime)}</span>
            </div>
          </div>

          {/* Patient List Table */}
          <ReportPrintLayout
            reportName="Doctor View Report"
            pageSize="A4 portrait"
            pageMargins="7mm 5mm 18mm"
            generatedAt={new Date().toLocaleString()}
            summaryItems={printSummaryItems}
          >
          <div className="mt-6 print:mt-0">
            <div className="rounded-md border overflow-x-auto">
              <table className="dv-print-table w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left font-semibold">App No.</th>
                    <th className="border p-2 text-left font-semibold">Patient Name</th>
                    <th className="border p-2 text-left font-semibold">Bill No</th>
                    <th className="border p-2 text-left font-semibold">Agent/ Staff/ Credit Customer</th>
                    <th className="border p-2 text-left font-semibold">Paid or Not</th>
                    <th className="border p-2 text-left font-semibold">C / R</th>
                    <th className="border p-2 text-left font-semibold">P/A</th>
                    <th className="border p-2 text-left font-semibold">Doctor Fee</th>
                    <th className="border p-2 text-left font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionData.bookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border p-4 text-center text-muted-foreground">
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
                        <td className="border p-2">{booking.receiptNoString || '-'}</td>
                        <td className="border p-2">{getAgentName(booking)}</td>
                        <td className="border p-2">
                          <span className={booking.status === 1 ? 'text-green-600' : 'text-amber-600'}>
                            {getPaymentStatus(booking.status)}
                          </span>
                        </td>
                        <td className="border p-2">{getCancelRefundStatus(booking)}</td>
                        <td className="border p-2">
                          <span className={booking.status === 1 ? 'text-green-600' : 'text-red-600'}>
                            {getPresentAbsentStatus(booking.status)}
                          </span>
                        </td>
                        <td className="border p-2">{formatCurrency(booking.professionalFee)}</td>
                        <td className="border p-2">{formatCurrency(booking.amount)}</td>
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
