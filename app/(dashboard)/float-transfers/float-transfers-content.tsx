'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getFloatRequestsForBulkCashierPaginatedAction,
  approveFloatRequestAction,
  rejectFloatRequestAction,
  getCashAccountsForFloatAction,
} from '@/app/actions/float-request.actions';
import type { FloatRequest, FloatRequestPrintData } from '@/types/float-request';
import type { Account } from '@/types/accounting';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { getFloatTransferColumns } from './columns';
import FloatTransfersFilterSection from './filter-section';
import {
  ApproveModal,
  RejectModal,
  FloatRequestSummaryDialog,
  FloatPrintSlipDialog,
} from '../bulk-cashier/bulk-cashier-content';
import { useToast } from '@/components/hooks/use-toast';

type FloatTransfersContentProps = {
  bulkCashierId: string;
  initialData: FloatRequest[];
  initialTotalRecords: number;
  page?: string;
  limit?: string;
  status?: string;
};

export function FloatTransfersContent({
  bulkCashierId,
  initialData,
  initialTotalRecords,
  page,
  limit,
  status,
}: FloatTransfersContentProps) {
  const [approveModal, setApproveModal] = useState<FloatRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<FloatRequest | null>(null);
  const [summaryRequest, setSummaryRequest] = useState<FloatRequest | null>(null);
  const [printSlipData, setPrintSlipData] = useState<FloatRequestPrintData | null>(null);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (approveModal) {
      getCashAccountsForFloatAction().then((res) => {
        if (res.success && res.data) setCashAccounts(res.data);
      });
    }
  }, [approveModal]);

  const columns = getFloatTransferColumns({
    onApprove: setApproveModal,
    onReject: setRejectModal,
    onViewSummary: setSummaryRequest,
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
    <>
      <CustomDataTable<FloatRequest, unknown>
        heading="Float Transfers"
        subHeading="Float requests assigned to you. Approve or reject pending requests."
        columns={columns}
        data={initialData}
        rowCount={initialTotalRecords}
        haveBulkDelete={false}
        page={page}
        limit={limit}
        toolbarLeft={
          <div className="flex flex-wrap items-center gap-3">
            <FloatTransfersFilterSection status={status} />
          </div>
        }
      />

      {approveModal && (
        <ApproveModal
          request={approveModal}
          cashAccounts={cashAccounts}
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
    </>
  );
}
