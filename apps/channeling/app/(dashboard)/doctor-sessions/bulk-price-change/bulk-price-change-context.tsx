'use client';

import React, { createContext, useContext } from 'react';

type BulkPriceChangeListContextValue = {
  openDetail: (id: string) => void;
};

const BulkPriceChangeListContext = createContext<BulkPriceChangeListContextValue | null>(null);

export function useBulkPriceChangeListContext() {
  return useContext(BulkPriceChangeListContext);
}

export const BulkPriceChangeListProvider = BulkPriceChangeListContext.Provider;
