'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { OvernightShiftSample } from './sample-data';

export type OvernightFormSheetMode = 'create' | 'edit';

type FormSheetState = {
  mode: OvernightFormSheetMode;
  record: OvernightShiftSample | null;
};

type OvernightShiftsUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: OvernightShiftSample | null;
  openCreate: () => void;
  openEdit: (record: OvernightShiftSample) => void;
  openHistory: (record: OvernightShiftSample) => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const OvernightShiftsUiContext =
  createContext<OvernightShiftsUiContextValue | null>(null);

export function OvernightShiftsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<OvernightShiftSample | null>(null);

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: OvernightShiftSample) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openHistory = useCallback((record: OvernightShiftSample) => {
    setHistoryRecord(record);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeHistorySheet = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      historyRecord,
      openCreate,
      openEdit,
      openHistory,
      closeFormSheet,
      closeHistorySheet
    }),
    [
      formSheet,
      historyRecord,
      openCreate,
      openEdit,
      openHistory,
      closeFormSheet,
      closeHistorySheet
    ]
  );

  return (
    <OvernightShiftsUiContext.Provider value={value}>
      {children}
    </OvernightShiftsUiContext.Provider>
  );
}

export function useOvernightShiftsUi() {
  const ctx = useContext(OvernightShiftsUiContext);
  if (!ctx) {
    throw new Error(
      'useOvernightShiftsUi must be used within OvernightShiftsUiProvider'
    );
  }
  return ctx;
}
