import React from 'react';
import AgencyBookForm from '../agencybook-form';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';

export default async function Page() {
  // ==== GET AGENCIES FOR DROPDOWN ==== //
  const agenciesRes = await getAllAgenciesOptions();
  const agencyOptions =
    agenciesRes?.data?.map((a) => ({ id: a.id as string, name: a.name })) ??
    [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add Agency Book</h2>
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <AgencyBookForm agencyOptions={agencyOptions} />
      </div>
    </div>
  );
}

