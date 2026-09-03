import { redirect } from "next/navigation";
import { fetchServerSession } from "@/lib/session";
import { userTypes } from "@/lib/roles";
import { TransactionFlowDiagram } from "./transaction-flow-diagram";
import { BackButton } from "@/components/common/back-button";

export default async function AdminTransactionFlowPage() {
  const session = await fetchServerSession();
  if (!session?.user) {
    redirect("/login");
  }
  const userType = (session.user as { userType?: number }).userType;
  if (userType !== userTypes.admin) {
    redirect("/unauthorized-access");
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Hub: Transaction flow diagram</h1>
          <p className="text-muted-foreground text-sm mt-1">
            All flows that create receipts and journal entries. Use the tabs: Overview (high-level), then
            detailed flows for Channel booking, Refund, Doctor payment, Ledger, and Other (float, manual journal).
          </p>
        </div>
        <BackButton href="/admin/knowledge-hub" />
      </div>
      <TransactionFlowDiagram />
    </div>
  );
}

