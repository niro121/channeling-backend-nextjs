'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { ShiftTypeRecord } from '@/types/roster';

export type ShiftTypeFormSheetMode = 'add' | 'edit' | 'duplicate';

type FormSheetState = {
  mode: ShiftTypeFormSheetMode;
  record: ShiftTypeRecord | null;
};

type ShiftTypesUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: ShiftTypeRecord | null;
  openAdd: () => void;
  openEdit: (record: ShiftTypeRecord) => void;
  openDuplicate: (record: ShiftTypeRecord) => void;
  openHistory: (record: ShiftTypeRecord) => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const ShiftTypesUiContext = createContext<ShiftTypesUiContextValue | null>(
  null
);

export function ShiftTypesUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] = useState<ShiftTypeRecord | null>(
    null
  );

  const openAdd = useCallback(() => {
    setFormSheet({ mode: 'add', record: null });
  }, []);

  const openEdit = useCallback((record: ShiftTypeRecord) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openDuplicate = useCallback((record: ShiftTypeRecord) => {
    setFormSheet({ mode: 'duplicate', record });
  }, []);

  const openHistory = useCallback((record: ShiftTypeRecord) => {
    setHistoryRecord(record);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeHistorySheet = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      historyRecord,
      openAdd,
      openEdit,
      openDuplicate,
      openHistory,
      closeFormSheet,
      closeHistorySheet
    }),
    [
      formSheet,
      historyRecord,
      openAdd,
      openEdit,
      openDuplicate,
      openHistory,
      closeFormSheet,
      closeHistorySheet
    ]
  );

  return (
    <ShiftTypesUiContext.Provider value={value}>
      {children}
    </ShiftTypesUiContext.Provider>
  );
}

export function useShiftTypesUi() {
  const ctx = useContext(ShiftTypesUiContext);
  if (!ctx) {
    throw new Error('useShiftTypesUi must be used within ShiftTypesUiProvider');
  }
  return ctx;
}
