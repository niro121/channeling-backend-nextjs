'use client';

import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { SessionColumns, SessionListItem } from './columns';
import { SessionRefetchContext } from './record-actions';
import { getAllSessions } from '@/app/actions/sessions.action';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarX2 } from 'lucide-react';

export interface SessionsListRef {
  refetch: () => void;
}

interface SessionsListProps {
  doctorId: string | undefined;
  fromDate: string | undefined;
  toDate: string | undefined;
  page?: string;
  limit?: string;
}

const SessionsList = forwardRef<SessionsListRef, SessionsListProps>(function SessionsList({
  doctorId,
  fromDate,
  toDate,
  page = '0',
  limit = '10'
}, ref) {
  const [data, setData] = useState<SessionListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = Boolean(fromDate && toDate);

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
        limit
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
  }, [doctorId, fromDate, toDate, page, limit, hasFilters]);

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
        <CardContent className="flex items-center justify-center py-16">
          <div className="animate-pulse text-muted-foreground">Loading sessions…</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-destructive font-medium mb-1">Could not load sessions</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (totalRecords === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarX2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No sessions in this range</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            There are no sessions for the selected doctor and date range.
          </p>
          <p className="text-sm text-muted-foreground">
            Use <strong>Analyse & Create</strong> above to generate sessions from doctor schedules.
          </p>
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
          subHeading={`${totalRecords} session${totalRecords === 1 ? '' : 's'} in the selected range.`}
          page={page}
          limit={limit}
          haveBulkDelete={false}
        />
      </div>
    </SessionRefetchContext.Provider>
  );
});

export default SessionsList;
