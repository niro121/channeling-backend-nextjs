import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from '@/components/icons';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import Loading from '../loading';
import Link from 'next/link';
import {
  bulkDeleteDiscounts,
  getAllDiscounts
} from '@/app/actions/discount.action';
import { SelectorFilter } from '@/components/common/selector-filter';
import { DISCOUNT_TYPE_OPTIONS } from '@/types/discount';
import { DisCountColumns } from './columns';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    discountType?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const params = await searchParams;

  const { data, totalRecords } = await getAllDiscounts({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    discountType: params?.discountType
  });

  return (
    <>
      <div className="flex items-center ">
        <div className="ml-auto flex items-center gap-4">
          <div className="lg:block hidden relative flex-1 md:grow-0">
            <SearchInput
              name="keyword"
              placeholder={'Search by name, voucher code'}
              className={'rounded-lg bg-background pl-8 w-full sm:w-auto'}
            />
          </div>
          <Link href="/discounts/add">
            <Button
              size="sm"
              className="gap-1 px-8 text-white transition-colors ease-in-out duration-100 hover:text-black"
            >
              <PlusCircle />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add New
              </span>
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-2 flex flex-col lg:flex-row gap-3 items-start">
        <div className="lg:hidden relative flex-1 md:grow-0">
          <SearchInput
            name="keyword"
            placeholder={'Search by name, voucher code'}
            className={'rounded-lg bg-background pl-8 w-full'}
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
          />
        </Suspense>
      </div>
    </>
  );
}
