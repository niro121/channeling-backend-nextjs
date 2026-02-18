import React from 'react';
import { notFound } from 'next/navigation';
import LocationForm from '../../location-form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLocationById } from '@/app/actions/location.action';
import { LOCATION_OPTIONS } from '@/types/location';
import { BackButton } from '@/components/common/back-button';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditLocationPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { data, success } = await getLocationById(id);

  if (!success || !data) {
    notFound();
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Location</h1>
          <BackButton href="/locations" />
        </div>
        <LocationForm
          location={data}
          locationOptions={LOCATION_OPTIONS}
          isEditPage={true}
          user={{
            id: user?.id,
            name: user?.name || ''
          }}
        />
      </div>
    </div>
  );
}
