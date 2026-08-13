'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { RosterStaffRowSample, ShiftCellSample } from './sample-data';

export type RosterAllocationSheetMode = 'add' | 'edit';

export type RosterAllocationFormTarget = {
  mode: RosterAllocationSheetMode;
  row: RosterStaffRowSample | null;
  dateIso: string | null;
  shift: ShiftCellSample | null;
};

type ShiftRosterUiContextValue = {
  formTarget: RosterAllocationFormTarget | null;
  historyRow: RosterStaffRowSample | null;
  openAdd: (prefill?: {
    row?: RosterStaffRowSample;
    dateIso?: string;
  }) => void;
  openEdit: (args: {
    row: RosterStaffRowSample;
    dateIso: string;
    shift: ShiftCellSample;
  }) => void;
  openHistory: (row: RosterStaffRowSample) => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const ShiftRosterUiContext = createContext<ShiftRosterUiContextValue | null>(
  null
);

export function ShiftRosterUiProvider({ children }: { children: ReactNode }) {
  const [formTarget, setFormTarget] =
    useState<RosterAllocationFormTarget | null>(null);
  const [historyRow, setHistoryRow] = useState<RosterStaffRowSample | null>(
    null
  );

  const openAdd = useCallback(
    (prefill?: { row?: RosterStaffRowSample; dateIso?: string }) => {
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
    (args: {
      row: RosterStaffRowSample;
      dateIso: string;
      shift: ShiftCellSample;
    }) => {
      setFormTarget({
        mode: 'edit',
        row: args.row,
        dateIso: args.dateIso,
        shift: args.shift
      });
    },
    []
  );

  const openHistory = useCallback((row: RosterStaffRowSample) => {
    setHistoryRow(row);
  }, []);

  const closeFormSheet = useCallback(() => setFormTarget(null), []);
  const closeHistorySheet = useCallback(() => setHistoryRow(null), []);

  const value = useMemo(
    () => ({
      formTarget,
      historyRow,
      openAdd,
      openEdit,
      openHistory,
      closeFormSheet,
      closeHistorySheet
    }),
    [
      formTarget,
      historyRow,
      openAdd,
      openEdit,
      openHistory,
      closeFormSheet,
      closeHistorySheet
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
