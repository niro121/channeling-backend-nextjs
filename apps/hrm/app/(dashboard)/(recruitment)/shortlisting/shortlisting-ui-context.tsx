'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { ShortlistingRecord } from '@/types/recruitment';

type ShortlistingUiContextValue = {
  viewRecord: ShortlistingRecord | null;
  resumeRecord: ShortlistingRecord | null;
  historyRecord: ShortlistingRecord | null;
  scheduleRecord: ShortlistingRecord | null;
  compareOpen: boolean;
  selectedRecords: ShortlistingRecord[];
  openView: (record: ShortlistingRecord) => void;
  openResume: (record: ShortlistingRecord) => void;
  openHistory: (record: ShortlistingRecord) => void;
  openSchedule: (record: ShortlistingRecord) => void;
  openCompare: () => void;
  closeView: () => void;
  closeResume: () => void;
  closeHistory: () => void;
  closeSchedule: () => void;
  closeCompare: () => void;
  setSelectedRecords: (records: ShortlistingRecord[]) => void;
};

const ShortlistingUiContext = createContext<ShortlistingUiContextValue | null>(
  null
);

export function ShortlistingUiProvider({ children }: { children: ReactNode }) {
  const [viewRecord, setViewRecord] = useState<ShortlistingRecord | null>(null);
  const [resumeRecord, setResumeRecord] = useState<ShortlistingRecord | null>(
    null
  );
  const [historyRecord, setHistoryRecord] =
    useState<ShortlistingRecord | null>(null);
  const [scheduleRecord, setScheduleRecord] =
    useState<ShortlistingRecord | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<ShortlistingRecord[]>(
    []
  );

  const closeOthers = useCallback(() => {
    setViewRecord(null);
    setResumeRecord(null);
    setHistoryRecord(null);
    setScheduleRecord(null);
    setCompareOpen(false);
  }, []);

  const openView = useCallback(
    (record: ShortlistingRecord) => {
      closeOthers();
      setViewRecord(record);
    },
    [closeOthers]
  );

  const openResume = useCallback(
    (record: ShortlistingRecord) => {
      closeOthers();
      setResumeRecord(record);
    },
    [closeOthers]
  );

  const openHistory = useCallback(
    (record: ShortlistingRecord) => {
      closeOthers();
      setHistoryRecord(record);
    },
    [closeOthers]
  );

  const openSchedule = useCallback(
    (record: ShortlistingRecord) => {
      closeOthers();
      setScheduleRecord(record);
    },
    [closeOthers]
  );

  const openCompare = useCallback(() => {
    setViewRecord(null);
    setResumeRecord(null);
    setHistoryRecord(null);
    setScheduleRecord(null);
    setCompareOpen(true);
  }, []);

  const closeView = useCallback(() => setViewRecord(null), []);
  const closeResume = useCallback(() => setResumeRecord(null), []);
  const closeHistory = useCallback(() => setHistoryRecord(null), []);
  const closeSchedule = useCallback(() => setScheduleRecord(null), []);
  const closeCompare = useCallback(() => setCompareOpen(false), []);

  const value = useMemo(
    () => ({
      viewRecord,
      resumeRecord,
      historyRecord,
      scheduleRecord,
      compareOpen,
      selectedRecords,
      openView,
      openResume,
      openHistory,
      openSchedule,
      openCompare,
      closeView,
      closeResume,
      closeHistory,
      closeSchedule,
      closeCompare,
      setSelectedRecords
    }),
    [
      viewRecord,
      resumeRecord,
      historyRecord,
      scheduleRecord,
      compareOpen,
      selectedRecords,
      openView,
      openResume,
      openHistory,
      openSchedule,
      openCompare,
      closeView,
      closeResume,
      closeHistory,
      closeSchedule,
      closeCompare
    ]
  );

  return (
    <ShortlistingUiContext.Provider value={value}>
      {children}
    </ShortlistingUiContext.Provider>
  );
}

export function useShortlistingUi() {
  const ctx = useContext(ShortlistingUiContext);
  if (!ctx) {
    throw new Error(
      'useShortlistingUi must be used within ShortlistingUiProvider'
    );
  }
  return ctx;
}
