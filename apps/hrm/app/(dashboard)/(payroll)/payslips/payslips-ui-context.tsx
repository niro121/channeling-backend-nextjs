'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { PayslipRecord } from '@/types/payroll';

type PayslipsUiContextValue = {
  viewRecord: PayslipRecord | null;
  openView: (record: PayslipRecord) => void;
  closeView: () => void;
};

const PayslipsUiContext = createContext<PayslipsUiContextValue | null>(null);

export function PayslipsUiProvider({ children }: { children: ReactNode }) {
  const [viewRecord, setViewRecord] = useState<PayslipRecord | null>(null);

  const openView = useCallback((record: PayslipRecord) => {
    setViewRecord(record);
  }, []);

  const closeView = useCallback(() => setViewRecord(null), []);

  const value = useMemo(
    () => ({
      viewRecord,
      openView,
      closeView
    }),
    [viewRecord, openView, closeView]
  );

  return (
    <PayslipsUiContext.Provider value={value}>
      {children}
    </PayslipsUiContext.Provider>
  );
}

export function usePayslipsUi() {
  const ctx = useContext(PayslipsUiContext);
  if (!ctx) {
    throw new Error('usePayslipsUi must be used within PayslipsUiProvider');
  }
  return ctx;
}
