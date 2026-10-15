'use client';

import { Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  PAYSHEET_COMPONENT_KIND_LABELS,
  type PaysheetComponentKind,
  type PaysheetComponentUiRecord
} from '@/types/paysheet-component';
import {
  PaysheetComponentUiProvider,
  usePaysheetComponentUi
} from './paysheet-component-ui-context';
import SectionPaysheetComponentDetail from './section-paysheet-component-detail';
import SectionPaysheetComponentFilters, {
  type PaysheetComponentListFilters
} from './section-paysheet-component-filters';
import SectionPaysheetComponentList from './section-paysheet-component-list';

type Props = {
  initialRecords?: PaysheetComponentUiRecord[];
  initialSelectedId?: string | null;
  initialKind?: PaysheetComponentKind;
  initialFilters?: PaysheetComponentListFilters;
};

function PaysheetComponentTabs() {
  const { activeKind, setActiveKind, filters } = usePaysheetComponentUi();

  return (
    <div className="space-y-4">
      <SectionPaysheetComponentFilters
        activeKind={activeKind}
        initial={filters}
      />

      <Tabs
        value={activeKind}
        onValueChange={(value) =>
          setActiveKind(value as PaysheetComponentKind)
        }
        className="space-y-4"
      >
        <TabsList className="w-full justify-start gap-5 bg-secondary">
          <TabsTrigger
            value="system"
            className="data-[state=active]:text-primary text-base"
          >
            {PAYSHEET_COMPONENT_KIND_LABELS.system}
          </TabsTrigger>
          <TabsTrigger
            value="custom"
            className="data-[state=active]:text-primary text-base"
          >
            {PAYSHEET_COMPONENT_KIND_LABELS.custom}
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionPaysheetComponentList />
          <SectionPaysheetComponentDetail />
        </div>
      </Tabs>
    </div>
  );
}

function PaysheetComponentWorkspaceInner({
  initialRecords = [],
  initialSelectedId = null,
  initialKind = 'system',
  initialFilters = {}
}: Props) {
  return (
    <PaysheetComponentUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
      initialKind={initialKind}
      initialFilters={initialFilters}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Paysheet Components"
          description="System and custom allowances, deductions, loans and advances configured for the hospital."
        />
        <PaysheetComponentTabs />
      </div>
    </PaysheetComponentUiProvider>
  );
}

export default function PaysheetComponentWorkspace(props: Props) {
  return (
    <Suspense fallback={null}>
      <PaysheetComponentWorkspaceInner {...props} />
    </Suspense>
  );
}
