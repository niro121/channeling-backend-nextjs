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
import type { HolidayCalendarUiRecord } from '@/types/holiday-calendar';

type HolidayCalendarUiContextValue = {
  records: HolidayCalendarUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<HolidayCalendarUiRecord[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  startNewHoliday: () => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  year: number;
  setYear: (year: number) => void;
  search: string;
  setSearch: (value: string) => void;
  detailFormHighlight: boolean;
};

const HolidayCalendarUiContext = createContext<HolidayCalendarUiContextValue | null>(
  null
);

type ProviderProps = {
  initialRecords: HolidayCalendarUiRecord[];
  initialSelectedId?: string | null;
  initialYear?: number;
  children: ReactNode;
};

export function HolidayCalendarUiProvider({
  initialRecords,
  initialSelectedId = null,
  initialYear,
  children
}: ProviderProps) {
  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedIdState] = useState<string | null>(
    initialSelectedId
  );
  const [isNew, setIsNew] = useState(false);
  const [detailFormHighlight, setDetailFormHighlight] = useState(false);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(
    initialYear ?? new Date().getFullYear()
  );

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    if (initialSelectedId !== undefined) {
      setSelectedIdState(initialSelectedId);
      setIsNew(false);
    }
  }, [initialSelectedId]);

  useEffect(() => {
    if (initialYear !== undefined) {
      setYear(initialYear);
    }
  }, [initialYear]);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    setIsNew(false);
    setDetailFormHighlight(false);
  }, []);

  const startNewHoliday = useCallback(() => {
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
      startNewHoliday,
      isNew,
      setIsNew,
      year,
      setYear,
      search,
      setSearch,
      detailFormHighlight
    }),
    [
      records,
      selectedId,
      setSelectedId,
      startNewHoliday,
      isNew,
      year,
      search,
      detailFormHighlight
    ]
  );

  return (
    <HolidayCalendarUiContext.Provider value={value}>
      {children}
    </HolidayCalendarUiContext.Provider>
  );
}

export function useHolidayCalendarUi() {
  const ctx = useContext(HolidayCalendarUiContext);
  if (!ctx) {
    throw new Error('useHolidayCalendarUi must be used within HolidayCalendarUiProvider');
  }
  return ctx;
}
