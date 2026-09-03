'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { RosterAmendmentRecord } from '@/types/roster';

export type AmendmentFormSheetMode = 'create' | 'edit';

type FormSheetState = {
  mode: AmendmentFormSheetMode;
  record: RosterAmendmentRecord | null;
};

type ConfirmKind = 'approve' | 'reject' | null;

type RosterAmendmentsUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: RosterAmendmentRecord | null;
  selectedRecords: RosterAmendmentRecord[];
  confirmKind: ConfirmKind;
  setSelectedRecords: (records: RosterAmendmentRecord[]) => void;
  openCreate: () => void;
  openEdit: (record: RosterAmendmentRecord) => void;
  openHistory: (record: RosterAmendmentRecord) => void;
  requestApproveConfirm: () => void;
  requestRejectConfirm: () => void;
  closeConfirm: () => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const RosterAmendmentsUiContext =
  createContext<RosterAmendmentsUiContextValue | null>(null);

export function RosterAmendmentsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<RosterAmendmentRecord | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<
    RosterAmendmentRecord[]
  >([]);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: RosterAmendmentRecord) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openHistory = useCallback((record: RosterAmendmentRecord) => {
    setHistoryRecord(record);
  }, []);

  const requestApproveConfirm = useCallback(
    () => setConfirmKind('approve'),
    []
  );
  const requestRejectConfirm = useCallback(
    () => setConfirmKind('reject'),
    []
  );
  const closeConfirm = useCallback(() => setConfirmKind(null), []);
  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeHistorySheet = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      historyRecord,
      selectedRecords,
      confirmKind,
      setSelectedRecords,
      openCreate,
      openEdit,
      openHistory,
      requestApproveConfirm,
      requestRejectConfirm,
      closeConfirm,
      closeFormSheet,
      closeHistorySheet
    }),
    [
      formSheet,
      historyRecord,
      selectedRecords,
      confirmKind,
      openCreate,
      openEdit,
      openHistory,
      requestApproveConfirm,
      requestRejectConfirm,
      closeConfirm,
      closeFormSheet,
      closeHistorySheet
    ]
  );

  return (
    <RosterAmendmentsUiContext.Provider value={value}>
      {children}
    </RosterAmendmentsUiContext.Provider>
  );
}

export function useRosterAmendmentsUi() {
  const ctx = useContext(RosterAmendmentsUiContext);
  if (!ctx) {
    throw new Error(
      'useRosterAmendmentsUi must be used within RosterAmendmentsUiProvider'
    );
  }
  return ctx;
}
