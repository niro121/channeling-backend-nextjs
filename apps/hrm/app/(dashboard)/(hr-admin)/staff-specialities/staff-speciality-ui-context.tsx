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
import type { StaffSpecialityUiRecord } from '@/types/staff-speciality';

type StaffSpecialityUiContextValue = {
  records: StaffSpecialityUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<StaffSpecialityUiRecord[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  detailFormHighlight: boolean;
  startNewStaffSpeciality: () => void;
};

const StaffSpecialityUiContext =
  createContext<StaffSpecialityUiContextValue | null>(null);

type ProviderProps = {
  initialRecords: StaffSpecialityUiRecord[];
  initialSelectedId?: string | null;
  children: ReactNode;
};

export function StaffSpecialityUiProvider({
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

  const startNewStaffSpeciality = useCallback(() => {
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
      startNewStaffSpeciality
    }),
    [
      records,
      selectedId,
      setSelectedId,
      isNew,
      search,
      detailFormHighlight,
      startNewStaffSpeciality
    ]
  );

  return (
    <StaffSpecialityUiContext.Provider value={value}>
      {children}
    </StaffSpecialityUiContext.Provider>
  );
}

export function useStaffSpecialityUi() {
  const ctx = useContext(StaffSpecialityUiContext);
  if (!ctx) {
    throw new Error(
      'useStaffSpecialityUi must be used within StaffSpecialityUiProvider'
    );
  }
  return ctx;
}
