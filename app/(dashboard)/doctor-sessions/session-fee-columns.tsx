import { ColumnDef } from '@tanstack/react-table';
import { Fee } from '@/types/doctor.session';
import React from 'react';
import { Input } from '@/components/ui/input';

export const DoctorSessionFeeColumns = (formik: any): ColumnDef<Fee>[] => [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'feeType',
    header: 'Fee Type'
  },
  {
    accessorKey: 'localFee',
    header: 'Local Fee',
    cell: ({ row }) => {
      const index = row.index;

      return (
        <Input
          type="number"
          min={0}
          className="p-2 text-right"
          value={formik.values.fees[index].localFee}
          onChange={(e) =>
            formik.setFieldValue(
              `fees.${index}.localFee`,
              Number(e.target.value)
            )
          }
        />
      );
    }
  },
  {
    accessorKey: 'foreignFee',
    header: 'Foreign Fee',
    cell: ({ row }) => {
      const index = row.index;

      return (
        <Input
          type="number"
          min={0}
          className="p-2 text-right"
          value={formik.values.fees[index].foreignFee}
          onChange={(e) =>
            formik.setFieldValue(
              `fees.${index}.foreignFee`,
              Number(e.target.value)
            )
          }
        />
      );
    }
  }
];
