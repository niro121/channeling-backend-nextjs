import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import Loading from '../loading';
import Link from 'next/link';
import {
  bulkDeleteDiscounts,
  getAllDiscounts,
  getDiscountsExport
} from '@/app/actions/discount.action';
import { SelectorFilter } from '@/components/common/selector-filter';
import { DISCOUNT_TYPE_OPTIONS } from '@/types/discount';
import { DisCountColumns } from './columns';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { ExportWrapper } from '../export-wrapper';
import { BulkDeleteButton } from '@/components/common/custom-data-table';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    discountType?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/discounts');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAllDiscounts({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    discountType: params?.discountType
  });

  const handleExport = async () => {
    'use server';

    const discountListResponse = await getDiscountsExport({
      keyword: params?.keyword,
      discountType: params?.discountType
    });

    if (!discountListResponse.success || !discountListResponse.data?.length) {
      return {
        success: false,
        message: discountListResponse.success
          ? 'No discounts found'
          : discountListResponse.message
      };
    }

    const discountTypeMap: Record<number, string> = {
      0: 'Percentage',
      1: 'Fixed Amount',
      2: 'Free Service'
    };

    const mappedDiscounts = discountListResponse.data.map((d: any) => ({
      name: d.name || '-',
      discountType: discountTypeMap[d.discountType] || '-',
      discountValue: d.discountValue || '-',
      discountValueForeign: d.discountValueForeign || '-',
      status: d.status === 1 ? 'Published' : 'Unpublished'
    }));

    return {
      success: true,
      data: mappedDiscounts
    };
  };

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Discounts"
          subHeading="Manage your discounts here."
          columns={DisCountColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteDiscounts}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="relative w-full sm:max-w-sm">
                  <SearchInput
                    name="keyword"
                    placeholder="Search by name, voucher code"
                    className="pl-8 w-full h-9"
                  />
                </div>
                <SelectorFilter
                  label="All Discount Types"
                  options={DISCOUNT_TYPE_OPTIONS}
                  defaultValue="__all__"
                  keyword="discountType"
                  initialId={params?.discountType}
                />
              </div>
              <div className="flex items-center">
                <ExportWrapper
                  serverData={handleExport}
                  columns={['Discount Name', 'Discount Type', 'Discount Value', 'Discount Foreign Value', 'Status']}
                  keys={['name', 'discountType', 'discountValue', 'discountValueForeign', 'status']}
                  title="Discounts List"
                  fileName="discounts"
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
              <Link href="/discounts/add">
                <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add New
                  </span>
                </Button>
              </Link>
            </div>
          }
          hideAutoBulkDelete={true}
        />
      </Suspense>
    </div>
  );
}
