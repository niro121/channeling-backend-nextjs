/** Zone DTO returned by Channeling public API (no audit fields). */
export type ChannelingPublicZoneDto = {
  id: string;
  name: string;
  description: string | null;
  /** Channeling Location.id */
  locationId: string;
  /** 0 = unpublish, 1 = publish */
  status: number;
};

export type ChannelingZoneListResponse = {
  zones: ChannelingPublicZoneDto[];
  totalRecords: number;
};

export type ChannelingZoneByIdResponse = {
  zone: ChannelingPublicZoneDto;
};

export type ZoneSyncStats = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
  errors: { id: string; name: string; message: string }[];
};
