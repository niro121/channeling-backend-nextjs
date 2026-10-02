import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getFingerprintVerificationAction,
  getFingerprintVerificationExportAction,
  logFingerprintVerificationVisitAction
} from '@/app/actions/attendance-actions/fingerprint-verification.actions';
import type { FingerprintVerificationSummary } from '@/types/attendance';
import FingerprintVerificationWorkspace from './fingerprint-verification-workspace';

type SearchParams = {
  searchParams?: Promise<{
    mode?: string;
    fromDate?: string;
    toDate?: string;
    shiftRosterId?: string;
    staffId?: string;
  }>;
};

const EMPTY_SUMMARY: FingerprintVerificationSummary = {
  verified: 0,
  late: 0,
  missingPunch: 0,
  earlyOut: 0
};

const EMPTY_FILTER_OPTIONS = {
  rosters: [] as { id: string; name: string }[],
  staff: [] as { id: string; name: string }[]
};

export default async function FingerprintVerificationPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/fingerprint-verification');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  void logFingerprintVerificationVisitAction();

  const params = await searchParams;
  const listParams = {
    mode: params?.mode,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    shiftRosterId: params?.shiftRosterId,
    staffId: params?.staffId
  };

  const result = await getFingerprintVerificationAction(listParams);
  const data = result.isError ? null : result.data;

  const handleExport = async () => {
    'use server';

    const exportResponse =
      await getFingerprintVerificationExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.message ?? 'No rows to export'
      };
    }
    return {
      success: true,
      data: exportResponse.data
    };
  };

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        {(result.errors as { message?: string })?.message ??
          'Unable to load fingerprint verification.'}
      </div>
    );
  }

  return (
    <FingerprintVerificationWorkspace
      mode={data.mode}
      fromDate={data.fromDate}
      toDate={data.toDate}
      summary={data.summary ?? EMPTY_SUMMARY}
      rows={data.rows}
      filterOptions={data.filterOptions ?? EMPTY_FILTER_OPTIONS}
      initialFilters={{
        mode: params?.mode ?? data.mode,
        fromDate: params?.fromDate ?? data.fromDate,
        toDate: params?.toDate ?? data.toDate,
        shiftRosterId: params?.shiftRosterId,
        staffId: params?.staffId
      }}
      onExport={handleExport}
    />
  );
}
