import { channelingApi } from '@/lib/api';
import type {
  // ChannelingPublicStaffDto,
  // ChannelingStaffByIdResponse,
  ChannelingStaffListResponse
} from '@/types/channeling-staff';

export const CHANNELING_STAFF_PAGE_SIZE = Number(process.env.DEFAULT_PAGE_SIZE ?? 100);
export const CHANNELING_STAFF_PAGE_INDEX = Number(process.env.DEFAULT_PAGE ?? 0);

function channelingAuthErrorMessage(status: number): string | undefined {
  if (status !== 401) return undefined;

  return (
    'Channeling rejected the API credentials. Verify CHANNELING_API_CLIENT_ID and ' +
    'CHANNELING_API_CLIENT_SECRET in HRM .env match an active, unblocked API client in ' +
    'Channeling Admin (with an acting user configured).'
  );
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
    searchParams: {
      page: params.page ?? String(CHANNELING_STAFF_PAGE_INDEX),
      limit: params.limit ?? String(CHANNELING_STAFF_PAGE_SIZE),
      keyword: params.keyword ?? ''
    },
    cache: 'no-store'
  });

  if (!result.success) {
    return {
      success: false,
      error: {
        message:
          channelingAuthErrorMessage(result.status) ||
          result.errorDescription ||
          result.error ||
          'Failed to fetch staff from Channeling'
      }
    };
  }

  return { success: true, data: result.data };
}

// NO NEED
/** Fetch a staff by ID from the Channeling public API. */
/* export async function fetchChannelingStaffById(id: string): Promise<{
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
    { cache: 'no-store' }
  );

  if (!result.success) {
    const message =
      result.status === 404
        ? 'Staff not found in Channeling'
        : channelingAuthErrorMessage(result.status) ||
          result.errorDescription ||
          result.error ||
          'Failed to fetch staff from Channeling';

    return { success: false, error: { message } };
  }

  if (!result.data?.staff) {
    return { success: false, error: { message: 'Staff not found in Channeling' } };
  }

  return { success: true, data: result.data.staff };
} */
