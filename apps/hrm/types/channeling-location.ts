/** Location DTO returned by Channeling public API (no audit or GL fields). */
export type ChannelingPublicLocationDto = {
  id: string;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  /** 1 = Main Location, 2 = Branch, 3 = Collection Center */
  branchType: number;
  /** 0 = unpublish, 1 = publish */
  status: number;
  order: number;
  color: string | null;
};

export type ChannelingLocationListResponse = {
  locations: ChannelingPublicLocationDto[];
  totalRecords: number;
};

export type ChannelingLocationByIdResponse = {
  location: ChannelingPublicLocationDto;
};

export type LocationSyncStats = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
  errors: { id: string; name: string; message: string }[];
};
