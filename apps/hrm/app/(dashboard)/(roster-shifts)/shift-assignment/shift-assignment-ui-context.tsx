'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { ShiftAssignmentRecord } from '@/types/roster';

export type ShiftAssignmentFormSheetMode = 'assign' | 'edit' | 'bulk';

type FormSheetState = {
  mode: ShiftAssignmentFormSheetMode;
  record: ShiftAssignmentRecord | null;
  selectedCount: number;
  selectedStaffIds: string[];
};

type ShiftAssignmentUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: ShiftAssignmentRecord | null;
  selectedCount: number;
  selectedStaffIds: string[];
  setSelectedCount: (count: number) => void;
  setSelectedStaffIds: (staffIds: string[]) => void;
  openAssign: () => void;
  openEdit: (record: ShiftAssignmentRecord) => void;
  openBulk: (selectedCount: number, selectedStaffIds: string[]) => void;
  openHistory: (record: ShiftAssignmentRecord) => void;
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
    useState<ShiftAssignmentRecord | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const openAssign = useCallback(() => {
    setFormSheet({
      mode: 'assign',
      record: null,
      selectedCount: 0,
      selectedStaffIds: []
    });
  }, []);

  const openEdit = useCallback((record: ShiftAssignmentRecord) => {
    setFormSheet({
      mode: 'edit',
      record,
      selectedCount: 0,
      selectedStaffIds: []
    });
  }, []);

  const openBulk = useCallback(
    (count: number, staffIds: string[]) => {
      setFormSheet({
        mode: 'bulk',
        record: null,
        selectedCount: count,
        selectedStaffIds: staffIds
      });
    },
    []
  );

  const openHistory = useCallback((record: ShiftAssignmentRecord) => {
    setHistoryRecord(record);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeHistorySheet = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      historyRecord,
      selectedCount,
      selectedStaffIds,
      setSelectedCount,
      setSelectedStaffIds,
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
      selectedStaffIds,
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
