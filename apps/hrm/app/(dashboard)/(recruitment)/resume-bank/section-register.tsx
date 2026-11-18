'use client';

import { Suspense, useState } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { cn } from '@/lib/utils';
import {
  RESUME_BANK_STATUS_LABELS,
  type ResumeBankFilters,
  type ResumeBankRecord,
  type VacancySelectOption
} from '@/types/recruitment';
import {
  RESUME_BANK_EXPORT_COLUMNS,
  RESUME_BANK_EXPORT_KEYS,
  resumeBankColumns
} from './columns';
import ResumeBankRecordActions from './record-actions';
import SectionFilters from './section-filters';

type ViewMode = 'table' | 'cards';

type ResumeBankExportRow = {
  profileId: string;
  candidateName: string;
  resumeFileName: string;
  email: string;
  phone: string;
  qualifications: string;
  experienceYears: string;
  skills: string;
  preferredPosition: string;
  preferredDepartment: string;
  location: string;
  source: string;
  dateAdded: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type SectionRegisterProps = {
  records?: ResumeBankRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: ResumeBankFilters;
  departmentOptions?: VacancySelectOption[];
  designationOptions?: VacancySelectOption[];
  onExport: () => Promise<{
    success: boolean;
    data?: ResumeBankExportRow[];
    message?: string;
  }>;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {},
  departmentOptions = [],
  designationOptions = [],
  onExport
}: SectionRegisterProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const viewToggle = (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      <Button
        type="button"
        size="sm"
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        className="h-8 gap-1.5 px-2.5"
        onClick={() => setViewMode('table')}
      >
        <Table2 className="h-3.5 w-3.5" />
        Table
      </Button>
      <Button
        type="button"
        size="sm"
        variant={viewMode === 'cards' ? 'default' : 'ghost'}
        className="h-8 gap-1.5 px-2.5"
        onClick={() => setViewMode('cards')}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Cards
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionFilters
        initial={initialFilters}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading candidates...
          </div>
        }
      >
        {viewMode === 'table' ? (
          <CommonDataTable
            heading="Candidate Profiles"
            subHeading="Searchable repository of candidate CVs and profiles."
            columns={resumeBankColumns}
            data={records}
            rowCount={totalRecords}
            page={page}
            showPagination
            toolbarRight={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {viewToggle}
                <DataTableExportFeature
                  showColumnToggle
                  showPrintButton
                  serverData={onExport}
                  columns={[...RESUME_BANK_EXPORT_COLUMNS]}
                  keys={[...RESUME_BANK_EXPORT_KEYS]}
                  title="Resume Bank"
                  fileName="resume-bank"
                />
              </div>
            }
          />
        ) : (
          <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Candidate Profiles</h2>
                <p className="text-sm text-muted-foreground">
                  Searchable repository of candidate CVs and profiles.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {viewToggle}
                <DataTableExportFeature
                  showColumnToggle={false}
                  showPrintButton
                  serverData={onExport}
                  columns={[...RESUME_BANK_EXPORT_COLUMNS]}
                  keys={[...RESUME_BANK_EXPORT_KEYS]}
                  title="Resume Bank"
                  fileName="resume-bank"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {records.map((record) => (
                <Card
                  key={record.id}
                  className="rounded-lg border border-border shadow-sm"
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {record.profileId}
                        </p>
                        <p className="font-semibold text-foreground">
                          {record.candidateName}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'shrink-0 border-0',
                          record.status === 'in_bank' &&
                            'bg-slate-100 text-slate-700 hover:bg-slate-100',
                          record.status === 'linked' &&
                            'bg-sky-100 text-sky-800 hover:bg-sky-100',
                          record.status === 'shortlisted' &&
                            'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                        )}
                      >
                        {RESUME_BANK_STATUS_LABELS[record.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {record.qualifications} · {record.experienceYears} yrs
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Prefers {record.preferredPosition || '—'}
                      {record.preferredDepartment
                        ? ` · ${record.preferredDepartment}`
                        : ''}
                    </p>
                    <p className="text-sm text-foreground">
                      {record.skills.join(', ') || '—'}
                    </p>
                    <div className="border-t border-border pt-2">
                      <ResumeBankRecordActions record={record} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!records.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No candidates found.
              </p>
            ) : null}

            <p className="text-sm text-muted-foreground">
              Showing {records.length} of {totalRecords} records
            </p>
          </div>
        )}
      </Suspense>
    </div>
  );
}
