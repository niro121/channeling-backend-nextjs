'use client';

import { useRouter } from 'next/navigation';
import { CustomDataTable } from '@archmage/ui';
import type { PatientBill } from '@/types/patient-bill';
import { patientBillColumns } from './columns';

type PatientBillsTableProps = {
  data: PatientBill[];
  totalRecords: number;
  page?: string;
  limit?: string;
  toolbarLeft: React.ReactNode;
  headingRight: React.ReactNode;
};

export function PatientBillsTable({
  data,
  totalRecords,
  page,
  limit,
  toolbarLeft,
  headingRight,
}: PatientBillsTableProps) {
  const router = useRouter();

  return (
    <CustomDataTable
      heading="Patient Bills"
      subHeading="Bills raised for admitted patients."
      columns={patientBillColumns}
      data={data}
      rowCount={totalRecords}
      haveBulkDelete={false}
      page={page}
      limit={limit}
      headingRight={headingRight}
      toolbarLeft={toolbarLeft}
      onRowClick={(bill) => router.push(`/patient-bills/${bill.id}`)}
    />
  );
}
