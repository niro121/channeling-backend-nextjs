'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { RosterAmendmentSample } from './sample-data';

export type AmendmentFormSheetMode = 'create' | 'edit';

type FormSheetState = {
  mode: AmendmentFormSheetMode;
  record: RosterAmendmentSample | null;
};

type ConfirmKind = 'approve' | 'reject' | null;

type RosterAmendmentsUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: RosterAmendmentSample | null;
  selectedRecords: RosterAmendmentSample[];
  confirmKind: ConfirmKind;
  setSelectedRecords: (records: RosterAmendmentSample[]) => void;
  openCreate: () => void;
  openEdit: (record: RosterAmendmentSample) => void;
  openHistory: (record: RosterAmendmentSample) => void;
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
    useState<RosterAmendmentSample | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<
    RosterAmendmentSample[]
  >([]);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: RosterAmendmentSample) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openHistory = useCallback((record: RosterAmendmentSample) => {
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
