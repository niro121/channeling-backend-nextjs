import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  MOCK_PROMOTION_SUMMARY,
  MOCK_PROMOTIONS,
  type PromotionFilters
} from '@/types/performance';
import PromotionsWorkspace from './promotions-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    staffName?: string;
    staffCode?: string;
    institution?: string;
    department?: string;
    currentDesignation?: string;
    proposedDesignation?: string;
    promotionType?: string;
    requestDate?: string;
    effectiveDate?: string;
    approvalStatus?: string;
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

export default async function PromotionsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/promotions');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;
  const initialFilters: PromotionFilters = {
    staffName: normalizeFilter(params?.staffName),
    staffCode: normalizeFilter(params?.staffCode),
    institution: normalizeFilter(params?.institution),
    department: normalizeFilter(params?.department),
    currentDesignation: normalizeFilter(params?.currentDesignation),
    proposedDesignation: normalizeFilter(params?.proposedDesignation),
    promotionType: normalizeFilter(params?.promotionType),
    requestDate: normalizeFilter(params?.requestDate),
    effectiveDate: normalizeFilter(params?.effectiveDate),
    approvalStatus: normalizeFilter(params?.approvalStatus)
  };

  // Mock data for the UI preview. Replace with action/service calls (and apply
  // `initialFilters`) when the Promotions behaviour is implemented.
  const records = MOCK_PROMOTIONS;

  return (
    <PromotionsWorkspace
      summary={MOCK_PROMOTION_SUMMARY}
      records={records}
      totalRecords={records.length}
      page={params?.page}
      initialFilters={initialFilters}
      institutionOptions={uniqueOptions(records.map((r) => r.institution))}
      departmentOptions={uniqueOptions(records.map((r) => r.department))}
      currentDesignationOptions={uniqueOptions(
        records.map((r) => r.currentDesignation)
      )}
      proposedDesignationOptions={uniqueOptions(
        records.map((r) => r.proposedDesignation)
      )}
      designationOptions={uniqueOptions(
        records.flatMap((r) => [r.currentDesignation, r.proposedDesignation])
      )}
      gradeOptions={uniqueOptions(
        records.flatMap((r) => [r.currentGrade, r.proposedGrade])
      )}
      staffOptions={records.map((r) => ({
        id: r.staffCode,
        name: `${r.staffName} (${r.staffCode})`
      }))}
    />
  );
}
