'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { AttendanceSummaryRow } from '@/types/attendance';

type AttendanceSummaryUiContextValue = {
  detailRecord: AttendanceSummaryRow | null;
  openDetail: (record: AttendanceSummaryRow) => void;
  closeDetail: () => void;
};

const AttendanceSummaryUiContext =
  createContext<AttendanceSummaryUiContextValue | null>(null);

export function AttendanceSummaryUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [detailRecord, setDetailRecord] =
    useState<AttendanceSummaryRow | null>(null);

  const openDetail = useCallback((record: AttendanceSummaryRow) => {
    setDetailRecord(record);
  }, []);

  const closeDetail = useCallback(() => setDetailRecord(null), []);

  const value = useMemo(
    () => ({ detailRecord, openDetail, closeDetail }),
    [detailRecord, openDetail, closeDetail]
  );

  return (
    <AttendanceSummaryUiContext.Provider value={value}>
      {children}
    </AttendanceSummaryUiContext.Provider>
  );
}

export function useAttendanceSummaryUi() {
  const ctx = useContext(AttendanceSummaryUiContext);
  if (!ctx) {
    throw new Error(
      'useAttendanceSummaryUi must be used within AttendanceSummaryUiProvider'
    );
  }
  return ctx;
}
