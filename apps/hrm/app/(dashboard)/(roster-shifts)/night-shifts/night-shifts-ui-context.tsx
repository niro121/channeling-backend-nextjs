'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { NightShiftSample } from './sample-data';

export type NightShiftFormSheetMode = 'create' | 'edit';

type FormSheetState = {
  mode: NightShiftFormSheetMode;
  record: NightShiftSample | null;
};

type NightShiftsUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: NightShiftSample | null;
  openCreate: () => void;
  openEdit: (record: NightShiftSample) => void;
  openHistory: (record: NightShiftSample) => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const NightShiftsUiContext = createContext<NightShiftsUiContextValue | null>(
  null
);

export function NightShiftsUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] = useState<NightShiftSample | null>(
    null
  );

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: NightShiftSample) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openHistory = useCallback((record: NightShiftSample) => {
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
    <NightShiftsUiContext.Provider value={value}>
      {children}
    </NightShiftsUiContext.Provider>
  );
}

export function useNightShiftsUi() {
  const ctx = useContext(NightShiftsUiContext);
  if (!ctx) {
    throw new Error('useNightShiftsUi must be used within NightShiftsUiProvider');
  }
  return ctx;
}
