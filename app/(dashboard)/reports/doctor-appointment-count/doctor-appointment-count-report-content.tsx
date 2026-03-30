'use client';

import React, { useState } from 'react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/common/date-range-picker';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import { Download, Printer, SearchIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/hooks/use-toast';
import {
  getDoctorAppointmentCountReportData,
} from '@/app/actions/reports/doctor-appointment-count.report.action';
import type {
  DoctorAppointmentCountReportContentProps,
  DoctorAppointmentCountReportRow,
  DoctorAppointmentCountReportTotals,
} from '@/types/reports/doctor-appointment-count';

const BOOKING_TYPE_OPTIONS = [
  { id: 'scan', name: 'Scan' },
];

const GROUP_BY_OPTIONS = [
  { id: 'speciality', name: 'Group By Speciality' },
];

const SESSION_OPTIONS = [
  { id: 'morning', name: 'Morning' },
  { id: 'evening', name: 'Evening' },
];

function defaultRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}`, to: `${y}-${m}-${d}` };
}

const money = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DoctorAppointmentCountReportContent({
  locationOptions,
  specialityOptions,
  doctorOptions,
  currentUserName,
}: DoctorAppointmentCountReportContentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DoctorAppointmentCountReportRow[]>([]);
  const [totals, setTotals] = useState<DoctorAppointmentCountReportTotals | null>(null);
  const [reportMeta, setReportMeta] = useState<{
    from: string;
    to: string;
    branchLabel: string;
    specialityLabel: string;
    doctorLabel: string;
    bookingTypeLabel: string;
    groupByLabel: string;
    sessionLabel: string;
    generatedBy: string;
    generatedAt: string;
  } | null>(null);

  const [fromDateTime, setFromDateTime] = useState(defaultRange().from);
  const [toDateTime, setToDateTime] = useState(defaultRange().to);
  const [locationId, setLocationId] = useState('__all__');
  const [specialityId, setSpecialityId] = useState('__all__');
  const [doctorId, setDoctorId] = useState('__all__');
  const [bookingType, setBookingType] = useState('__all__');
  const [groupBy, setGroupBy] = useState('__none__');
  const [sessionType, setSessionType] = useState('__all__');

  const branchOptions = locationOptions.filter((o) => o.id !== '__all__');
  const specialityFilteredOptions = specialityOptions.filter((o) => o.id !== '__all__');
  const doctorFilteredOptions = doctorOptions.filter((o) => o.id !== '__all__');
  const optionListsLoading =
    branchOptions.length === 0 || specialityFilteredOptions.length === 0 || doctorFilteredOptions.length === 0;

  const buildQuery = () => ({
    fromDateTime,
    toDateTime,
    locationId: locationId !== '__all__' ? locationId : undefined,
    specialityId: specialityId !== '__all__' ? specialityId : undefined,
    doctorId: doctorId !== '__all__' ? doctorId : undefined,
    bookingType: bookingType !== '__all__' ? bookingType : undefined,
    groupBy: groupBy !== '__none__' ? groupBy : undefined,
    sessionType: sessionType !== '__all__' ? sessionType : undefined,
  });

  const onSearch = async () => {
    if (optionListsLoading) {
      toast({
        variant: 'destructive',
        title: 'Please wait',
        description: 'Filter options are still loading.',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await getDoctorAppointmentCountReportData(buildQuery());
      if (!res.success) {
        toast({ variant: 'destructive', title: 'Error', description: res.message || 'Failed to load report' });
        setRows([]);
        setTotals(null);
        setReportMeta(null);
        return;
      }
      setRows(res.data);
      setTotals(res.totals);
      setReportMeta({
        from: fromDateTime,
        to: toDateTime,
        branchLabel: branchOptions.find((o) => o.id === locationId)?.name ?? 'All Branches',
        specialityLabel: specialityFilteredOptions.find((o) => o.id === specialityId)?.name ?? 'All Specialities',
        doctorLabel: doctorFilteredOptions.find((o) => o.id === doctorId)?.name ?? 'All Doctors',
        bookingTypeLabel: bookingType === 'scan' ? 'Scan' : 'All Bookings',
        groupByLabel: groupBy === 'speciality' ? 'Group By Speciality' : 'No Group',
        sessionLabel: sessionType === 'morning' ? 'Morning' : sessionType === 'evening' ? 'Evening' : 'All Sessions',
        generatedBy: currentUserName,
        generatedAt: new Date().toLocaleString(),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load report';
      toast({ variant: 'destructive', title: 'Error', description: msg });
      setRows([]);
      setTotals(null);
      setReportMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const formatRangeLabel = (fromStr: string, toStr: string) => `${fromStr} 00:00:00 - ${toStr} 23:59:59`;

  const renderReportMetaCard = () =>
    reportMeta ? (
      <div className="rounded-md border border-primary/30 bg-primary/5 shadow-sm px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2 border-l-2 border-primary pl-2">
          <p className="text-[11px] font-semibold tracking-wide text-primary">Report Generation Details</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-0.5 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Filters</p>
            <p className="text-[11px] leading-tight font-medium">
              Range: {formatRangeLabel(reportMeta.from, reportMeta.to)} | Branch: {reportMeta.branchLabel} | Speciality: {reportMeta.specialityLabel} | Doctor: {reportMeta.doctorLabel}
            </p>
            <p className="text-[11px] leading-tight font-medium">
              Booking: {reportMeta.bookingTypeLabel} | Group By: {reportMeta.groupByLabel} | Session: {reportMeta.sessionLabel}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Generated by</p>
            <p className="text-[11px] font-semibold leading-tight">{reportMeta.generatedBy}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Generated at</p>
            <p className="text-[11px] font-semibold leading-tight">{reportMeta.generatedAt}</p>
          </div>
        </div>
      </div>
    ) : null;

  const handlePrint = () => window.print();

  const handleDownloadCsv = () => {
    if (rows.length === 0) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download CSV.' });
      return;
    }
    const lines: string[] = [];
    lines.push([
      'Consultant',
      'Speciality',
      'Not Paid',
      'Paid',
      'Cancel',
      'Hos Refund',
      'Pro Refund',
      'Hos Valid',
      'Pro Valid',
      'Nett Valid',
      'Hos',
      'Pro',
      'Total ( Rs. )',
    ].join(','));
    for (const r of rows) {
      lines.push([
        r.consultant,
        r.speciality,
        String(r.notPaid),
        String(r.paid),
        String(r.cancel),
        String(r.hosRefund),
        String(r.proRefund),
        String(r.hosValid),
        String(r.proValid),
        String(r.nettValid),
        money(r.hos),
        money(r.pro),
        money(r.total),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
    if (totals) {
      lines.push([
        'Total',
        '',
        String(totals.notPaid),
        String(totals.paid),
        String(totals.cancel),
        String(totals.hosRefund),
        String(totals.proRefund),
        String(totals.hosValid),
        String(totals.proValid),
        String(totals.nettValid),
        money(totals.hos),
        money(totals.pro),
        money(totals.total),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-appointment-count-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full py-2 space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">Doctor Appointment Count Report ( By Session Date )</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Receipt-count based appointment summary by booking session date.
              </CardDescription>
            </div>
            <div className="flex gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCsv} className="gap-2">
                <Download />
                Download CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 items-start mb-4 pb-3 border-b no-print">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Date Range</label>
              <DateRangePicker
                from={fromDateTime}
                to={toDateTime}
                onChange={({ from, to }) => {
                  setFromDateTime(from ?? '');
                  setToDateTime(to ?? '');
                }}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Combobox
                label="All Branches"
                options={branchOptions}
                value={locationId}
                defaultValue="__all__"
                onChange={(v) => setLocationId(v ?? '__all__')}
                loading={optionListsLoading}
              />
              <Combobox
                label="All Specialities"
                options={specialityFilteredOptions}
                value={specialityId}
                defaultValue="__all__"
                onChange={(v) => setSpecialityId(v ?? '__all__')}
                loading={optionListsLoading}
              />
              <Combobox
                label="All Doctors"
                options={doctorFilteredOptions}
                value={doctorId}
                defaultValue="__all__"
                onChange={(v) => setDoctorId(v ?? '__all__')}
                loading={optionListsLoading}
              />
              <Selector label="All Bookings" options={BOOKING_TYPE_OPTIONS} value={bookingType} onChange={setBookingType} />
              <Selector label="No Group" options={GROUP_BY_OPTIONS} value={groupBy} defaultValue="__none__" onChange={setGroupBy} />
              <Selector label="All Sessions" options={SESSION_OPTIONS} value={sessionType} onChange={setSessionType} />
              <Button onClick={onSearch} disabled={loading || optionListsLoading} className="gap-2">
                <SearchIcon className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !reportMeta ? (
            <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Search to view report details.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">No data available. Apply filters and click Search.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {renderReportMetaCard()}
              <div className="rounded-md border overflow-x-auto">
                <Table className="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="text-left">Consultant</TableHead>
                      <TableHead className="text-left">Speciality</TableHead>
                    <TableHead className="text-center">Not Paid</TableHead>
                    <TableHead className="text-center">Paid</TableHead>
                    <TableHead className="text-center">Cancel</TableHead>
                    <TableHead className="text-center">Hos Refund</TableHead>
                    <TableHead className="text-center">Pro Refund</TableHead>
                    <TableHead className="text-center">Hos Valid</TableHead>
                    <TableHead className="text-center">Pro Valid</TableHead>
                    <TableHead className="text-center">Nett Valid</TableHead>
                    <TableHead className="text-right">Hos</TableHead>
                    <TableHead className="text-right">Pro</TableHead>
                    <TableHead className="text-right">Total ( Rs. )</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.rowId} className="border-b border-border/50">
                        <TableCell>{r.consultant}</TableCell>
                        <TableCell>{r.speciality}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.notPaid}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.paid}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.cancel}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.hosRefund}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.proRefund}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.hosValid}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.proValid}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.nettValid}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.hos)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.pro)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.total)}</TableCell>
                      </TableRow>
                    ))}
                    {totals && (
                    <TableRow className="font-semibold bg-muted/50">
                        <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.notPaid}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.paid}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.cancel}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.hosRefund}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.proRefund}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.hosValid}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.proValid}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.nettValid}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(totals.hos)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(totals.pro)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(totals.total)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {renderReportMetaCard()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
