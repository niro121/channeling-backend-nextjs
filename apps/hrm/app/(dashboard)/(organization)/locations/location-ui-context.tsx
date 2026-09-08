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
import type { LocationUiRecord } from '@/types/location';

type LocationUiContextValue = {
  records: LocationUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<LocationUiRecord[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  branchTypeFilter: string;
  setBranchTypeFilter: (value: string) => void;
  detailFormHighlight: boolean;
  startNewLocation: () => void;
};

const LocationUiContext = createContext<LocationUiContextValue | null>(null);

type ProviderProps = {
  initialRecords: LocationUiRecord[];
  initialSelectedId?: string | null;
  children: ReactNode;
};

export function LocationUiProvider({
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
  const [statusFilter, setStatusFilter] = useState('');
  const [branchTypeFilter, setBranchTypeFilter] = useState('');

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

  const startNewLocation = useCallback(() => {
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
      statusFilter,
      setStatusFilter,
      branchTypeFilter,
      setBranchTypeFilter,
      detailFormHighlight,
      startNewLocation
    }),
    [
      records,
      selectedId,
      setSelectedId,
      isNew,
      search,
      statusFilter,
      branchTypeFilter,
      detailFormHighlight,
      startNewLocation
    ]
  );

  return (
    <LocationUiContext.Provider value={value}>
      {children}
    </LocationUiContext.Provider>
  );
}

export function useLocationUi() {
  const ctx = useContext(LocationUiContext);
  if (!ctx) {
    throw new Error('useLocationUi must be used within LocationUiProvider');
  }
  return ctx;
}
