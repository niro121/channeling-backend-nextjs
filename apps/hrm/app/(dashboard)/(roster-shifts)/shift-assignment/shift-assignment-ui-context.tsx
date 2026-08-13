'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { ShiftAssignmentSample } from './sample-data';

export type ShiftAssignmentFormSheetMode = 'assign' | 'edit' | 'bulk';

type FormSheetState = {
  mode: ShiftAssignmentFormSheetMode;
  record: ShiftAssignmentSample | null;
  selectedCount: number;
};

type ShiftAssignmentUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: ShiftAssignmentSample | null;
  selectedCount: number;
  setSelectedCount: (count: number) => void;
  openAssign: () => void;
  openEdit: (record: ShiftAssignmentSample) => void;
  openBulk: (selectedCount: number) => void;
  openHistory: (record: ShiftAssignmentSample) => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const ShiftAssignmentUiContext =
  createContext<ShiftAssignmentUiContextValue | null>(null);

export function ShiftAssignmentUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<ShiftAssignmentSample | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  const openAssign = useCallback(() => {
    setFormSheet({ mode: 'assign', record: null, selectedCount: 0 });
  }, []);

  const openEdit = useCallback((record: ShiftAssignmentSample) => {
    setFormSheet({ mode: 'edit', record, selectedCount: 0 });
  }, []);

  const openBulk = useCallback((count: number) => {
    setFormSheet({ mode: 'bulk', record: null, selectedCount: count });
  }, []);

  const openHistory = useCallback((record: ShiftAssignmentSample) => {
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
      openAssign,
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
      openAssign,
      openEdit,
      openBulk,
      openHistory,
      closeFormSheet,
      closeHistorySheet
    ]
  );

  return (
    <ShiftAssignmentUiContext.Provider value={value}>
      {children}
    </ShiftAssignmentUiContext.Provider>
  );
}

export function useShiftAssignmentUi() {
  const ctx = useContext(ShiftAssignmentUiContext);
  if (!ctx) {
    throw new Error(
      'useShiftAssignmentUi must be used within ShiftAssignmentUiProvider'
    );
  }
  return ctx;
}
