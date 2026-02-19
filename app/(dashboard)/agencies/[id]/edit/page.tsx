import React from 'react';
import AgencyForm from '../../agency-form';
import { getAgencyById, getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { getAllLocations } from '@/app/actions/location.action';
import { notFound } from 'next/navigation';
import { BackButton } from '@/components/common/back-button';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const agencyData = await getAgencyById(id);

  if (!agencyData.success || !agencyData.data) {
    notFound();
  }

  // Get parent agencies for dropdown
  const agenciesRes = await getAllAgenciesOptions();
  const parentAgencies =
    agenciesRes?.data?.map((a) => ({
      id: a.id as string,
      name: a.name
    })) ?? [];

  // Get locations for dropdown (published only)
  const locationsRes = await getAllLocations({ publishedOnly: true });
  const locations =
    locationsRes?.data?.map((l) => ({
      id: l.id as string,
      name: l.name
    })) ?? [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit Agency</h2>
        <BackButton href="/agencies" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <AgencyForm
          agency={agencyData.data}
          parentAgencies={parentAgencies}
          locations={locations}
          isEditPage={true}
        />
      </div>
    </div>
  );
}
