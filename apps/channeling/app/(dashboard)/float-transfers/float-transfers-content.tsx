'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { FloatRequest, FloatRequestPrintData } from '@/types/float-request';
import type { ReportUserOption } from '@/components/common/user-select';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { getFloatTransferColumns } from './columns';
import FloatTransfersFilterSection from './filter-section';
import { FloatTransfersTabs } from './float-transfers-tabs';
import type { FloatTransferTab } from './float-transfers-types';
import {
  ApproveModal,
  RejectModal,
  FloatRequestSummaryDialog,
  FloatPrintSlipDialog,
} from '../bulk-cashier/bulk-cashier-content';
import { useToast } from '@/components/hooks/use-toast';

const TAB_COPY: Record<FloatTransferTab, { heading: string; subHeading: string }> = {
  given: {
    heading: 'Float Transfers',
    subHeading: 'Floats you gave. Approve or reject pending requests assigned to you.',
  },
  requested: {
    heading: 'Float Transfers',
    subHeading: 'Floats you requested.',
  },
};

type FloatTransfersContentProps = {
  bulkCashierId: string;
  initialData: FloatRequest[];
  initialTotalRecords: number;
  page?: string;
  limit?: string;
  status?: string;
  requestedById?: string;
  bulkCashierFilterId?: string;
  tab: FloatTransferTab;
  userOptions: ReportUserOption[];
};

export function FloatTransfersContent({
  bulkCashierId,
  initialData,
  initialTotalRecords,
  page,
  limit,
  status,
  requestedById,
  bulkCashierFilterId,
  tab,
  userOptions,
}: FloatTransfersContentProps) {
  const [approveModal, setApproveModal] = useState<FloatRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<FloatRequest | null>(null);
  const [summaryRequest, setSummaryRequest] = useState<FloatRequest | null>(null);
  const [printSlipData, setPrintSlipData] = useState<FloatRequestPrintData | null>(null);
  const [pendingTab, setPendingTab] = useState<FloatTransferTab | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (pendingTab === tab) setPendingTab(null);
  }, [tab, pendingTab, initialData, initialTotalRecords]);

  const isTabLoading = pendingTab != null && pendingTab !== tab;

  const columns = getFloatTransferColumns({
    onApprove: setApproveModal,
    onReject: setRejectModal,
    onViewSummary: setSummaryRequest,
    mode: tab,
  });

  const handleCloseApprove = () => {
    setApproveModal(null);
    router.refresh();
  };
  const handleApproveSuccess = (msg: string, data?: FloatRequestPrintData) => {
    toast({ title: msg });
    setApproveModal(null);
    if (data) setPrintSlipData(data);
    router.refresh();
  };
  const handleCloseReject = () => {
    setRejectModal(null);
    router.refresh();
  };
  const handleRejectSuccess = (msg: string) => {
    toast({ title: msg });
    setRejectModal(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <FloatTransfersTabs onLoadingStart={setPendingTab} />
      <div className="relative">
        {isTabLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <CustomDataTable<FloatRequest, unknown>
          heading={TAB_COPY[tab].heading}
          subHeading={TAB_COPY[tab].subHeading}
          columns={columns}
          data={initialData}
          rowCount={initialTotalRecords}
          haveBulkDelete={false}
          page={page}
          limit={limit}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <FloatTransfersFilterSection
                status={status}
                requestedById={requestedById}
                bulkCashierId={bulkCashierFilterId}
                userOptions={userOptions}
                mode={tab}
              />
            </div>
          }
        />
      </div>

      {approveModal && (
        <ApproveModal
          request={approveModal}
          bulkCashierId={bulkCashierId}
          onClose={handleCloseApprove}
          onError={(msg) => toast({ variant: 'destructive', title: msg })}
          onSuccess={handleApproveSuccess}
        />
      )}
      {printSlipData && (
        <FloatPrintSlipDialog
          data={printSlipData}
          onClose={() => setPrintSlipData(null)}
        />
      )}
      {rejectModal && (
        <RejectModal
          request={rejectModal}
          bulkCashierId={bulkCashierId}
          onClose={handleCloseReject}
          onError={(msg) => toast({ variant: 'destructive', title: msg })}
          onSuccess={handleRejectSuccess}
        />
      )}
      {summaryRequest && (
        <FloatRequestSummaryDialog
          request={summaryRequest}
          onClose={() => setSummaryRequest(null)}
          onPrintSlip={(data) => {
            setSummaryRequest(null);
            setPrintSlipData(data);
          }}
        />
      )}
    </div>
  );
}
