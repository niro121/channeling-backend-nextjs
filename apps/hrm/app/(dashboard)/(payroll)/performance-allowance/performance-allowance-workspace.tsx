'use client';

import { useEffect, useMemo, useState } from 'react';
import { DollarSign, Percent } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_PERFORMANCE_ALLOWANCE_SUMMARY,
  type PerformanceAllowanceMode,
  type PerformanceAllowanceRecord
} from '@/types/payroll';
import {
  PerformanceAllowanceUiProvider,
  usePerformanceAllowanceUi
} from './performance-allowance-ui-context';
import DialogView from './dialog-view';
import SectionForm from './section-form';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';

function PerformanceAllowanceWorkspaceInner() {
  const { viewRecord, editingRecord, clearEdit, closeView } =
    usePerformanceAllowanceUi();
  const [mode, setMode] = useState<PerformanceAllowanceMode>('percentage');
  const [records] = useState<PerformanceAllowanceRecord[]>([]);

  useEffect(() => {
    if (editingRecord && editingRecord.mode !== mode) {
      setMode(editingRecord.mode);
    }
  }, [editingRecord, mode]);

  const percentageRecords = useMemo(
    () => records.filter((row) => row.mode === 'percentage'),
    [records]
  );
  const fixedRecords = useMemo(
    () => records.filter((row) => row.mode === 'fixed'),
    [records]
  );

  const summary = EMPTY_PERFORMANCE_ALLOWANCE_SUMMARY;

  const handleModeChange = (value: string) => {
    const next = value as PerformanceAllowanceMode;
    if (editingRecord && editingRecord.mode !== next) {
      clearEdit();
    }
    setMode(next);
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Performance Allowance"
        description="Configure percentage-based or fixed-value performance allowances for staff."
      />

      <SectionSummary mode={mode} summary={summary} />

      <Tabs
        value={mode}
        onValueChange={handleModeChange}
        className="w-full space-y-6"
      >
        <TabsList className="w-full justify-start gap-5 bg-secondary">
          <TabsTrigger
            value="percentage"
            className="data-[state=active]:text-primary text-base"
          >
            <span className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Percentage
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="fixed"
            className="data-[state=active]:text-primary text-base"
          >
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fixed Value
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="percentage" className="mt-0 space-y-6">
          <SectionForm mode="percentage" staffOptions={[]} />
          <SectionRegister
            mode="percentage"
            records={percentageRecords}
            totalRecords={percentageRecords.length}
          />
        </TabsContent>

        <TabsContent value="fixed" className="mt-0 space-y-6">
          <SectionForm mode="fixed" staffOptions={[]} />
          <SectionRegister
            mode="fixed"
            records={fixedRecords}
            totalRecords={fixedRecords.length}
          />
        </TabsContent>
      </Tabs>

      <DialogView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeView();
        }}
        record={viewRecord}
      />
    </div>
  );
}

export default function PerformanceAllowanceWorkspace() {
  return (
    <PerformanceAllowanceUiProvider>
      <PerformanceAllowanceWorkspaceInner />
    </PerformanceAllowanceUiProvider>
  );
}
