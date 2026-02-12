import React from 'react';
import { getDoctorOptions } from '@/app/actions/sessions.action';
import FilterSection from './filter-section';
import DoctorLeavesList from './doctor-leaves-list';
import AddLeavePopup from './add-leave-popup';

type SearchParams = {
  searchParams?: Promise<{
    doctorId?: string;
    fromDate?: string;
    toDate?: string;
    page?: string;
    limit?: string;
  }>;
};

export default async function DoctorLeavesPage({ searchParams }: SearchParams) {
  const params = await searchParams;
  const doctorOptions = await getDoctorOptions();

  return (
    <div className="overflow-hidden">
      <div className="mt-2 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSection
            doctorOptions={doctorOptions.data ?? []}
            doctorId={params?.doctorId}
            fromDate={params?.fromDate}
            toDate={params?.toDate}
          />
          {params?.doctorId !== undefined && (
            <div className="ml-auto self-center">
              <AddLeavePopup />
            </div>
          )}
        </div>
        <div className="overflow-hidden">
          <DoctorLeavesList
            doctorId={params?.doctorId}
            fromDate={params?.fromDate}
            toDate={params?.toDate}
            page={params?.page}
            limit={params?.limit}
          />
        </div>
      </div>
    </div>
  );
}
