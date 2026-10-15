'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { InterviewRecord } from '@/types/recruitment';

export type InterviewFormMode = 'create' | 'reschedule';
export type InterviewViewMode = 'calendar' | 'list';

type FormSheetState = {
  mode: InterviewFormMode;
  record: InterviewRecord | null;
};

type InterviewScheduleUiContextValue = {
  viewMode: InterviewViewMode;
  setViewMode: (mode: InterviewViewMode) => void;
  weekStart: Date;
  setWeekStart: (date: Date) => void;
  formSheet: FormSheetState | null;
  viewRecord: InterviewRecord | null;
  openCreate: () => void;
  openReschedule: (record: InterviewRecord) => void;
  openView: (record: InterviewRecord) => void;
  closeFormSheet: () => void;
  closeView: () => void;
};

const InterviewScheduleUiContext =
  createContext<InterviewScheduleUiContextValue | null>(null);

type ProviderProps = {
  children: ReactNode;
  initialWeekStart: Date;
  initialViewMode?: InterviewViewMode;
};

export function InterviewScheduleUiProvider({
  children,
  initialWeekStart,
  initialViewMode = 'calendar'
}: ProviderProps) {
  const [viewMode, setViewMode] =
    useState<InterviewViewMode>(initialViewMode);
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [viewRecord, setViewRecord] = useState<InterviewRecord | null>(null);

  const openCreate = useCallback(() => {
    setViewRecord(null);
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openReschedule = useCallback((record: InterviewRecord) => {
    setViewRecord(null);
    setFormSheet({ mode: 'reschedule', record });
  }, []);

  const openView = useCallback((record: InterviewRecord) => {
    setFormSheet(null);
    setViewRecord(record);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeView = useCallback(() => setViewRecord(null), []);

  const value = useMemo(
    () => ({
      viewMode,
      setViewMode,
      weekStart,
      setWeekStart,
      formSheet,
      viewRecord,
      openCreate,
      openReschedule,
      openView,
      closeFormSheet,
      closeView
    }),
    [
      viewMode,
      weekStart,
      formSheet,
      viewRecord,
      openCreate,
      openReschedule,
      openView,
      closeFormSheet,
      closeView
    ]
  );

  return (
    <InterviewScheduleUiContext.Provider value={value}>
      {children}
    </InterviewScheduleUiContext.Provider>
  );
}

export function useInterviewScheduleUi() {
  const ctx = useContext(InterviewScheduleUiContext);
  if (!ctx) {
    throw new Error(
      'useInterviewScheduleUi must be used within InterviewScheduleUiProvider'
    );
  }
  return ctx;
}
