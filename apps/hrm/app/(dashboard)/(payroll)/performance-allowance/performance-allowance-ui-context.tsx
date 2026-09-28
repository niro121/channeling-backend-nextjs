'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { PerformanceAllowanceRecord } from '@/types/payroll';

type PerformanceAllowanceUiContextValue = {
  editingRecord: PerformanceAllowanceRecord | null;
  viewRecord: PerformanceAllowanceRecord | null;
  openEdit: (record: PerformanceAllowanceRecord) => void;
  openView: (record: PerformanceAllowanceRecord) => void;
  clearEdit: () => void;
  closeView: () => void;
};

const PerformanceAllowanceUiContext =
  createContext<PerformanceAllowanceUiContextValue | null>(null);

export function PerformanceAllowanceUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [editingRecord, setEditingRecord] =
    useState<PerformanceAllowanceRecord | null>(null);
  const [viewRecord, setViewRecord] =
    useState<PerformanceAllowanceRecord | null>(null);

  const openEdit = useCallback((record: PerformanceAllowanceRecord) => {
    setEditingRecord(record);
  }, []);

  const openView = useCallback((record: PerformanceAllowanceRecord) => {
    setViewRecord(record);
  }, []);

  const clearEdit = useCallback(() => setEditingRecord(null), []);
  const closeView = useCallback(() => setViewRecord(null), []);

  const value = useMemo(
    () => ({
      editingRecord,
      viewRecord,
      openEdit,
      openView,
      clearEdit,
      closeView
    }),
    [editingRecord, viewRecord, openEdit, openView, clearEdit, closeView]
  );

  return (
    <PerformanceAllowanceUiContext.Provider value={value}>
      {children}
    </PerformanceAllowanceUiContext.Provider>
  );
}

export function usePerformanceAllowanceUi() {
  const ctx = useContext(PerformanceAllowanceUiContext);
  if (!ctx) {
    throw new Error(
      'usePerformanceAllowanceUi must be used within PerformanceAllowanceUiProvider'
    );
  }
  return ctx;
}
