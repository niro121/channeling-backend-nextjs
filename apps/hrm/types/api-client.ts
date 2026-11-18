export type {
  PublicApiScopeId
} from '@/lib/permissions';

export type ApiClientRecord = {
  id: string;
  clientId: string;
  name: string;
  isBlocked: boolean;
  actingUserId: string;
  actingUserName: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
};

export type ApiClientCreatePayload = {
  name: string;
  actingUserId: string;
  scopes?: string[];
};

export type ApiClientUpdatePayload = {
  name?: string;
  isBlocked?: boolean;
  actingUserId: string;
  scopes?: string[];
};

export type GetApiClientsParams = {
  page?: string;
  limit?: string;
  keyword?: string;
};

export type GetApiClientsQuery = {
  page: number;
  limit: number;
  keyword: string;
};
