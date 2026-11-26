'use client';

import React, { Suspense, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateAndTimeRangePicker } from '@/components/common/date-and-time-range-picker';
import { Input } from '@/components/ui/input';
import {
  getApiLogReportData,
  exportApiLogReportData,
} from '@/app/actions/reports/api.log.report.action';
import { ApiLogReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading';
import { ApiLogReportExportRow, ApiLogReportContentProps, ApiLogReportRow } from '@/types/reports/api.log';

function ApiLogReportContentInner(_props: ApiLogReportContentProps) {
  const searchParams = useSearchParams();

  const buildQuery = () => ({
    fromDateTime: searchParams.get('fromDateTime') ?? undefined,
    toDateTime: searchParams.get('toDateTime') ?? undefined,
    uuid: searchParams.get('uuid') ?? undefined,
  });

  const filterWrapperRef = useRef<HTMLDivElement>(null);

  // Force all filters to be on one row
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyLayout = () => {
      if (!filterWrapperRef.current) return;

      // 1. Force FilterWrapper container to use flex-nowrap and items-end
      const filterWrapperContainer = filterWrapperRef.current.querySelector('.border-b > div.flex.flex-wrap') as HTMLElement;
      if (filterWrapperContainer) {
        filterWrapperContainer.style.setProperty('flex-wrap', 'nowrap', 'important');
        filterWrapperContainer.style.setProperty('align-items', 'flex-end', 'important');
        filterWrapperContainer.style.setProperty('overflow-x', 'auto', 'important');
        filterWrapperContainer.style.setProperty('width', '100%', 'important');
      }

      // 1b. Also target the filterContent wrapper div
      const filterContentWrapper = filterWrapperRef.current.querySelector('.api-log-filters') as HTMLElement;
      if (filterContentWrapper) {
        filterContentWrapper.style.setProperty('flex-wrap', 'nowrap', 'important');
        filterContentWrapper.style.setProperty('flex-shrink', '0', 'important');
        filterContentWrapper.style.setProperty('display', 'flex', 'important');
        filterContentWrapper.style.setProperty('align-items', 'flex-end', 'important');
      }

      // 2. Make DateAndTimeRangePicker horizontal and hide its internal label
      const dateTimePickerRoot = filterWrapperRef.current.querySelector('.api-log-filters [class*="space-y-3"]') as HTMLElement;
      if (dateTimePickerRoot) {
        // Remove vertical spacing
        dateTimePickerRoot.classList.remove('space-y-3');
        dateTimePickerRoot.style.setProperty('display', 'flex', 'important');
        dateTimePickerRoot.style.setProperty('flex-direction', 'row', 'important');
        dateTimePickerRoot.style.setProperty('align-items', 'flex-end', 'important');
        dateTimePickerRoot.style.setProperty('gap', '0.75rem', 'important');
        dateTimePickerRoot.style.setProperty('flex-wrap', 'nowrap', 'important');
        dateTimePickerRoot.style.setProperty('flex-shrink', '0', 'important');
        dateTimePickerRoot.style.setProperty('margin', '0', 'important');

        // Hide the empty label inside DateAndTimeRangePicker
        const label = dateTimePickerRoot.querySelector('label') as HTMLElement;
        if (label) {
          label.style.setProperty('display', 'none', 'important');
        }

        // Make the inner flex-col container horizontal
        const innerFlexCol = dateTimePickerRoot.querySelector('.flex.flex-col') as HTMLElement;
        if (innerFlexCol) {
          innerFlexCol.style.setProperty('flex-direction', 'row', 'important');
          innerFlexCol.style.setProperty('gap', '0.75rem', 'important');
          innerFlexCol.style.setProperty('flex-wrap', 'nowrap', 'important');
          innerFlexCol.style.setProperty('align-items', 'flex-end', 'important');
        }

        // Make the date range and time pickers container horizontal
        const dateTimeContainer = dateTimePickerRoot.querySelector('.flex.flex-wrap.items-end') as HTMLElement;
        if (dateTimeContainer) {
          dateTimeContainer.style.setProperty('flex-wrap', 'nowrap', 'important');
          dateTimeContainer.style.setProperty('gap', '0.75rem', 'important');
        }

        // Hide the help text paragraph
        const helpText = dateTimePickerRoot.querySelector('p.text-xs.text-muted-foreground') as HTMLElement;
        if (helpText) {
          helpText.style.setProperty('display', 'none', 'important');
        }
      }
    };

    // Apply immediately and after a delay to catch late-rendered content
    applyLayout();
    const timeout1 = setTimeout(applyLayout, 50);
    const timeout2 = setTimeout(applyLayout, 200);
    const timeout3 = setTimeout(applyLayout, 500);

    // Use MutationObserver to handle dynamic changes
    const observer = new MutationObserver(() => {
      applyLayout();
    });

    if (filterWrapperRef.current) {
      observer.observe(filterWrapperRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="api-log-report-wrapper w-full" ref={filterWrapperRef}>
      <ReportTemplate<ApiLogReportRow, ApiLogReportExportRow>
        title="API Log Report"
        description="View API request logs with date range and filter by UUID"
        filterButtonLabel="Search"
        filterContent={({ values, setValue }) => (
          <div className="api-log-filters flex items-end gap-4 flex-nowrap shrink-0" style={{ flexWrap: 'nowrap', flexShrink: 0 }}>
            <div className="shrink-0" style={{ flexShrink: 0 }}>
              <DateAndTimeRangePicker
                label=""
                from={values.fromDateTime}
                to={values.toDateTime}
                onChange={({ from, to }) => {
                  setValue('fromDateTime', from);
                  setValue('toDateTime', to);
                }}
              />
            </div>
            <div className="shrink-0 w-56 min-w-[180px]" style={{ flexShrink: 0, width: '224px', minWidth: '180px' }}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black block whitespace-nowrap">
                  Search by UUID
                </label>
                <Input
                  id="uuid"
                  name="uuid"
                  placeholder="Enter UUID"
                  value={values.uuid ?? ''}
                  onChange={(e) => setValue('uuid', e.target.value || undefined)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const searchButton = filterWrapperRef.current?.querySelector('button[type="button"]') as HTMLButtonElement;
                      if (searchButton) searchButton.click();
                    }
                  }}
                  className="h-10"
                />
              </div>
            </div>
          </div>
        )}
        fetchData={async (params) => {
          const query = {
            fromDateTime: params.get('fromDateTime') ?? undefined,
            toDateTime: params.get('toDateTime') ?? undefined,
            uuid: params.get('uuid') ?? undefined,
          };
          return getApiLogReportData(query);
        }}
        exportData={async () => exportApiLogReportData(buildQuery())}
        columns={ApiLogReportColumns}
        exportColumns={[
          '#',
          'Date / Time',
          'Duration(S)',
          'API',
          'UUID',
          'Error Status',
          'Body'
        ]}
        exportKeys={
          [
            'id',
            'dateTime',
            'duration',
            'api',
            'uuid',
            'errorStatus',
            'body'
          ] as (keyof ApiLogReportExportRow)[]
        }
        exportTitle="API Log Report"
        exportFileName="api-log-report"
        getRowId={(row) => row.id}
        showPrintButton={true}
        emptyMessage="No API log records found. Apply filters and click Search."
        skipFetchWhenNoParams={true}
      />
    </div>
  );
}

export default function ApiLogReportContent(props: ApiLogReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ApiLogReportContentInner {...props} />
    </Suspense>
  );
}