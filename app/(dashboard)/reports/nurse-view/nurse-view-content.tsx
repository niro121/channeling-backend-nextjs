'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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

type NurseViewReportContentProps = {
  sessionId: string;
};

export default function NurseViewReportContent({
  sessionId
}: NurseViewReportContentProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<NurseViewSessionData | null>(null);
  
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
    window.print();
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

  const getAgentStaffName = (booking: NurseViewSessionData['bookings'][0]) => {
    if (booking.agency?.name) {
      return booking.agency.name;
    }
    if (booking.staff?.name) {
      return booking.staff.name;
    }
    return '-';
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
              <CardTitle className="text-2xl font-bold">Nurse View Report</CardTitle>
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
          {/* Session Details */}
          <div className="mb-6 space-y-2">
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
                <span>{formatTime(sessionData.startTime)} - {formatTime(sessionData.endTime)}</span>
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
          <div className="mt-6">
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left font-semibold">App.No</th>
                    <th className="border p-2 text-left font-semibold">Patient Name</th>
                    <th className="border p-2 text-left font-semibold">Payment Status</th>
                    <th className="border p-2 text-left font-semibold">Remark</th>
                    <th className="border p-2 text-left font-semibold">Area</th>
                    <th className="border p-2 text-left font-semibold">Agent/ Staff</th>
                    <th className="border p-2 text-left font-semibold">Agent Ref.</th>
                    <th className="border p-2 text-left font-semibold">Mark Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionData.bookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border p-4 text-center text-muted-foreground">
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
                          <span className={booking.status === 1 ? 'text-green-600' : 'text-amber-600'}>
                            {getPaymentStatus(booking.status)}
                          </span>
                        </td>
                        <td className="border p-2">{booking.remarks || '-'}</td>
                        <td className="border p-2">{booking.area || '-'}</td>
                        <td className="border p-2">{getAgentStaffName(booking)}</td>
                        <td className="border p-2">{booking.agencyRef || '-'}</td>
                        <td className="border p-2">
                          <input type="checkbox" className="cursor-pointer" />
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
