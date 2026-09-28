'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { SalaryCycleUiRecord } from '@/types/salary-cycle';

type SalaryCycleUiContextValue = {
  records: SalaryCycleUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<SalaryCycleUiRecord[]>>;
  institutionId: number;
  setInstitutionId: (id: number) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  detailFormHighlight: boolean;
  startNewCycle: () => void;
  fillRequestId: number;
  requestFill: () => void;
};

const SalaryCycleUiContext = createContext<SalaryCycleUiContextValue | null>(
  null
);

type ProviderProps = {
  initialRecords?: SalaryCycleUiRecord[];
  initialInstitutionId?: number;
  initialSelectedId?: string | null;
  children: ReactNode;
};

export function SalaryCycleUiProvider({
  initialRecords = [],
  initialInstitutionId = 0,
  initialSelectedId = null,
  children
}: ProviderProps) {
  const [records, setRecords] = useState(initialRecords);
  const [institutionId, setInstitutionIdState] = useState(initialInstitutionId);
  const [selectedId, setSelectedIdState] = useState<string | null>(
    initialSelectedId
  );
  const [isNew, setIsNew] = useState(false);
  const [detailFormHighlight, setDetailFormHighlight] = useState(false);
  const [search, setSearch] = useState('');
  const [fillRequestId, setFillRequestId] = useState(0);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  const setInstitutionId = useCallback((id: number) => {
    setInstitutionIdState(id);
    setSelectedIdState(null);
    setIsNew(false);
    setDetailFormHighlight(false);
    setSearch('');
  }, []);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    setIsNew(false);
    setDetailFormHighlight(false);
  }, []);

  const startNewCycle = useCallback(() => {
    setSelectedIdState(null);
    setIsNew(true);
    setDetailFormHighlight(true);
  }, []);

  const requestFill = useCallback(() => {
    setFillRequestId((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!detailFormHighlight) return;
    const timer = window.setTimeout(() => setDetailFormHighlight(false), 2800);
    return () => window.clearTimeout(timer);
  }, [detailFormHighlight]);

  const value = useMemo(
    () => ({
      records,
      setRecords,
      institutionId,
      setInstitutionId,
      selectedId,
      setSelectedId,
      isNew,
      setIsNew,
      search,
      setSearch,
      detailFormHighlight,
      startNewCycle,
      fillRequestId,
      requestFill
    }),
    [
      records,
      institutionId,
      setInstitutionId,
      selectedId,
      setSelectedId,
      isNew,
      search,
      detailFormHighlight,
      startNewCycle,
      fillRequestId,
      requestFill
    ]
  );

  return (
    <SalaryCycleUiContext.Provider value={value}>
      {children}
    </SalaryCycleUiContext.Provider>
  );
}

export function useSalaryCycleUi() {
  const ctx = useContext(SalaryCycleUiContext);
  if (!ctx) {
    throw new Error('useSalaryCycleUi must be used within SalaryCycleUiProvider');
  }
  return ctx;
}
