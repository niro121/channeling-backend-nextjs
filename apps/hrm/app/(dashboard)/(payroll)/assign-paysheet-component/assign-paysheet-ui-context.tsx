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

export type PaysheetFormSheetMode = 'create' | 'edit';

type FormSheetState = {
  mode: PaysheetFormSheetMode;
  record: PaysheetAssignmentRecord | null;
};

type AssignPaysheetUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: PaysheetAssignmentRecord | null;
  viewRecord: PaysheetAssignmentRecord | null;
  openCreate: () => void;
  openEdit: (record: PaysheetAssignmentRecord) => void;
  openHistory: (record: PaysheetAssignmentRecord) => void;
  openView: (record: PaysheetAssignmentRecord) => void;
  closeFormSheet: () => void;
  closeHistory: () => void;
  closeView: () => void;
};

const AssignPaysheetUiContext =
  createContext<AssignPaysheetUiContextValue | null>(null);

export function AssignPaysheetUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<PaysheetAssignmentRecord | null>(null);
  const [viewRecord, setViewRecord] =
    useState<PaysheetAssignmentRecord | null>(null);

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null });
  }, []);

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
      openCreate,
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
      openCreate,
      openEdit,
      openHistory,
      openView,
      closeFormSheet,
      closeHistory,
      closeView
    ]
  );

  return (
    <AssignPaysheetUiContext.Provider value={value}>
      {children}
    </AssignPaysheetUiContext.Provider>
  );
}

export function useAssignPaysheetUi() {
  const ctx = useContext(AssignPaysheetUiContext);
  if (!ctx) {
    throw new Error(
      'useAssignPaysheetUi must be used within AssignPaysheetUiProvider'
    );
  }
  return ctx;
}
