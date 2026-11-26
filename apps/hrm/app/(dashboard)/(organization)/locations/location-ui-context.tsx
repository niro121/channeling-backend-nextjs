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
import type { LocationListFilters } from './section-location-filters';

type LocationUiContextValue = {
  records: LocationUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<LocationUiRecord[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  filters: LocationListFilters;
  detailFormHighlight: boolean;
  startNewLocation: () => void;
};

const LocationUiContext = createContext<LocationUiContextValue | null>(null);

type ProviderProps = {
  initialRecords: LocationUiRecord[];
  initialSelectedId?: string | null;
  initialFilters?: LocationListFilters;
  children: ReactNode;
};

export function LocationUiProvider({
  initialRecords,
  initialSelectedId = null,
  initialFilters = {},
  children
}: ProviderProps) {
  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedIdState] = useState<string | null>(
    initialSelectedId
  );
  const [isNew, setIsNew] = useState(false);
  const [detailFormHighlight, setDetailFormHighlight] = useState(false);
  const [filters, setFilters] = useState<LocationListFilters>(initialFilters);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

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
      filters,
      detailFormHighlight,
      startNewLocation
    }),
    [
      records,
      selectedId,
      setSelectedId,
      isNew,
      filters,
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
