'use client';

import React from 'react';
import type { Table } from '@tanstack/react-table';

export type CommonDataTableContextValue = {
  table: Table<unknown>;
  rowSelection: Record<string, boolean>;
  showHideDeleteModal: (value: boolean) => Promise<void>;
  fetchingDescription: boolean;
};

const CommonDataTableContext =
  React.createContext<CommonDataTableContextValue | null>(null);

export function CommonDataTableProvider({
  value,
  children
}: {
  value: CommonDataTableContextValue;
  children: React.ReactNode;
}) {
  return (
    <CommonDataTableContext.Provider value={value}>
      {children}
    </CommonDataTableContext.Provider>
  );
}

export function useCommonDataTableContext() {
  const context = React.useContext(CommonDataTableContext);
  if (!context) {
    throw new Error(
      'useCommonDataTableContext must be used within CommonDataTable'
    );
  }
  return context;
}
