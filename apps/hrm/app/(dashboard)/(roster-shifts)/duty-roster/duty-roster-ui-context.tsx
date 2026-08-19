'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { DutyRosterRow, SwapDutyPayload } from '@/types/roster';

export type DutyRosterFormSheetMode = 'assign' | 'edit' | 'swap' | 'replace';

type FormSheetState = {
  mode: DutyRosterFormSheetMode;
  record: DutyRosterRow | null;
};

type DutyRosterUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: DutyRosterRow | null;
  swapConfirmOpen: boolean;
  pendingSwap: SwapDutyPayload | null;
  openAssign: () => void;
  openEdit: (record: DutyRosterRow) => void;
  openSwap: (record?: DutyRosterRow) => void;
  openReplace: (record?: DutyRosterRow) => void;
  openHistory: (record: DutyRosterRow) => void;
  requestSwapConfirm: (payload: SwapDutyPayload) => void;
  closeSwapConfirm: () => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const DutyRosterUiContext = createContext<DutyRosterUiContextValue | null>(
  null
);

export function DutyRosterUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] = useState<DutyRosterRow | null>(
    null
  );
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<SwapDutyPayload | null>(null);

  const openAssign = useCallback(() => {
    setFormSheet({ mode: 'assign', record: null });
  }, []);

  const openEdit = useCallback((record: DutyRosterRow) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openSwap = useCallback((record?: DutyRosterRow) => {
    setFormSheet({ mode: 'swap', record: record ?? null });
  }, []);

  const openReplace = useCallback((record?: DutyRosterRow) => {
    setFormSheet({ mode: 'replace', record: record ?? null });
  }, []);

  const openHistory = useCallback((record: DutyRosterRow) => {
    setHistoryRecord(record);
  }, []);

  const requestSwapConfirm = useCallback((payload: SwapDutyPayload) => {
    setPendingSwap(payload);
    setSwapConfirmOpen(true);
  }, []);

  const closeSwapConfirm = useCallback(() => {
    setSwapConfirmOpen(false);
    setPendingSwap(null);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeHistorySheet = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      historyRecord,
      swapConfirmOpen,
      pendingSwap,
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
      pendingSwap,
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
