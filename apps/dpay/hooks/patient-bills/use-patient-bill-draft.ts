'use client';

import { useCallback } from 'react';
import type { PatientBillDraft } from '@/types/patient-bill';

export const PATIENT_BILL_DRAFT_STORAGE_KEY = 'dpay-patient-bill-draft';

export function usePatientBillDraft() {
  const loadDraft = useCallback((): PatientBillDraft | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(PATIENT_BILL_DRAFT_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PatientBillDraft;
    } catch {
      return null;
    }
  }, []);

  const saveDraft = useCallback((draft: PatientBillDraft) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PATIENT_BILL_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, []);

  const discardDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PATIENT_BILL_DRAFT_STORAGE_KEY);
  }, []);

  return { loadDraft, saveDraft, discardDraft };
}
