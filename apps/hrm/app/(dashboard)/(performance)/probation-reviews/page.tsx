import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  MOCK_PROBATION_REVIEWS,
  MOCK_PROBATION_SUMMARY,
  type ProbationReviewFilters
} from '@/types/performance';
import ProbationReviewsWorkspace from './probation-reviews-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    staffName?: string;
    staffCode?: string;
    institution?: string;
    department?: string;
    designation?: string;
    reportingManager?: string;
    probationStartDate?: string;
    probationEndDate?: string;
    reviewStatus?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ id: value, name: value }));
}

export default async function ProbationReviewsPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/probation-reviews');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;
  const initialFilters: ProbationReviewFilters = {
    staffName: normalizeFilter(params?.staffName),
    staffCode: normalizeFilter(params?.staffCode),
    institution: normalizeFilter(params?.institution),
    department: normalizeFilter(params?.department),
    designation: normalizeFilter(params?.designation),
    reportingManager: normalizeFilter(params?.reportingManager),
    probationStartDate: normalizeFilter(params?.probationStartDate),
    probationEndDate: normalizeFilter(params?.probationEndDate),
    reviewStatus: normalizeFilter(params?.reviewStatus)
  };

  // Mock data for the UI preview. Replace with action/service calls (and apply
  // `initialFilters`) when the Probation Reviews behaviour is implemented.
  const records = MOCK_PROBATION_REVIEWS;

  return (
    <ProbationReviewsWorkspace
      summary={MOCK_PROBATION_SUMMARY}
      records={records}
      totalRecords={records.length}
      page={params?.page}
      initialFilters={initialFilters}
      institutionOptions={uniqueOptions(records.map((r) => r.institution))}
      departmentOptions={uniqueOptions(records.map((r) => r.department))}
      designationOptions={uniqueOptions(records.map((r) => r.designation))}
      staffOptions={records.map((r) => ({
        id: r.staffCode,
        name: `${r.staffName} (${r.staffCode})`
      }))}
    />
  );
}
