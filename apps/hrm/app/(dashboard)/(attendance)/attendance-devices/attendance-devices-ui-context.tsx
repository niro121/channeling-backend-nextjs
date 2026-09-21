'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { AttendanceDeviceRecord } from '@/types/attendance';

export type DeviceFormSheetMode = 'add' | 'edit';

type FormSheetState = {
  mode: DeviceFormSheetMode;
  record: AttendanceDeviceRecord | null;
};

type AttendanceDevicesUiContextValue = {
  formSheet: FormSheetState | null;
  openAdd: () => void;
  openEdit: (record: AttendanceDeviceRecord) => void;
  closeFormSheet: () => void;
};

const AttendanceDevicesUiContext =
  createContext<AttendanceDevicesUiContextValue | null>(null);

export function AttendanceDevicesUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);

  const openAdd = useCallback(() => {
    setFormSheet({ mode: 'add', record: null });
  }, []);

  const openEdit = useCallback((record: AttendanceDeviceRecord) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      openAdd,
      openEdit,
      closeFormSheet
    }),
    [formSheet, openAdd, openEdit, closeFormSheet]
  );

  return (
    <AttendanceDevicesUiContext.Provider value={value}>
      {children}
    </AttendanceDevicesUiContext.Provider>
  );
}

export function useAttendanceDevicesUi() {
  const ctx = useContext(AttendanceDevicesUiContext);
  if (!ctx) {
    throw new Error(
      'useAttendanceDevicesUi must be used within AttendanceDevicesUiProvider'
    );
  }
  return ctx;
}
