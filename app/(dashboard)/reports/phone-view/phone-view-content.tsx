'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getPhoneViewReportData, exportPhoneViewReportData } from '@/app/actions/reports/phone-view.action';
import { PhoneViewSessionData } from '@/types/report';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { Printer } from 'lucide-react';
import moment from 'moment';
import { ExportWrapper } from '../../export-wrapper';
import { printPdfUtilWithHeader } from '@/lib/utils';

type PhoneViewReportContentProps = {
  sessionId: string;
};

export default function PhoneViewReportContent({
  sessionId
}: PhoneViewReportContentProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<PhoneViewSessionData | null>(null);
  
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
      const result = await getPhoneViewReportData({ sessionId });

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

    type PhoneViewPrintRow = {
      appNo: string;
      bookingId: string;
      patientName: string;
      phoneNo: string;
      time: string;
      presentAbsent: string;
    };

    const headerLines = [
      `Branch: ${sessionData.location?.name || 'Ruhunu Hospital (Pvt) Ltd'}`,
      sessionData.location?.address
        ? `Address: ${sessionData.location.address}`
        : '',
      `Consultant: ${
        sessionData.doctor
          ? `${sessionData.doctor.title} ${sessionData.doctor.name}`.trim()
          : '-'
      }`,
      `Date: ${formatDate(sessionData.date)}`,
      `Session Name: ${formatSessionName(
        sessionData.date,
        sessionData.startTime
      )}`
    ].filter(Boolean);

    const timeStr = formatTime(sessionData.startTime);

    const data: PhoneViewPrintRow[] = (sessionData.bookings ?? []).map(
      (booking) => ({
        appNo: String(booking.appointmentNo ?? '-'),
        bookingId: booking.bookingId || '-',
        patientName: `${booking.title ?? ''} ${booking.name ?? ''}`.trim() || '-',
        phoneNo: booking.phone || '-',
        time: timeStr,
        presentAbsent: getPresentAbsentStatus(booking)
      })
    );

    const columns = [
      'App No.',
      'Booking Id',
      'Patient Name',
      'Phone No',
      'Time',
      'P/A'
    ];

    const keys = [
      'appNo',
      'bookingId',
      'patientName',
      'phoneNo',
      'time',
      'presentAbsent'
    ] as (keyof PhoneViewPrintRow)[];

    printPdfUtilWithHeader<PhoneViewPrintRow>({
      title: 'Phone View Report',
      headerLines,
      data,
      columns,
      keys
    });
  };

  const formatTime = (date: Date) => {
    return moment(date).format('hh:mm:ss A');
  };

  const formatDate = (date: Date) => {
    return moment(date).format('YYYY-MM-DD');
  };

  const formatSessionName = (date: Date, startTime: Date) => {
    const dateStr = moment(date).format('DD MM YYYY');
    const timeStr = moment(startTime).format('h.mm A');
    return `${dateStr} ${timeStr}`;
  };

  const getPresentAbsentStatus = (
    booking: PhoneViewSessionData['bookings'][0]
  ) => {
    // Same rule as Doctor View: status=1 => Present, otherwise => Absent
    return booking.status === 1 ? 'Present' : 'Absent';
  };

  const getCancelRefundStatus = (booking: PhoneViewSessionData['bookings'][0]) => {
    const refund = Number(booking.refund ?? 0);
    if (refund === 3) return 'C';
    if (refund === 1) return 'R';
    if (refund === 2) return 'R';
    return '-';
  };

  const handleExport = async () => {
    if (!sessionId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Session ID is required'
      });
      return { success: false, message: 'Session ID is required' };
    }

    return await exportPhoneViewReportData({ sessionId });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
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

  return (
    <div className="container mx-auto py-6 space-y-6 print:py-2">
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Phone View</CardTitle>
            </div>
            <div className="flex gap-2">
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
        <CardContent>
          {/* Header Information */}
          <div className="mb-6 space-y-2 text-center print:text-left">
            <div className="font-bold text-lg">
              {sessionData.location?.name || 'Ruhunu Hospital (Pvt) Ltd'}
            </div>
            {sessionData.location?.address && (
              <div className="text-sm text-muted-foreground">
                {sessionData.location.address}
              </div>
            )}
            <div className="font-semibold text-base mt-2">Phone View</div>
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

          {/* Export Buttons */}
          <div className="mb-4 flex gap-2 print:hidden">
            <ExportWrapper
              serverData={handleExport}
              columns={[
                'App No.',
                'Booking Id',
                'Patient Name',
                'Phone No',
                'Time',
                'P/A'
              ]}
              keys={[
                'appNo',
                'bookingId',
                'patientName',
                'phoneNo',
                'time',
                'presentAbsent'
              ]}
              title="Phone View Report"
              fileName={`phone-view-report-${formatDate(sessionData.date)}`}
            />
          </div>

          {/* Patient List Table */}
          <div className="mt-6">
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left font-semibold">App No.</th>
                    <th className="border p-2 text-left font-semibold">Booking Id</th>
                    <th className="border p-2 text-left font-semibold">Patient Name</th>
                    <th className="border p-2 text-left font-semibold">Phone No</th>
                    <th className="border p-2 text-left font-semibold">Time</th>
                    <th className="border p-2 text-left font-semibold">C / R</th>
                    <th className="border p-2 text-left font-semibold">P/A</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionData.bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border p-4 text-center text-muted-foreground">
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    sessionData.bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="border p-2">{booking.appointmentNo}</td>
                        <td className="border p-2">{booking.bookingId}</td>
                        <td className="border p-2">
                          {booking.title} {booking.name}
                        </td>
                        <td className="border p-2">{booking.phone || '-'}</td>
                        <td className="border p-2">{formatTime(sessionData.startTime)}</td>
                        <td className="border p-2">{getCancelRefundStatus(booking)}</td>
                        <td className="border p-2">
                          <span className={booking.status === 1 ? 'text-green-600' : 'text-red-600'}>
                            {getPresentAbsentStatus(booking)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
