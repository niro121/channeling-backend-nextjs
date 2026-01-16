import React from 'react';
import AgencyForm from '../agency-form';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { getAllLocations } from '@/app/actions/location.action';

export default async function Page() {
  // Get parent agencies for dropdown
  const agenciesRes = await getAllAgenciesOptions();
  const parentAgencies =
    agenciesRes?.data?.map((a) => ({
      id: a.id as string,
      name: a.name
    })) ?? [];

  // Get locations for dropdown
  const locationsRes = await getAllLocations({});
  const locations =
    locationsRes?.data?.map((l) => ({
      id: l.id as string,
      name: l.name
    })) ?? [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add Agency</h2>
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <AgencyForm parentAgencies={parentAgencies} locations={locations} />
      </div>
    </div>
  );
}
