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
import type { StaffGradeUiRecord } from '@/types/staff-grade';

type StaffGradeUiContextValue = {
  records: StaffGradeUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<StaffGradeUiRecord[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  detailFormHighlight: boolean;
  startNewStaffGrade: () => void;
};

const StaffGradeUiContext = createContext<StaffGradeUiContextValue | null>(null);

type ProviderProps = {
  initialRecords: StaffGradeUiRecord[];
  initialSelectedId?: string | null;
  children: ReactNode;
};

export function StaffGradeUiProvider({
  initialRecords,
  initialSelectedId = null,
  children
}: ProviderProps) {
  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedIdState] = useState<string | null>(
    initialSelectedId
  );
  const [isNew, setIsNew] = useState(false);
  const [detailFormHighlight, setDetailFormHighlight] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    setSelectedIdState(initialSelectedId);
    setIsNew(false);
  }, [initialSelectedId]);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    setIsNew(false);
    setDetailFormHighlight(false);
  }, []);

  const startNewStaffGrade = useCallback(() => {
    setSelectedIdState(null);
    setIsNew(true);
    setDetailFormHighlight(true);
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
      selectedId,
      setSelectedId,
      isNew,
      setIsNew,
      search,
      setSearch,
      detailFormHighlight,
      startNewStaffGrade
    }),
    [
      records,
      selectedId,
      setSelectedId,
      isNew,
      search,
      detailFormHighlight,
      startNewStaffGrade
    ]
  );

  return (
    <StaffGradeUiContext.Provider value={value}>
      {children}
    </StaffGradeUiContext.Provider>
  );
}

export function useStaffGradeUi() {
  const ctx = useContext(StaffGradeUiContext);
  if (!ctx) {
    throw new Error('useStaffGradeUi must be used within StaffGradeUiProvider');
  }
  return ctx;
}
