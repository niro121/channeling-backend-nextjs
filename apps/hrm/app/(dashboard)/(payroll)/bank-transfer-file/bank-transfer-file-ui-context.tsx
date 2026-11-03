'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { BankTransferBatchRecord } from '@/types/payroll';

type BankTransferFileUiContextValue = {
  viewRecord: BankTransferBatchRecord | null;
  historyRecord: BankTransferBatchRecord | null;
  openView: (record: BankTransferBatchRecord) => void;
  openHistory: (record: BankTransferBatchRecord) => void;
  closeView: () => void;
  closeHistory: () => void;
};

const BankTransferFileUiContext =
  createContext<BankTransferFileUiContextValue | null>(null);

export function BankTransferFileUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [viewRecord, setViewRecord] =
    useState<BankTransferBatchRecord | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<BankTransferBatchRecord | null>(null);

  const openView = useCallback((record: BankTransferBatchRecord) => {
    setViewRecord(record);
  }, []);

  const openHistory = useCallback((record: BankTransferBatchRecord) => {
    setHistoryRecord(record);
  }, []);

  const closeView = useCallback(() => setViewRecord(null), []);
  const closeHistory = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      viewRecord,
      historyRecord,
      openView,
      openHistory,
      closeView,
      closeHistory
    }),
    [
      viewRecord,
      historyRecord,
      openView,
      openHistory,
      closeView,
      closeHistory
    ]
  );

  return (
    <BankTransferFileUiContext.Provider value={value}>
      {children}
    </BankTransferFileUiContext.Provider>
  );
}

export function useBankTransferFileUi() {
  const ctx = useContext(BankTransferFileUiContext);
  if (!ctx) {
    throw new Error(
      'useBankTransferFileUi must be used within BankTransferFileUiProvider'
    );
  }
  return ctx;
}
