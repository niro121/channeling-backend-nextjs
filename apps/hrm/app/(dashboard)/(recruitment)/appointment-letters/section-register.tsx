'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { getAppointmentLettersExport } from '@/app/actions/recruitment-actions/appointment-letter.actions';
import {
  APPOINTMENT_LETTER_STATUS_LABELS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  type AppointmentLetterFilters,
  type AppointmentLetterRecord
} from '@/types/recruitment';
import {
  APPOINTMENT_LETTER_EXPORT_COLUMNS,
  APPOINTMENT_LETTER_EXPORT_KEYS,
  appointmentLetterColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: AppointmentLetterRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: AppointmentLetterFilters;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {}
}: SectionRegisterProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    const response = await getAppointmentLettersExport(initialFilters);
    if (!response.success || !response.data?.length) {
      toast({
        title: 'Export',
        description: response.message ?? 'No letters to export.'
      });
      return {
        success: false,
        message: response.message ?? 'No letters found'
      };
    }

    const data = response.data.map((row) => ({
      letterNumber: row.letterNumber,
      candidateName: row.candidateName,
      position: row.position,
      department: row.department,
      employmentType:
        VACANCY_EMPLOYMENT_TYPE_LABELS[row.employmentType] ??
        row.employmentType,
      appointmentDate: row.appointmentDate,
      salary: row.salary,
      letterDate: row.letterDate,
      status: APPOINTMENT_LETTER_STATUS_LABELS[row.status] ?? row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    return { success: true, data };
  };

  return (
    <div className="space-y-4">
      <SectionFilters initial={initialFilters} />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading appointment letters...
          </div>
        }
      >
        <CommonDataTable
          heading="Appointment Letter Register"
          subHeading="Generate, approve and issue appointment letters to selected candidates."
          columns={appointmentLetterColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...APPOINTMENT_LETTER_EXPORT_COLUMNS]}
              keys={[...APPOINTMENT_LETTER_EXPORT_KEYS]}
              title="Appointment Letters"
              fileName="appointment-letters"
            />
          }
        />
      </Suspense>
    </div>
  );
}
