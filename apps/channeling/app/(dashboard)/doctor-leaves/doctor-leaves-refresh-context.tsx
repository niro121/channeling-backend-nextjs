'use client';

import React from 'react';

type DoctorLeavesRefreshContextValue = {
  refetch: () => void;
};

const DoctorLeavesRefreshContext =
  React.createContext<DoctorLeavesRefreshContextValue | null>(null);

export function useDoctorLeavesRefetch() {
  const ctx = React.useContext(DoctorLeavesRefreshContext);
  return ctx?.refetch ?? (() => {});
}

export function DoctorLeavesRefreshProvider({
  refetch,
  children
}: {
  refetch: () => void;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ refetch }), [refetch]);
  return (
    <DoctorLeavesRefreshContext.Provider value={value}>
      {children}
    </DoctorLeavesRefreshContext.Provider>
  );
}
