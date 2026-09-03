'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  parseFloatTransferTab,
  type FloatTransferTab,
} from './float-transfers-types';

const TABS: { value: FloatTransferTab; label: string }[] = [
  { value: 'given', label: 'Given' },
  { value: 'requested', label: 'Requested' },
];

type FloatTransfersTabsProps = {
  onLoadingStart?: (nextTab: FloatTransferTab) => void;
};

export function FloatTransfersTabs({ onLoadingStart }: FloatTransfersTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseFloatTransferTab(searchParams.get('tab'));
  const limit = searchParams.get('limit') || '10';
  const status = searchParams.get('status');

  const onTabChange = (value: string) => {
    if (value === tab) return;
    const nextTab = parseFloatTransferTab(value);
    const params = new URLSearchParams();
    params.set('tab', nextTab);
    params.set('page', '0');
    params.set('limit', limit);
    if (status && status !== '__all__') params.set('status', status);
    onLoadingStart?.(nextTab);
    router.replace(`/float-transfers?${params.toString()}`);
  };

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="cursor-pointer">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
