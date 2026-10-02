'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { AttendanceLogRecord } from '@/types/attendance';

type AttendanceLogsUiContextValue = {
  detailRecord: AttendanceLogRecord | null;
  historyRecord: AttendanceLogRecord | null;
  openDetail: (record: AttendanceLogRecord) => void;
  openHistory: (record: AttendanceLogRecord) => void;
  closeDetail: () => void;
  closeHistory: () => void;
};

const AttendanceLogsUiContext =
  createContext<AttendanceLogsUiContextValue | null>(null);

export function AttendanceLogsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [detailRecord, setDetailRecord] =
    useState<AttendanceLogRecord | null>(null);
  const [historyRecord, setHistoryRecord] =
    useState<AttendanceLogRecord | null>(null);

  const openDetail = useCallback((record: AttendanceLogRecord) => {
    setHistoryRecord(null);
    setDetailRecord(record);
  }, []);

  const openHistory = useCallback((record: AttendanceLogRecord) => {
    setDetailRecord(null);
    setHistoryRecord(record);
  }, []);

  const closeDetail = useCallback(() => setDetailRecord(null), []);
  const closeHistory = useCallback(() => setHistoryRecord(null), []);

  const value = useMemo(
    () => ({
      detailRecord,
      historyRecord,
      openDetail,
      openHistory,
      closeDetail,
      closeHistory
    }),
    [
      detailRecord,
      historyRecord,
      openDetail,
      openHistory,
      closeDetail,
      closeHistory
    ]
  );

  return (
    <AttendanceLogsUiContext.Provider value={value}>
      {children}
    </AttendanceLogsUiContext.Provider>
  );
}

export function useAttendanceLogsUi() {
  const ctx = useContext(AttendanceLogsUiContext);
  if (!ctx) {
    throw new Error(
      'useAttendanceLogsUi must be used within AttendanceLogsUiProvider'
    );
  }
  return ctx;
}
