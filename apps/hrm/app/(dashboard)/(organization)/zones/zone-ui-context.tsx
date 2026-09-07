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
import type { ZoneLocationSummary, ZoneUiRecord } from '@/types/zone';

type ZoneUiContextValue = {
  records: ZoneUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<ZoneUiRecord[]>>;
  locationOptions: ZoneLocationSummary[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  locationFilter: string;
  setLocationFilter: (value: string) => void;
  detailFormHighlight: boolean;
  startNewZone: () => void;
};

const ZoneUiContext = createContext<ZoneUiContextValue | null>(null);

type ProviderProps = {
  initialRecords: ZoneUiRecord[];
  locationOptions: ZoneLocationSummary[];
  initialSelectedId?: string | null;
  children: ReactNode;
};

export function ZoneUiProvider({
  initialRecords,
  locationOptions,
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
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

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

  const startNewZone = useCallback(() => {
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
      locationOptions,
      selectedId,
      setSelectedId,
      isNew,
      setIsNew,
      search,
      setSearch,
      statusFilter,
      setStatusFilter,
      locationFilter,
      setLocationFilter,
      detailFormHighlight,
      startNewZone
    }),
    [
      records,
      locationOptions,
      selectedId,
      setSelectedId,
      isNew,
      search,
      statusFilter,
      locationFilter,
      detailFormHighlight,
      startNewZone
    ]
  );

  return (
    <ZoneUiContext.Provider value={value}>{children}</ZoneUiContext.Provider>
  );
}

export function useZoneUi() {
  const ctx = useContext(ZoneUiContext);
  if (!ctx) {
    throw new Error('useZoneUi must be used within ZoneUiProvider');
  }
  return ctx;
}
