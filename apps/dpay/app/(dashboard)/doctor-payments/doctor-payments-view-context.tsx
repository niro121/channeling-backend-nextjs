'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CustomDataTable } from '@archmage/ui';
import { DoctorPaymentDetailsDialog } from '@/components/doctor-payments/doctor-payment-details-dialog';
import { doctorPaymentColumns } from './columns';
import type { DoctorPaymentListItem } from '@/types/doctor-payment';

type DoctorPaymentsViewContextValue = {
  openView: (item: DoctorPaymentListItem) => void;
};

const DoctorPaymentsViewContext = createContext<DoctorPaymentsViewContextValue | null>(null);

export function useDoctorPaymentsView() {
  return useContext(DoctorPaymentsViewContext);
}

type DoctorPaymentsTableWithDialogProps = {
  data: DoctorPaymentListItem[];
  totalRecords: number;
  page?: string;
  limit?: string;
  toolbarLeft: React.ReactNode;
  headingRight?: React.ReactNode;
};

export function DoctorPaymentsTableWithDialog({
  data,
  totalRecords,
  page,
  limit,
  toolbarLeft,
  headingRight,
}: DoctorPaymentsTableWithDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const openView = useCallback((item: DoctorPaymentListItem) => setSelectedId(item.id), []);

  return (
    <>
      <DoctorPaymentsViewContext.Provider value={{ openView }}>
        <CustomDataTable
          heading="Doctor Payment Manager"
          subHeading="View, search and manage doctor payments."
          columns={doctorPaymentColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={page}
          limit={limit}
          toolbarLeft={toolbarLeft}
          headingRight={headingRight}
        />
      </DoctorPaymentsViewContext.Provider>

      <DoctorPaymentDetailsDialog
        paymentId={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </>
  );
}
