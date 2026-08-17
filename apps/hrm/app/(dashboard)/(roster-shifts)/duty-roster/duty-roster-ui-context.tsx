'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { DutyRosterSample } from './sample-data';

export type DutyRosterFormSheetMode = 'assign' | 'edit' | 'swap' | 'replace';

type FormSheetState = {
  mode: DutyRosterFormSheetMode;
  record: DutyRosterSample | null;
};

type DutyRosterUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: DutyRosterSample | null;
  swapConfirmOpen: boolean;
  openAssign: () => void;
  openEdit: (record: DutyRosterSample) => void;
  openSwap: (record?: DutyRosterSample) => void;
  openReplace: (record?: DutyRosterSample) => void;
  openHistory: (record: DutyRosterSample) => void;
  requestSwapConfirm: () => void;
  closeSwapConfirm: () => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const DutyRosterUiContext = createContext<DutyRosterUiContextValue | null>(
  null
);

export function DutyRosterUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] = useState<DutyRosterSample | null>(
    null
  );
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);

  const openAssign = useCallback(() => {
    setFormSheet({ mode: 'assign', record: null });
  }, []);

  const openEdit = useCallback((record: DutyRosterSample) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openSwap = useCallback((record?: DutyRosterSample) => {
    setFormSheet({ mode: 'swap', record: record ?? null });
  }, []);

  const openReplace = useCallback((record?: DutyRosterSample) => {
    setFormSheet({ mode: 'replace', record: record ?? null });
  }, []);

  const openHistory = useCallback((record: DutyRosterSample) => {
    setHistoryRecord(record);
  }, []);

  const requestSwapConfirm = useCallback(() => setSwapConfirmOpen(true), []);
  const closeSwapConfirm = useCallback(() => setSwapConfirmOpen(false), []);
  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeHistorySheet = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      historyRecord,
      swapConfirmOpen,
      openAssign,
      openEdit,
      openSwap,
      openReplace,
      openHistory,
      requestSwapConfirm,
      closeSwapConfirm,
      closeFormSheet,
      closeHistorySheet
    }),
    [
      formSheet,
      historyRecord,
      swapConfirmOpen,
      openAssign,
      openEdit,
      openSwap,
      openReplace,
      openHistory,
      requestSwapConfirm,
      closeSwapConfirm,
      closeFormSheet,
      closeHistorySheet
    ]
  );

  return (
    <DutyRosterUiContext.Provider value={value}>
      {children}
    </DutyRosterUiContext.Provider>
  );
}

export function useDutyRosterUi() {
  const ctx = useContext(DutyRosterUiContext);
  if (!ctx) {
    throw new Error('useDutyRosterUi must be used within DutyRosterUiProvider');
  }
  return ctx;
}
