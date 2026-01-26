import React from 'react';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import RoomForm from '../../room-form';
import { getRoomById, getAllLocations } from '@/app/actions/room.actions';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRoomPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { data, success } = await getRoomById(id);

  if (!success || !data) {
    notFound();
  }

  const locationRes = await getAllLocations();

  const locationOptions =
    locationRes?.data?.map((l) => ({ id: l.id as string, name: l.name })) ?? [];

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6">Edit Room</h1>
        <RoomForm
          room={data}
          locationOptions={locationOptions}
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
