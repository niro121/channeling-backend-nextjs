import { ColumnDef } from '@tanstack/react-table';
import { Fee } from '@/types/doctor.session';
import React from 'react';
import { NumericInputCell } from './numeric-input-field';

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
        <NumericInputCell
          value={formik.values.fees[index].localFee}
          onChange={(val) =>
            formik.setFieldValue(`fees.${index}.localFee`, val)
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
        <NumericInputCell
          value={formik.values.fees[index].foreignFee}
          onChange={(val) =>
            formik.setFieldValue(`fees.${index}.foreignFee`, val)
          }
        />
      );
    }
  }
];
