'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { AttendanceCorrectionRecord } from '@/types/attendance';

export type CorrectionFormSheetMode = 'create' | 'edit';

type FormSheetState = {
  mode: CorrectionFormSheetMode;
  record: AttendanceCorrectionRecord | null;
};

type ConfirmKind = 'approve' | 'reject' | null;

type AttendanceCorrectionsUiContextValue = {
  formSheet: FormSheetState | null;
  selectedRecords: AttendanceCorrectionRecord[];
  confirmKind: ConfirmKind;
  setSelectedRecords: (records: AttendanceCorrectionRecord[]) => void;
  openCreate: () => void;
  openEdit: (record: AttendanceCorrectionRecord) => void;
  requestApproveConfirm: () => void;
  requestRejectConfirm: () => void;
  closeConfirm: () => void;
  closeFormSheet: () => void;
};

const AttendanceCorrectionsUiContext =
  createContext<AttendanceCorrectionsUiContextValue | null>(null);

export function AttendanceCorrectionsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<
    AttendanceCorrectionRecord[]
  >([]);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: AttendanceCorrectionRecord) => {
    setFormSheet({ mode: 'edit', record });
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

  const value = useMemo(
    () => ({
      formSheet,
      selectedRecords,
      confirmKind,
      setSelectedRecords,
      openCreate,
      openEdit,
      requestApproveConfirm,
      requestRejectConfirm,
      closeConfirm,
      closeFormSheet
    }),
    [
      formSheet,
      selectedRecords,
      confirmKind,
      openCreate,
      openEdit,
      requestApproveConfirm,
      requestRejectConfirm,
      closeConfirm,
      closeFormSheet
    ]
  );

  return (
    <AttendanceCorrectionsUiContext.Provider value={value}>
      {children}
    </AttendanceCorrectionsUiContext.Provider>
  );
}

export function useAttendanceCorrectionsUi() {
  const ctx = useContext(AttendanceCorrectionsUiContext);
  if (!ctx) {
    throw new Error(
      'useAttendanceCorrectionsUi must be used within AttendanceCorrectionsUiProvider'
    );
  }
  return ctx;
}
