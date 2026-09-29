'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { SalaryHistoryRecord } from '@/types/payroll';

type SalaryHistoryUiContextValue = {
  detailsRecord: SalaryHistoryRecord | null;
  payslipRecord: SalaryHistoryRecord | null;
  componentsRecord: SalaryHistoryRecord | null;
  historyRecord: SalaryHistoryRecord | null;
  openDetails: (record: SalaryHistoryRecord) => void;
  openPayslip: (record: SalaryHistoryRecord) => void;
  openComponents: (record: SalaryHistoryRecord) => void;
  openHistory: (record: SalaryHistoryRecord) => void;
  closeDetails: () => void;
  closePayslip: () => void;
  closeComponents: () => void;
  closeHistory: () => void;
};

const SalaryHistoryUiContext =
  createContext<SalaryHistoryUiContextValue | null>(null);

export function SalaryHistoryUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [detailsRecord, setDetailsRecord] =
    useState<SalaryHistoryRecord | null>(null);
  const [payslipRecord, setPayslipRecord] =
    useState<SalaryHistoryRecord | null>(null);
  const [componentsRecord, setComponentsRecord] =
    useState<SalaryHistoryRecord | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<SalaryHistoryRecord | null>(null);

  const openDetails = useCallback((record: SalaryHistoryRecord) => {
    setDetailsRecord(record);
  }, []);

  const openPayslip = useCallback((record: SalaryHistoryRecord) => {
    setPayslipRecord(record);
  }, []);

  const openComponents = useCallback((record: SalaryHistoryRecord) => {
    setComponentsRecord(record);
  }, []);

  const openHistory = useCallback((record: SalaryHistoryRecord) => {
    setHistoryRecord(record);
  }, []);

  const closeDetails = useCallback(() => setDetailsRecord(null), []);
  const closePayslip = useCallback(() => setPayslipRecord(null), []);
  const closeComponents = useCallback(() => setComponentsRecord(null), []);
  const closeHistory = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      detailsRecord,
      payslipRecord,
      componentsRecord,
      historyRecord,
      openDetails,
      openPayslip,
      openComponents,
      openHistory,
      closeDetails,
      closePayslip,
      closeComponents,
      closeHistory
    }),
    [
      detailsRecord,
      payslipRecord,
      componentsRecord,
      historyRecord,
      openDetails,
      openPayslip,
      openComponents,
      openHistory,
      closeDetails,
      closePayslip,
      closeComponents,
      closeHistory
    ]
  );

  return (
    <SalaryHistoryUiContext.Provider value={value}>
      {children}
    </SalaryHistoryUiContext.Provider>
  );
}

export function useSalaryHistoryUi() {
  const ctx = useContext(SalaryHistoryUiContext);
  if (!ctx) {
    throw new Error(
      'useSalaryHistoryUi must be used within SalaryHistoryUiProvider'
    );
  }
  return ctx;
}
