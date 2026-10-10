import { channelingApi } from '@/lib/api';
import type {
  ChannelingDepartmentListResponse,
  ChannelingPublicDepartmentDto
} from '@/types/channeling-department';

export const CHANNELING_DEPARTMENT_PAGE_SIZE = Number(
  process.env.DEFAULT_PAGE_SIZE ?? 100
);
/** Public department API uses 1-based pages. */
export const CHANNELING_DEPARTMENT_PAGE_START = 1;

function channelingAuthErrorMessage(status: number): string | undefined {
  if (status !== 401) return undefined;

  return (
    'Channeling rejected the API credentials. Verify CHANNELING_API_CLIENT_ID and ' +
    'CHANNELING_API_CLIENT_SECRET in HRM .env match an active, unblocked API client in ' +
    'Channeling Admin (with an acting user configured).'
  );
}

/** Fetch a page of departments from the Channeling public API. */
export async function fetchChannelingDepartmentList(params: {
  page?: string | number;
  limit?: string | number;
  keyword?: string;
}): Promise<{
  success: boolean;
  data?: ChannelingDepartmentListResponse;
  error?: { message?: string };
}> {
  const result = await channelingApi.get<ChannelingDepartmentListResponse>(
    '/api/public/departments',
    {
      searchParams: {
        page: params.page ?? String(CHANNELING_DEPARTMENT_PAGE_START),
        limit: params.limit ?? String(CHANNELING_DEPARTMENT_PAGE_SIZE),
        keyword: params.keyword ?? ''
      },
      cache: 'no-store'
    }
  );

  if (!result.success) {
    return {
      success: false,
      error: {
        message:
          channelingAuthErrorMessage(result.status) ||
          result.errorDescription ||
          result.error ||
          'Failed to fetch departments from Channeling'
      }
    };
  }

  return { success: true, data: result.data };
}

export type { ChannelingPublicDepartmentDto };
