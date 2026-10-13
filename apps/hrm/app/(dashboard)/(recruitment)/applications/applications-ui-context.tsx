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

export type ApplicationFormMode = 'create';

type FormSheetState = {
  mode: ApplicationFormMode;
};

type ApplicationsUiContextValue = {
  formSheet: FormSheetState | null;
  viewRecord: ApplicationRecord | null;
  resumeRecord: ApplicationRecord | null;
  historyRecord: ApplicationRecord | null;
  scheduleRecord: ApplicationRecord | null;
  openCreate: () => void;
  openView: (record: ApplicationRecord) => void;
  openResume: (record: ApplicationRecord) => void;
  openHistory: (record: ApplicationRecord) => void;
  openSchedule: (record: ApplicationRecord) => void;
  closeFormSheet: () => void;
  closeView: () => void;
  closeResume: () => void;
  closeHistory: () => void;
  closeSchedule: () => void;
};

const ApplicationsUiContext =
  createContext<ApplicationsUiContextValue | null>(null);

export function ApplicationsUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [viewRecord, setViewRecord] = useState<ApplicationRecord | null>(null);
  const [resumeRecord, setResumeRecord] = useState<ApplicationRecord | null>(
    null
  );
  const [historyRecord, setHistoryRecord] =
    useState<ApplicationRecord | null>(null);
  const [scheduleRecord, setScheduleRecord] =
    useState<ApplicationRecord | null>(null);

  const closeOthers = useCallback(() => {
    setFormSheet(null);
    setViewRecord(null);
    setResumeRecord(null);
    setHistoryRecord(null);
    setScheduleRecord(null);
  }, []);

  const openCreate = useCallback(() => {
    closeOthers();
    setFormSheet({ mode: 'create' });
  }, [closeOthers]);

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

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeView = useCallback(() => setViewRecord(null), []);
  const closeResume = useCallback(() => setResumeRecord(null), []);
  const closeHistory = useCallback(() => setHistoryRecord(null), []);
  const closeSchedule = useCallback(() => setScheduleRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      viewRecord,
      resumeRecord,
      historyRecord,
      scheduleRecord,
      openCreate,
      openView,
      openResume,
      openHistory,
      openSchedule,
      closeFormSheet,
      closeView,
      closeResume,
      closeHistory,
      closeSchedule
    }),
    [
      formSheet,
      viewRecord,
      resumeRecord,
      historyRecord,
      scheduleRecord,
      openCreate,
      openView,
      openResume,
      openHistory,
      openSchedule,
      closeFormSheet,
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
