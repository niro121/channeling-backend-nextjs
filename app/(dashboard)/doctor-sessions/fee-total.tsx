'use client';

import React from 'react';

export const FeeTotals = ({ formik }: { formik: any }) => {
  const totals = React.useMemo(() => {
    return formik.values.fees.reduce(
      (acc: any, fee: any) => {
        acc.local += Number(fee.localFee || 0);
        acc.foreign += Number(fee.foreignFee || 0);
        return acc;
      },
      { local: 0, foreign: 0 }
    );
  }, [formik.values.fees]);


  React.useEffect(() => {
    if (formik.values.amountLocal !== totals.local) {
      formik.setFieldValue('amountLocal', totals.local, false);
    }

    if (formik.values.amountForeign !== totals.foreign) {
      formik.setFieldValue('amountForeign', totals.foreign, false);
    }
  }, [totals.local, totals.foreign]);

  return (
    <div className="mt-4 border-t pt-3 flex justify-end gap-10 font-semibold">
      <div>Total Local Fee: {totals.local.toFixed(2)}</div>
      <div>Total Foreign Fee: {totals.foreign.toFixed(2)}</div>
    </div>
  );
};
