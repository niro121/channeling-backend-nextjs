'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { LoanAdvanceRecord } from '@/types/payroll';

type LoansAdvancesUiContextValue = {
  selectedRecord: LoanAdvanceRecord | null;
  viewRecord: LoanAdvanceRecord | null;
  selectRecord: (record: LoanAdvanceRecord | null) => void;
  openView: (record: LoanAdvanceRecord) => void;
  closeView: () => void;
  clearSelection: () => void;
};

const LoansAdvancesUiContext =
  createContext<LoansAdvancesUiContextValue | null>(null);

export function LoansAdvancesUiProvider({ children }: { children: ReactNode }) {
  const [selectedRecord, setSelectedRecord] =
    useState<LoanAdvanceRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<LoanAdvanceRecord | null>(null);

  const selectRecord = useCallback((record: LoanAdvanceRecord | null) => {
    setSelectedRecord(record);
  }, []);

  const openView = useCallback((record: LoanAdvanceRecord) => {
    setViewRecord(record);
  }, []);

  const closeView = useCallback(() => setViewRecord(null), []);
  const clearSelection = useCallback(() => setSelectedRecord(null), []);

  const value = useMemo(
    () => ({
      selectedRecord,
      viewRecord,
      selectRecord,
      openView,
      closeView,
      clearSelection
    }),
    [
      selectedRecord,
      viewRecord,
      selectRecord,
      openView,
      closeView,
      clearSelection
    ]
  );

  return (
    <LoansAdvancesUiContext.Provider value={value}>
      {children}
    </LoansAdvancesUiContext.Provider>
  );
}

export function useLoansAdvancesUi() {
  const ctx = useContext(LoansAdvancesUiContext);
  if (!ctx) {
    throw new Error(
      'useLoansAdvancesUi must be used within LoansAdvancesUiProvider'
    );
  }
  return ctx;
}
