import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllLocations, getAllZonesByLocaionID } from '@/app/actions/room.actions';
import RoomForm from '../room-form';
import { BackButton } from '@/components/common/back-button';

export default async function AddRoomPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const locationRes = await getAllLocations();

  const locationOptions =
    locationRes?.data?.map((l) => ({ id: l.id as string, name: l.name })) ?? [];

  const zonesByLocation: Record<string, { id: string; name: string }[]> = {};
  if (locationOptions.length > 0) {
    const zoneResults = await Promise.all(
      locationOptions.map((loc) =>
        getAllZonesByLocaionID(loc.id).then((res) => ({ locationId: loc.id, res }))
      )
    );
    zoneResults.forEach(({ locationId, res }) => {
      if (res.success && res.data?.length) {
        zonesByLocation[locationId] = res.data.map((z) => ({ id: z.id, name: z.name }));
      }
    });
  }

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
          initialZonesByLocation={Object.keys(zonesByLocation).length > 0 ? zonesByLocation : undefined}
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
