'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { PublicHolidayShiftRecord } from '@/types/roster';

export type PublicHolidayFormSheetMode = 'create' | 'edit' | 'bulk';

type FormSheetState = {
  mode: PublicHolidayFormSheetMode;
  record: PublicHolidayShiftRecord | null;
  selectedCount: number;
  selectedStaffIds: string[];
};

type PublicHolidayShiftsUiContextValue = {
  formSheet: FormSheetState | null;
  historyRecord: PublicHolidayShiftRecord | null;
  selectedCount: number;
  selectedStaffIds: string[];
  setSelectedCount: (count: number) => void;
  setSelectedStaffIds: (staffIds: string[]) => void;
  openCreate: () => void;
  openEdit: (record: PublicHolidayShiftRecord) => void;
  openBulk: (selectedCount: number, selectedStaffIds: string[]) => void;
  openHistory: (record: PublicHolidayShiftRecord) => void;
  closeFormSheet: () => void;
  closeHistorySheet: () => void;
};

const PublicHolidayShiftsUiContext =
  createContext<PublicHolidayShiftsUiContextValue | null>(null);

export function PublicHolidayShiftsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<PublicHolidayShiftRecord | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const openCreate = useCallback(() => {
    setFormSheet({
      mode: 'create',
      record: null,
      selectedCount: 0,
      selectedStaffIds: []
    });
  }, []);

  const openEdit = useCallback((record: PublicHolidayShiftRecord) => {
    setFormSheet({
      mode: 'edit',
      record,
      selectedCount: 0,
      selectedStaffIds: []
    });
  }, []);

  const openBulk = useCallback((count: number, staffIds: string[]) => {
    setFormSheet({
      mode: 'bulk',
      record: null,
      selectedCount: count,
      selectedStaffIds: staffIds
    });
  }, []);

  const openHistory = useCallback((record: PublicHolidayShiftRecord) => {
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
      openCreate,
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
      openCreate,
      openEdit,
      openBulk,
      openHistory,
      closeFormSheet,
      closeHistorySheet
    ]
  );

  return (
    <PublicHolidayShiftsUiContext.Provider value={value}>
      {children}
    </PublicHolidayShiftsUiContext.Provider>
  );
}

export function usePublicHolidayShiftsUi() {
  const ctx = useContext(PublicHolidayShiftsUiContext);
  if (!ctx) {
    throw new Error(
      'usePublicHolidayShiftsUi must be used within PublicHolidayShiftsUiProvider'
    );
  }
  return ctx;
}
