'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { AppointmentLetterRecord } from '@/types/recruitment';

export type AppointmentLetterFormMode = 'create' | 'edit';

type FormSheetState = {
  mode: AppointmentLetterFormMode;
  record: AppointmentLetterRecord | null;
};

type AppointmentLettersUiContextValue = {
  formSheet: FormSheetState | null;
  viewRecord: AppointmentLetterRecord | null;
  letterPreviewRecord: AppointmentLetterRecord | null;
  openCreate: (prefill?: Partial<AppointmentLetterRecord>) => void;
  openEdit: (record: AppointmentLetterRecord) => void;
  openView: (record: AppointmentLetterRecord) => void;
  openLetterPreview: (record: AppointmentLetterRecord) => void;
  closeFormSheet: () => void;
  closeView: () => void;
  closeLetterPreview: () => void;
};

const AppointmentLettersUiContext =
  createContext<AppointmentLettersUiContextValue | null>(null);

function stubFromPrefill(
  prefill: Partial<AppointmentLetterRecord>
): AppointmentLetterRecord {
  return {
    id: '',
    letterNumber: '',
    evaluationId: prefill.evaluationId ?? '',
    evaluationCode: prefill.evaluationCode ?? '',
    applicationRefId: prefill.applicationRefId ?? '',
    applicationId: prefill.applicationId ?? '',
    candidateName: prefill.candidateName ?? '',
    position: prefill.position ?? '',
    department: prefill.department ?? '',
    employmentType: (prefill.employmentType as AppointmentLetterRecord['employmentType']) || 'permanent',
    appointmentDate: prefill.appointmentDate ?? '',
    salary: prefill.salary ?? '',
    letterDate: prefill.letterDate ?? '',
    reportingLocation: prefill.reportingLocation ?? '',
    reportingManager: prefill.reportingManager ?? '',
    probationPeriod: prefill.probationPeriod ?? '',
    benefits: prefill.benefits ?? '',
    termsAndConditions: prefill.termsAndConditions ?? '',
    status: 'draft',
    letterGenerated: false,
    createdAt: '',
    createdBy: '',
    updatedAt: '',
    updatedBy: ''
  };
}

export function AppointmentLettersUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [viewRecord, setViewRecord] =
    useState<AppointmentLetterRecord | null>(null);
  const [letterPreviewRecord, setLetterPreviewRecord] =
    useState<AppointmentLetterRecord | null>(null);

  const openCreate = useCallback(
    (prefill?: Partial<AppointmentLetterRecord>) => {
      setViewRecord(null);
      setLetterPreviewRecord(null);
      setFormSheet({
        mode: 'create',
        record: prefill ? stubFromPrefill(prefill) : null
      });
    },
    []
  );

  const openEdit = useCallback((record: AppointmentLetterRecord) => {
    setViewRecord(null);
    setLetterPreviewRecord(null);
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openView = useCallback((record: AppointmentLetterRecord) => {
    setFormSheet(null);
    setLetterPreviewRecord(null);
    setViewRecord(record);
  }, []);

  const openLetterPreview = useCallback((record: AppointmentLetterRecord) => {
    setFormSheet(null);
    setViewRecord(null);
    setLetterPreviewRecord(record);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeView = useCallback(() => setViewRecord(null), []);
  const closeLetterPreview = useCallback(
    () => setLetterPreviewRecord(null),
    []
  );

  const value = useMemo(
    () => ({
      formSheet,
      viewRecord,
      letterPreviewRecord,
      openCreate,
      openEdit,
      openView,
      openLetterPreview,
      closeFormSheet,
      closeView,
      closeLetterPreview
    }),
    [
      formSheet,
      viewRecord,
      letterPreviewRecord,
      openCreate,
      openEdit,
      openView,
      openLetterPreview,
      closeFormSheet,
      closeView,
      closeLetterPreview
    ]
  );

  return (
    <AppointmentLettersUiContext.Provider value={value}>
      {children}
    </AppointmentLettersUiContext.Provider>
  );
}

export function useAppointmentLettersUi() {
  const ctx = useContext(AppointmentLettersUiContext);
  if (!ctx) {
    throw new Error(
      'useAppointmentLettersUi must be used within AppointmentLettersUiProvider'
    );
  }
  return ctx;
}
