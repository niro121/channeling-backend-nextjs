import React, { Suspense } from "react";
import Link from "next/link";
import { checkRouteAccess, checkPermission } from "@/lib/server-permissions";
import { redirect } from "next/navigation";
import { SearchInput } from "@/components/common/search";
import { CustomDataTable } from "@/components/common/custom-data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DoctorPaymentColumns } from "./columns";
import DoctorPaymentFilterSection from "./filter-section";
import Loading from "../loading";
import { getDoctorPaymentList } from "@/app/actions/doctor-payment/doctor-payment.actions";
import { getReferenceData } from "@/app/actions/reference/get-reference-data.action";

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    doctorPaymentNo?: string;
    locationId?: string;
    paymentMethod?: string;
    doctorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function DoctorPaymentsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess("/doctor-payments");
  if (!canView) {
    redirect("/unauthorized-access");
  }

  const canAdd = await checkPermission("doctor-payments", "add");
  const params = await searchParams;

  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;
  const listResult = await getDoctorPaymentList({
    page,
    limit,
    keyword: params?.keyword ?? undefined,
    doctorPaymentNo: params?.doctorPaymentNo ?? undefined,
    locationId: params?.locationId ?? undefined,
    paymentMethod: params?.paymentMethod ? Number(params.paymentMethod) : undefined,
    doctorId: params?.doctorId ?? undefined,
    dateFrom: params?.dateFrom ?? undefined,
    dateTo: params?.dateTo ?? undefined,
  });

  const refRes = await getReferenceData({ locations: true, doctors: true });
  const locations = refRes.success && refRes.locations ? refRes.locations : [];
  const doctors = refRes.success && refRes.doctors ? refRes.doctors : [];

  const data = listResult.data ?? [];
  const totalRecords = listResult.totalRecords ?? 0;

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Doctor Payment Manager"
          subHeading="View and print consultant payments. Use filters and search to find payments."
          columns={DoctorPaymentColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={params?.page}
          limit={params?.limit}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Patient name or Bill No."
                  className="pl-8 w-full h-9"
                />
              </div>
              <DoctorPaymentFilterSection
                locationId={params?.locationId}
                paymentMethod={params?.paymentMethod}
                doctorId={params?.doctorId}
                dateFrom={params?.dateFrom}
                dateTo={params?.dateTo}
                locations={locations}
                doctors={doctors}
              />
            </div>
          }
          toolbarRight={
            canAdd ? (
              <Link href="/doctor-payments/make">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Make Doctor Payment
                </Button>
              </Link>
            ) : null
          }
        />
      </Suspense>
    </div>
  );
}
