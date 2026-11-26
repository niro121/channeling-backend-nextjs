import React, { Suspense } from "react";
import { checkRouteAccess } from "@/lib/server-permissions";
import { redirect } from "next/navigation";
import { SearchInput } from "@/components/common/search";
import ReceiptManagerFilterSection from "./filter-section";
import Loading from "../loading";
import {
  getReceiptListAction,
  getReceiptListExportAction,
} from "@/app/actions/receipt-manager/receipt-manager.actions";
import { getReferenceData } from "@/app/actions/reference/get-reference-data.action";
import { ReceiptManagerTableWithDialog } from "./receipt-manager-view-context";
import { ReceiptManagerToolbar } from "./receipt-manager-toolbar";

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    method?: string;
    locationId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function ReceiptManagerPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess("/receipt-manager");
  if (!canView) {
    redirect("/unauthorized-access");
  }

  const params = await searchParams;

  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;
  const methodParam = params?.method;
  const method =
    methodParam && methodParam !== "__all__" ? Number(methodParam) : undefined;
  const locationIdParam = params?.locationId;
  const locationId =
    locationIdParam && locationIdParam !== "__all__" ? locationIdParam : undefined;

  const listResult = await getReceiptListAction({
    page,
    limit,
    keyword: params?.keyword ?? undefined,
    method,
    locationId,
    dateFrom: params?.dateFrom ?? undefined,
    dateTo: params?.dateTo ?? undefined,
  });

  const refRes = await getReferenceData({ locations: true });
  const locations = refRes.success && refRes.locations ? refRes.locations : [];

  const data = listResult.data ?? [];
  const totalRecords = listResult.totalRecords ?? 0;

  async function handleExport() {
    "use server";
    const res = await getReceiptListExportAction({
      keyword: params?.keyword ?? undefined,
      method,
      locationId,
      dateFrom: params?.dateFrom ?? undefined,
      dateTo: params?.dateTo ?? undefined,
    });
    return res;
  }

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <ReceiptManagerTableWithDialog
          data={data}
          totalRecords={totalRecords}
          page={params?.page}
          limit={params?.limit}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Receipt number..."
                  className="pl-8 w-full h-9"
                />
              </div>
              <ReceiptManagerFilterSection
                method={params?.method}
                locationId={params?.locationId}
                dateFrom={params?.dateFrom}
                dateTo={params?.dateTo}
                locations={locations}
              />
            </div>
          }
          toolbarRight={<ReceiptManagerToolbar serverData={handleExport} />}
        />
      </Suspense>
    </div>
  );
}
