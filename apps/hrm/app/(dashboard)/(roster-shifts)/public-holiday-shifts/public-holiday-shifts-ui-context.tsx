'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { PublicHolidayShiftSample } from './sample-data';

export type PublicHolidayFormSheetMode = 'create' | 'edit' | 'bulk';

type FormSheetState = {
  mode: PublicHolidayFormSheetMode;
  record: PublicHolidayShiftSample | null;
  selectedCount: number;
};

type PublicHolidayShiftsUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: PublicHolidayShiftSample | null;
  selectedCount: number;
  setSelectedCount: (count: number) => void;
  openCreate: () => void;
  openEdit: (record: PublicHolidayShiftSample) => void;
  openBulk: (selectedCount: number) => void;
  openHistory: (record: PublicHolidayShiftSample) => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const PublicHolidayShiftsUiContext =
  createContext<PublicHolidayShiftsUiContextValue | null>(null);

export function PublicHolidayShiftsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<PublicHolidayShiftSample | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null, selectedCount: 0 });
  }, []);

  const openEdit = useCallback((record: PublicHolidayShiftSample) => {
    setFormSheet({ mode: 'edit', record, selectedCount: 0 });
  }, []);

  const openBulk = useCallback((count: number) => {
    setFormSheet({ mode: 'bulk', record: null, selectedCount: count });
  }, []);

  const openHistory = useCallback((record: PublicHolidayShiftSample) => {
    setHistoryRecord(record);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeHistorySheet = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      historyRecord,
      selectedCount,
      setSelectedCount,
      openCreate,
      openEdit,
      openBulk,
      openHistory,
      closeFormSheet,
      closeHistorySheet
    }),
    [
      formSheet,
      historyRecord,
      selectedCount,
      openCreate,
      openEdit,
      openBulk,
      openHistory,
      closeFormSheet,
      closeHistorySheet
    ]
  );

  return (
    <PublicHolidayShiftsUiContext.Provider value={value}>
      {children}
    </PublicHolidayShiftsUiContext.Provider>
  );
}

export function usePublicHolidayShiftsUi() {
  const ctx = useContext(PublicHolidayShiftsUiContext);
  if (!ctx) {
    throw new Error(
      'usePublicHolidayShiftsUi must be used within PublicHolidayShiftsUiProvider'
    );
  }
  return ctx;
}
