'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { ApplicationRecord } from '@/types/recruitment';

type ApplicationsUiContextValue = {
  viewRecord: ApplicationRecord | null;
  resumeRecord: ApplicationRecord | null;
  historyRecord: ApplicationRecord | null;
  scheduleRecord: ApplicationRecord | null;
  openView: (record: ApplicationRecord) => void;
  openResume: (record: ApplicationRecord) => void;
  openHistory: (record: ApplicationRecord) => void;
  openSchedule: (record: ApplicationRecord) => void;
  closeView: () => void;
  closeResume: () => void;
  closeHistory: () => void;
  closeSchedule: () => void;
};

const ApplicationsUiContext =
  createContext<ApplicationsUiContextValue | null>(null);

export function ApplicationsUiProvider({ children }: { children: ReactNode }) {
  const [viewRecord, setViewRecord] = useState<ApplicationRecord | null>(null);
  const [resumeRecord, setResumeRecord] = useState<ApplicationRecord | null>(
    null
  );
  const [historyRecord, setHistoryRecord] =
    useState<ApplicationRecord | null>(null);
  const [scheduleRecord, setScheduleRecord] =
    useState<ApplicationRecord | null>(null);

  const closeOthers = useCallback(() => {
    setViewRecord(null);
    setResumeRecord(null);
    setHistoryRecord(null);
    setScheduleRecord(null);
  }, []);

  const openView = useCallback(
    (record: ApplicationRecord) => {
      closeOthers();
      setViewRecord(record);
    },
    [closeOthers]
  );

  const openResume = useCallback(
    (record: ApplicationRecord) => {
      closeOthers();
      setResumeRecord(record);
    },
    [closeOthers]
  );

  const openHistory = useCallback(
    (record: ApplicationRecord) => {
      closeOthers();
      setHistoryRecord(record);
    },
    [closeOthers]
  );

  const openSchedule = useCallback(
    (record: ApplicationRecord) => {
      closeOthers();
      setScheduleRecord(record);
    },
    [closeOthers]
  );

  const closeView = useCallback(() => setViewRecord(null), []);
  const closeResume = useCallback(() => setResumeRecord(null), []);
  const closeHistory = useCallback(() => setHistoryRecord(null), []);
  const closeSchedule = useCallback(() => setScheduleRecord(null), []);

  const value = useMemo(
    () => ({
      viewRecord,
      resumeRecord,
      historyRecord,
      scheduleRecord,
      openView,
      openResume,
      openHistory,
      openSchedule,
      closeView,
      closeResume,
      closeHistory,
      closeSchedule
    }),
    [
      viewRecord,
      resumeRecord,
      historyRecord,
      scheduleRecord,
      openView,
      openResume,
      openHistory,
      openSchedule,
      closeView,
      closeResume,
      closeHistory,
      closeSchedule
    ]
  );

  return (
    <ApplicationsUiContext.Provider value={value}>
      {children}
    </ApplicationsUiContext.Provider>
  );
}

export function useApplicationsUi() {
  const ctx = useContext(ApplicationsUiContext);
  if (!ctx) {
    throw new Error(
      'useApplicationsUi must be used within ApplicationsUiProvider'
    );
  }
  return ctx;
}
