'use server';

import { channelingApi } from '@/lib/api';
import type {
  ChannelingPublicStaffDto,
  ChannelingStaffByIdResponse,
  ChannelingStaffListResponse
} from '@/types/channeling-staff';

const DEFAULT_PAGE_SIZE = Number(process.env.DEFAULT_PAGE_SIZE ?? 100);

/** Get the auth options for the Channeling public API. */
function getAuthOptions(): { token: string } | { auth: true } {
  const token = process.env.HRM_CLIENT_TOKEN?.trim();
  if (token) {
    return { token };
  }
  return { auth: true };
}

/** Fetch a list of staff from the Channeling public API. */
export async function fetchChannelingStaffList(params: {
  page?: string | number;
  limit?: string | number;
  keyword?: string;
}): Promise<{
  success: boolean;
  data?: ChannelingStaffListResponse;
  error?: { message?: string };
}> {
  const result = await channelingApi.get<ChannelingStaffListResponse>('/api/public/staff', {
    ...getAuthOptions(),
    searchParams: {
      page: params.page ?? '1',
      limit: params.limit ?? String(DEFAULT_PAGE_SIZE),
      keyword: params.keyword ?? ''
    },
    cache: 'no-store'
  });

  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.errorDescription || result.error || 'Failed to fetch staff from Channeling'
      }
    };
  }

  return { success: true, data: result.data };
}

/** Fetch a staff by ID from the Channeling public API. */
export async function fetchChannelingStaffById(id: string): Promise<{
  success: boolean;
  data?: ChannelingPublicStaffDto;
  error?: { message?: string };
}> {
  const trimmed = id?.trim();
  if (!trimmed) {
    return { success: false, error: { message: 'Staff id is required' } };
  }

  const result = await channelingApi.get<ChannelingStaffByIdResponse>(
    `/api/public/staff/${encodeURIComponent(trimmed)}`,
    {
      ...getAuthOptions(),
      cache: 'no-store'
    }
  );

  if (!result.success) {
    const message =
      result.status === 404
        ? 'Staff not found in Channeling'
        : result.errorDescription || result.error || 'Failed to fetch staff from Channeling';

    return { success: false, error: { message } };
  }

  if (!result.data?.staff) {
    return { success: false, error: { message: 'Staff not found in Channeling' } };
  }

  return { success: true, data: result.data.staff };
}

/** Fetch every staff page from Channeling public API. */
export async function fetchAllChannelingStaff(keyword = ''): Promise<{
  success: boolean;
  data?: ChannelingPublicStaffDto[];
  error?: { message?: string };
}> {
  const allStaff: ChannelingPublicStaffDto[] = [];
  let page = 1;
  let totalRecords = 0;

  while (true) {
    const result = await fetchChannelingStaffList({
      page,
      limit: DEFAULT_PAGE_SIZE,
      keyword
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: { message: result.error?.message ?? 'Failed to fetch staff from Channeling' }
      };
    }

    const { staff, totalRecords: total } = result.data;
    totalRecords = total;
    allStaff.push(...staff);

    if (allStaff.length >= totalRecords || staff.length === 0) {
      break;
    }

    page += 1;
  }

  return { success: true, data: allStaff };
}
