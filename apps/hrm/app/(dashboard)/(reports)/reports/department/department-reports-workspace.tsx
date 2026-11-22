'use client';

import { useRouter } from 'next/navigation';
import { BarChart3, Eye } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  DepartmentReportCards,
  DepartmentReportFilterOptions,
  DepartmentReportRow,
  ReportChartPoint
} from '@/types/reports';
import {
  DepartmentReportsUiProvider,
  useDepartmentReportsUi
} from './department-reports-ui-context';
import SectionAnalytics from './section-analytics';
import SectionFilters from './section-filters';
import SectionResults from './section-results';
import SectionSummaryCards from './section-summary-cards';
import SheetDepartmentDetail from './sheet-department-detail';

type DepartmentReportsWorkspaceProps = {
  fromDate: string;
  toDate: string;
  periodLabel: string;
  cards: DepartmentReportCards;
  staffByDepartment: ReportChartPoint[];
  payrollByDepartment: ReportChartPoint[];
  rows: DepartmentReportRow[];
  totalRecords: number;
  page?: string;
  category?: string;
  keyword?: string;
  filterOptions: DepartmentReportFilterOptions;
  initialFilters: {
    fromDate?: string;
    toDate?: string;
    institution?: string;
    departmentId?: string;
  };
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function HeaderActions({ periodLabel }: { periodLabel: string }) {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => {
          toast({
            title: 'Report preview',
            description: `Showing generated department report for ${periodLabel}.`
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <Eye className="h-4 w-4" />
        Report Preview
      </Button>
      <Button
        type="button"
        className="gap-2"
        onClick={() => {
          router.refresh();
          toast({
            title: 'Report generated',
            description: 'Department report refreshed with current filters.',
            variant: 'success'
          });
        }}
      >
        <BarChart3 className="h-4 w-4" />
        Generate Report
      </Button>
    </>
  );
}

function DepartmentReportsWorkspaceInner(
  props: DepartmentReportsWorkspaceProps
) {
  const { detailRecord, closeDetail } = useDepartmentReportsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Department Reports"
        description="Department workforce, staffing gaps and operational comparisons."
        actions={<HeaderActions periodLabel={props.periodLabel} />}
      />

      <SectionFilters
        filterOptions={props.filterOptions}
        initial={props.initialFilters}
        periodLabel={props.periodLabel}
      />

      <SectionSummaryCards cards={props.cards} />

      <SectionAnalytics
        staffByDepartment={props.staffByDepartment}
        payrollByDepartment={props.payrollByDepartment}
      />

      <SectionResults
        rows={props.rows}
        totalRecords={props.totalRecords}
        page={props.page}
        periodLabel={props.periodLabel}
        category={props.category}
        keyword={props.keyword}
        onExport={props.onExport}
      />

      <SheetDepartmentDetail
        open={!!detailRecord}
        record={detailRecord}
        periodLabel={props.periodLabel}
        onOpenChange={(next) => {
          if (!next) closeDetail();
        }}
      />
    </div>
  );
}

export default function DepartmentReportsWorkspace(
  props: DepartmentReportsWorkspaceProps
) {
  return (
    <DepartmentReportsUiProvider>
      <DepartmentReportsWorkspaceInner {...props} />
    </DepartmentReportsUiProvider>
  );
}
