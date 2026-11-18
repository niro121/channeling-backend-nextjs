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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type {
  PaysheetComponentKind,
  PaysheetComponentUiRecord
} from '@/types/paysheet-component';
import type { PaysheetComponentListFilters } from './section-paysheet-component-filters';

type PaysheetComponentUiContextValue = {
  records: PaysheetComponentUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<PaysheetComponentUiRecord[]>>;
  activeKind: PaysheetComponentKind;
  setActiveKind: (kind: PaysheetComponentKind) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  filters: PaysheetComponentListFilters;
  detailFormHighlight: boolean;
  startNewPaysheetComponent: () => void;
};

const PaysheetComponentUiContext =
  createContext<PaysheetComponentUiContextValue | null>(null);

type ProviderProps = {
  initialRecords?: PaysheetComponentUiRecord[];
  initialSelectedId?: string | null;
  initialKind?: PaysheetComponentKind;
  initialFilters?: PaysheetComponentListFilters;
  children: ReactNode;
};

export function PaysheetComponentUiProvider({
  initialRecords = [],
  initialSelectedId = null,
  initialKind = 'system',
  initialFilters = {},
  children
}: ProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState(initialRecords);
  const [activeKind, setActiveKindState] =
    useState<PaysheetComponentKind>(initialKind);
  const [selectedId, setSelectedIdState] = useState<string | null>(
    initialSelectedId
  );
  const [isNew, setIsNew] = useState(false);
  const [detailFormHighlight, setDetailFormHighlight] = useState(false);
  const [filters, setFilters] =
    useState<PaysheetComponentListFilters>(initialFilters);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    setActiveKindState(initialKind);
  }, [initialKind]);

  useEffect(() => {
    setSelectedIdState(initialSelectedId);
    setIsNew(false);
  }, [initialSelectedId]);

  const setActiveKind = useCallback(
    (kind: PaysheetComponentKind) => {
      setActiveKindState(kind);
      setSelectedIdState(null);
      setIsNew(false);
      setDetailFormHighlight(false);

      const params = new URLSearchParams(searchParams.toString());
      params.set('kind', kind);
      params.delete('id');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    setIsNew(false);
    setDetailFormHighlight(false);
  }, []);

  const startNewPaysheetComponent = useCallback(() => {
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
      activeKind,
      setActiveKind,
      selectedId,
      setSelectedId,
      isNew,
      setIsNew,
      filters,
      detailFormHighlight,
      startNewPaysheetComponent
    }),
    [
      records,
      activeKind,
      setActiveKind,
      selectedId,
      setSelectedId,
      isNew,
      filters,
      detailFormHighlight,
      startNewPaysheetComponent
    ]
  );

  return (
    <PaysheetComponentUiContext.Provider value={value}>
      {children}
    </PaysheetComponentUiContext.Provider>
  );
}

export function usePaysheetComponentUi() {
  const ctx = useContext(PaysheetComponentUiContext);
  if (!ctx) {
    throw new Error(
      'usePaysheetComponentUi must be used within PaysheetComponentUiProvider'
    );
  }
  return ctx;
}
