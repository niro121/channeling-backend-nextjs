'use client';

import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { SessionColumns, SessionListItem } from './columns';
import { SessionRefetchContext } from './record-actions';
import { getAllSessions } from '@/app/actions/sessions.action';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarX2 } from 'lucide-react';

export interface SessionsListRef {
  refetch: () => void;
}

type BranchOption = { id: string; name: string };

interface SessionsListProps {
  doctorId: string | undefined;
  fromDate: string | undefined;
  toDate: string | undefined;
  page?: string;
  limit?: string;
  branchOptions: BranchOption[];
  branchId?: string;
}

const SessionsList = forwardRef<SessionsListRef, SessionsListProps>(function SessionsList({
  doctorId,
  fromDate,
  toDate,
  page = '0',
  limit = '10',
  branchOptions,
  branchId,
}, ref) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<SessionListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = Boolean(fromDate && toDate);

  const branchSelectValue =
    branchId && /^[a-fA-F0-9]{24}$/.test(branchId) ? branchId : '__all__';

  const onBranchChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (value === '__all__') {
      params.delete('branchId');
    } else {
      params.set('branchId', value);
    }
    params.delete('page');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const branchFilterRight = (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Branch</span>
      <Select value={branchSelectValue} onValueChange={onBranchChange}>
        <SelectTrigger
          aria-label="Filter by branch"
          className="h-9 w-[min(90vw,13rem)] sm:w-[13rem]"
        >
          <SelectValue placeholder="Branch" />
        </SelectTrigger>
        <SelectContent>
          {branchOptions.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const fetchSessions = useCallback(async () => {
    if (!hasFilters) {
      setData([]);
      setTotalRecords(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getAllSessions({
        doctorId: doctorId && doctorId !== '-1' && doctorId !== '__all__' ? doctorId : undefined,
        fromDate,
        toDate,
        page,
        limit,
        branchId:
          branchId && /^[a-fA-F0-9]{24}$/.test(branchId) ? branchId : undefined,
      });

      if (result.success && result.data) {
        setData((result.data as SessionListItem[]) ?? []);
        setTotalRecords(result.totalRecords ?? 0);
      } else {
        setData([]);
        setTotalRecords(0);
        setError(result.message ?? 'Failed to load sessions');
      }
    } catch (e: unknown) {
      setData([]);
      setTotalRecords(0);
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [doctorId, fromDate, toDate, page, limit, branchId, hasFilters]);

  useImperativeHandle(ref, () => ({ refetch: fetchSessions }), [fetchSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  if (!hasFilters) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarX2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">Select filters to view sessions</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Choose a doctor and set From date and To date, then use Analyse & Create or Update Only to generate or update sessions. The list will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="mt-4">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-lg font-semibold">Sessions list</CardTitle>
            <CardDescription className="text-muted-foreground">Loading sessions…</CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-0.5 sm:pt-1">
            {branchFilterRight}
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading sessions…</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 border-destructive/50">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-lg font-semibold">Sessions list</CardTitle>
            <CardDescription className="text-destructive">Could not load sessions</CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-0.5 sm:pt-1">
            {branchFilterRight}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <SessionRefetchContext.Provider value={fetchSessions}>
      <div className="mt-4">
        <CustomDataTable<SessionListItem, unknown>
          columns={SessionColumns}
          data={data}
          rowCount={totalRecords}
          heading="Sessions list"
          subHeading={`${totalRecords} session${totalRecords === 1 ? '' : 's'} in the selected range.${
            totalRecords === 0
              ? ' Try another branch or use Analyse & Create above to generate sessions.'
              : ''
          }`}
          page={page}
          limit={limit}
          haveBulkDelete={false}
          headingRight={branchFilterRight}
        />
      </div>
    </SessionRefetchContext.Provider>
  );
});

export default SessionsList;
