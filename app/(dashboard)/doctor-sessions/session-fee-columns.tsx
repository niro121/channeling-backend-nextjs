import { ColumnDef } from '@tanstack/react-table';
import { Fee } from '@/types/doctor.session';
import React from 'react';
import { NumericInputCell } from './numeric-input-field';

export const DoctorSessionFeeColumns = (formik: any): ColumnDef<Fee>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="text-foreground font-medium whitespace-normal break-words">
        {row.original.name}
      </span>
    )
  },
  {
    accessorKey: 'feeType',
    header: 'Fee Type',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm truncate block max-w-[120px]" title={row.original.feeType}>
        {row.original.feeType}
      </span>
    )
  },
  {
    accessorKey: 'localFee',
    header: () => <div className="text-right w-full">Local Fee</div>,
    cell: ({ row }) => {
      const index = row.index;
      return (
        <div className="flex justify-end">
          <NumericInputCell
            value={formik.values.fees[index].localFee}
            onChange={(val) =>
              formik.setFieldValue(`fees.${index}.localFee`, val)
            }
          />
        </div>
      );
    }
  },
  {
    accessorKey: 'foreignFee',
    header: () => <div className="text-right w-full">Foreign Fee</div>,
    cell: ({ row }) => {
      const index = row.index;
      return (
        <div className="flex justify-end">
          <NumericInputCell
            value={formik.values.fees[index].foreignFee}
            onChange={(val) =>
              formik.setFieldValue(`fees.${index}.foreignFee`, val)
            }
          />
        </div>
      );
    }
  }
];

