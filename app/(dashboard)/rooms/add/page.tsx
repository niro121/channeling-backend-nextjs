import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllLocations } from '@/app/actions/room.actions';
import RoomForm from '../room-form';
import { BackButton } from '@/components/common/back-button';

export default async function AddDoctorPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const locationRes = await getAllLocations();

  const locationOptions =
    locationRes?.data?.map((l) => ({ id: l.id as string, name: l.name })) ?? [];

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Add New Room</h1>
          <BackButton href="/rooms" />
        </div>
        <RoomForm
          room={null}
          locationOptions={locationOptions}
          isEditPage={false}
          user={{
            id: user?.id,
            name: user?.name || ''
          }}
        />
      </div>
    </div>
  );
}
