'use client';

import { useCallback, useEffect, useState } from 'react';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { DoctorLeaveColumns } from './columns';
import { DoctorLeaveListItem } from '@/types/doctor.leave';
import Loading from '../loading';
import {
  bulkDeleteDoctorLeaves,
  getDoctorLeaves
} from '@/app/actions/doctor.leave.action';
import FilterSection from './filter-section';
import AddBtnSection from './add-btn-section';
import { DoctorLeavesRefreshProvider } from './doctor-leaves-refresh-context';

interface DoctorLeavesListProps {
  doctorId: string | undefined;
  doctorName: string | undefined;
  fromDate: string | undefined;
  toDate: string | undefined;
  page?: string;
  limit?: string;
  doctorOptions?: { id: string; name: string }[];
}

export default function DoctorLeavesList({
  doctorId,
  doctorName,
  fromDate,
  toDate,
  page = '0',
  limit = '10',
  doctorOptions
}: DoctorLeavesListProps) {
  const [data, setData] = useState<DoctorLeaveListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refetch = useCallback(() => setRefreshTrigger((t) => t + 1), []);

  useEffect(() => {
    if (!doctorId) {
      setData([]);
      setTotalRecords(0);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getDoctorLeaves({
      doctorId,
      fromDate,
      toDate,
      page,
      limit
    })
      .then((res) => {
        if (cancelled) return;

        if (res.success) {
          setData(res.data ?? []);
          setTotalRecords(res.totalRecords ?? 0);
        } else {
          setData([]);
          setTotalRecords(0);
          setError(res.message ?? 'Failed to load leaves');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData([]);
          setTotalRecords(0);
          setError(err?.message ?? 'Failed to load leaves');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doctorId, fromDate, toDate, page, limit, refreshTrigger]);

  if (loading) return <Loading />;

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  return (
    <DoctorLeavesRefreshProvider refetch={refetch}>
      <CustomDataTable
        heading="Doctor Leaves"
        subHeading={
          doctorId
            ? 'Leaves for the selected doctor and date range.'
            : 'Select a doctor and click Apply to view leaves.'
        }
        columns={DoctorLeaveColumns}
        data={data}
        rowCount={totalRecords}
        deleteServerAction={async (ids: string[]) => {
          const res = await bulkDeleteDoctorLeaves(ids);
          if (res.success) refetch();
          return res.success === true;
        }}
        haveBulkDelete={true}
        page={page}
        limit={limit}
        toolbarLeft={
          <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
            <FilterSection
              doctorOptions={doctorOptions ?? []}
              doctorId={doctorId}
              fromDate={fromDate}
              toDate={toDate}
            />
          </div>
        }
        toolbarRight={
          <AddBtnSection doctorId={doctorId} doctorName={doctorName} />
        }
      />
    </DoctorLeavesRefreshProvider>
  );
}
