// EXPORT ALL TYPES RELATED TO AGENCYBOOK FROM HERE

export type AgencyBook = {
  id?: string;
  bookNumber: string;
  startNumber: string;
  endNumber: string;
  status?: number | null; // 0 = inactive, 1 = active
  agencyId?: string | null;
  agency?: {
    id: string;
    name: string;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AgencyBookFormValues = {
  bookNumber: string;
  startNumber: string;
  endNumber: string;
  status: number; // 0 = inactive, 1 = active
  agencyId?: string;
};

export type UpdateAgencyBookPayload = Partial<{
  bookNumber: string;
  startNumber: string;
  endNumber: string;
  status: number;
  agencyId?: string;
}>;

export type GetAgencyBooksParams = {
  page?: string;
  limit?: string;
  keyword?: string;
  agencyId?: string; // For filtering by agency
};

export type GetAgencyBooksQuery = {
  page: number;
  limit: number;
  keyword: string;
  agencyId?: string;
};

export type GetAgencyBooksReturn = {
  data: AgencyBook[];
  totalRecords: number;
};

