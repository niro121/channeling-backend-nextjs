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

  const localError = formik.errors.amountLocal as string | undefined;
  const foreignError = formik.errors.amountForeign as string | undefined;
  const showError = (formik.touched.amountLocal || formik.touched.amountForeign || formik.submitCount > 0) && (localError || foreignError);

  return (
    <div className="border-t bg-muted/30 px-4 py-2.5">
      {showError && (
        <div className="flex flex-col gap-1 mb-2 text-sm text-destructive">
          {localError && <span>{localError}</span>}
          {foreignError && <span>{foreignError}</span>}
        </div>
      )}
      <div className="flex justify-end gap-8 text-sm font-semibold tabular-nums">
        <span>Total Local: {totals.local.toFixed(2)}</span>
        <span>Total Foreign: {totals.foreign.toFixed(2)}</span>
      </div>
    </div>
  );
};
