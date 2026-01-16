import React from 'react';
import AgencyBookForm from '../../agencybook-form';
import { getAgencyBookById } from '@/app/actions/agencybook.actions';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const agencyBookData = await getAgencyBookById(id);

  if (!agencyBookData.success || !agencyBookData.data) {
    notFound();
  }

  // ==== GET AGENCIES FOR DROPDOWN ==== //
  const agenciesRes = await getAllAgenciesOptions();
  const agencyOptions =
    agenciesRes?.data?.map((a) => ({ id: a.id as string, name: a.name })) ??
    [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit Agency Book</h2>
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <AgencyBookForm
          agencyBook={agencyBookData.data}
          isEditPage={true}
          agencyOptions={agencyOptions}
        />
      </div>
    </div>
  );
}

