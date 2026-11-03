export const FLOAT_TRANSFER_TABS = ['given', 'requested'] as const;
export type FloatTransferTab = (typeof FLOAT_TRANSFER_TABS)[number];

export function parseFloatTransferTab(tab?: string | null): FloatTransferTab {
  return tab === 'requested' ? 'requested' : 'given';
}
