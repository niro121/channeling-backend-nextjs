'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { RosterStaffRow, ShiftCell } from '@/types/roster';

export type RosterAllocationSheetMode = 'add' | 'edit';

export type RosterAllocationFormTarget = {
  mode: RosterAllocationSheetMode;
  row: RosterStaffRow | null;
  dateIso: string | null;
  shift: ShiftCell | null;
};

type ShiftRosterUiContextValue = {
  formTarget: RosterAllocationFormTarget | null;
  historyRow: RosterStaffRow | null;
  viewRow: RosterStaffRow | null;
  openAdd: (prefill?: {
    row?: RosterStaffRow;
    dateIso?: string;
  }) => void;
  openEdit: (args: {
    row: RosterStaffRow;
    dateIso: string;
    shift: ShiftCell;
  }) => void;
  openHistory: (row: RosterStaffRow) => void;
  openView: (row: RosterStaffRow) => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
  closeViewSheet: () => void;
};

const ShiftRosterUiContext = createContext<ShiftRosterUiContextValue | null>(
  null
);

export function ShiftRosterUiProvider({ children }: { children: ReactNode }) {
  const [formTarget, setFormTarget] =
    useState<RosterAllocationFormTarget | null>(null);
  const [historyRow, setHistoryRow] = useState<RosterStaffRow | null>(null);
  const [viewRow, setViewRow] = useState<RosterStaffRow | null>(null);

  const openAdd = useCallback(
    (prefill?: { row?: RosterStaffRow; dateIso?: string }) => {
      setFormTarget({
        mode: 'add',
        row: prefill?.row ?? null,
        dateIso: prefill?.dateIso ?? null,
        shift: null
      });
    },
    []
  );

  const openEdit = useCallback(
    (args: { row: RosterStaffRow; dateIso: string; shift: ShiftCell }) => {
      setFormTarget({
        mode: 'edit',
        row: args.row,
        dateIso: args.dateIso,
        shift: args.shift
      });
    },
    []
  );

  const openHistory = useCallback((row: RosterStaffRow) => {
    setHistoryRow(row);
  }, []);

  const openView = useCallback((row: RosterStaffRow) => {
    setViewRow(row);
  }, []);

  const closeFormSheet = useCallback(() => setFormTarget(null), []);
  const closeHistorySheet = useCallback(() => setHistoryRow(null), []);
  const closeViewSheet = useCallback(() => setViewRow(null), []);

  const value = useMemo(
    () => ({
      formTarget,
      historyRow,
      viewRow,
      openAdd,
      openEdit,
      openHistory,
      openView,
      closeFormSheet,
      closeHistorySheet,
      closeViewSheet
    }),
    [
      formTarget,
      historyRow,
      viewRow,
      openAdd,
      openEdit,
      openHistory,
      openView,
      closeFormSheet,
      closeHistorySheet,
      closeViewSheet
    ]
  );

  return (
    <ShiftRosterUiContext.Provider value={value}>
      {children}
    </ShiftRosterUiContext.Provider>
  );
}

export function useShiftRosterUi() {
  const ctx = useContext(ShiftRosterUiContext);
  if (!ctx) {
    throw new Error(
      'useShiftRosterUi must be used within ShiftRosterUiProvider'
    );
  }
  return ctx;
}
