'use client';

import { useEffect, useState } from 'react';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { DoctorLeaveColumns } from './columns';
import { DoctorLeaveListItem } from '@/types/doctor.leave';
import Loading from '../loading';
import { getDoctorLeaves } from '@/app/actions/doctor.leave.action';

interface DoctorLeavesListProps {
  doctorId: string | undefined;
  fromDate: string | undefined;
  toDate: string | undefined;
  page?: string;
  limit?: string;
}

export default function DoctorLeavesList({
  doctorId,
  fromDate,
  toDate,
  page = '0',
  limit = '10'
}: DoctorLeavesListProps) {
  const [data, setData] = useState<DoctorLeaveListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [doctorId, fromDate, toDate, page, limit]);

  if (!doctorId) {
    return (
      <p className="text-muted-foreground text-sm">
        Select a doctor and click Apply to view leaves.
      </p>
    );
  }

  if (loading) return <Loading />;

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  return (
    <CustomDataTable
      heading="Doctor Leaves"
      subHeading="Leaves for the selected doctor and date range."
      columns={DoctorLeaveColumns}
      data={data}
      rowCount={totalRecords}
      haveBulkDelete={false}
      page={page}
      limit={limit}
    />
  );
}
