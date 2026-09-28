'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { PaysheetAssignmentRecord } from '@/types/payroll';

export type BulkPaysheetFormSheetMode = 'edit';

type FormSheetState = {
  mode: BulkPaysheetFormSheetMode;
  record: PaysheetAssignmentRecord | null;
};

type BulkAssignUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: PaysheetAssignmentRecord | null;
  viewRecord: PaysheetAssignmentRecord | null;
  selectedStaffIds: string[];
  selectionClearToken: number;
  overlapDialogOpen: boolean;
  setSelection: (ids: string[]) => void;
  requestClearSelection: () => void;
  openOverlapDialog: () => void;
  closeOverlapDialog: () => void;
  openEdit: (record: PaysheetAssignmentRecord) => void;
  openHistory: (record: PaysheetAssignmentRecord) => void;
  openView: (record: PaysheetAssignmentRecord) => void;
  closeFormSheet: () => void;
  closeHistory: () => void;
  closeView: () => void;
};

const BulkAssignUiContext = createContext<BulkAssignUiContextValue | null>(
  null
);

export function BulkAssignUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<PaysheetAssignmentRecord | null>(null);
  const [viewRecord, setViewRecord] =
    useState<PaysheetAssignmentRecord | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectionClearToken, setSelectionClearToken] = useState(0);
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false);

  const setSelection = useCallback((ids: string[]) => {
    setSelectedStaffIds(ids);
  }, []);

  const requestClearSelection = useCallback(() => {
    setSelectedStaffIds([]);
    setSelectionClearToken((token) => token + 1);
  }, []);

  const openOverlapDialog = useCallback(() => setOverlapDialogOpen(true), []);
  const closeOverlapDialog = useCallback(() => setOverlapDialogOpen(false), []);

  const openEdit = useCallback((record: PaysheetAssignmentRecord) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openHistory = useCallback((record: PaysheetAssignmentRecord) => {
    setHistoryRecord(record);
  }, []);

  const openView = useCallback((record: PaysheetAssignmentRecord) => {
    setViewRecord(record);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeHistory = useCallback(() => setHistoryRecord(null), []);
  const closeView = useCallback(() => setViewRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      historyRecord,
      viewRecord,
      selectedStaffIds,
      selectionClearToken,
      overlapDialogOpen,
      setSelection,
      requestClearSelection,
      openOverlapDialog,
      closeOverlapDialog,
      openEdit,
      openHistory,
      openView,
      closeFormSheet,
      closeHistory,
      closeView
    }),
    [
      formSheet,
      historyRecord,
      viewRecord,
      selectedStaffIds,
      selectionClearToken,
      overlapDialogOpen,
      setSelection,
      requestClearSelection,
      openOverlapDialog,
      closeOverlapDialog,
      openEdit,
      openHistory,
      openView,
      closeFormSheet,
      closeHistory,
      closeView
    ]
  );

  return (
    <BulkAssignUiContext.Provider value={value}>
      {children}
    </BulkAssignUiContext.Provider>
  );
}

export function useBulkAssignUi() {
  const ctx = useContext(BulkAssignUiContext);
  if (!ctx) {
    throw new Error('useBulkAssignUi must be used within BulkAssignUiProvider');
  }
  return ctx;
}
