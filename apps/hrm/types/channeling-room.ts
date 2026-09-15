/** Room DTO returned by Channeling public API (no audit or occupancy fields). */
export type ChannelingPublicRoomDto = {
  id: string;
  number: string;
  description: string;
  /** 0 = unpublish, 1 = publish */
  status: number;
  /** Channeling Location.id */
  locationId: string;
  /** Channeling Zone.id */
  zoneId: string;
};

export type ChannelingRoomListResponse = {
  rooms: ChannelingPublicRoomDto[];
  totalRecords: number;
};

export type ChannelingRoomByIdResponse = {
  room: ChannelingPublicRoomDto;
};

export type RoomSyncStats = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
  errors: { id: string; name: string; message: string }[];
};
