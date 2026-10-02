import React from 'react';
import LocationForm from '../location-form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LOCATION_OPTIONS } from '@/types/location';
import { BackButton } from '@/components/common/back-button';

export default async function AddLocationPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Add New Location</h1>
          <BackButton href="/locations" />
        </div>
        <LocationForm
          location={null}
          locationOptions={LOCATION_OPTIONS}
          isEditPage={false}
          user={{
            id: user?.id,
            name: user?.name || ""
          }}
        />
      </div>
    </div>
  );
}
