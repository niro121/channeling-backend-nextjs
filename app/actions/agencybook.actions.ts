'use server';

import {
  getAllAgencyBooksService,
  getAgencyBookByIdService,
  createAgencyBookService,
  updateAgencyBookService,
  deleteAgencyBookByIdService,
  bulkDeleteAgencyBooksService
} from '@/services/agencybook.service';
import {
  GetAgencyBooksParams,
  GetAgencyBooksQuery,
  AgencyBookFormValues,
  UpdateAgencyBookPayload,
  AgencyBook
} from '@/types/agencybook';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';

// ==== GET ALL AGENCY BOOKS ==== //
export const getAllAgencyBooks = async (params: GetAgencyBooksParams) => {
  // Check view permission
  await requirePermission('agency-books', 'view');

  try {
    const query: GetAgencyBooksQuery = {
      page: params.page ? parseInt(params.page) : 0,
      limit: params.limit
        ? parseInt(params.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: params.keyword ?? '',
      agencyId: params.agencyId
    };

    const response = await getAllAgencyBooksService(query);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch agency books',
        data: [],
        totalRecords: 0
      };
    }

    return {
      success: true,
      data: response.data?.records ?? [],
      totalRecords: response.data?.totalRecords ?? 0,
      message: response.message
    };
  } catch (error: any) {
    console.error('getAllAgencyBooks action error:', error);
    return {
      success: false,
      message: error.message || 'Error getting agency books. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE AGENCY BOOK ==== //
export const getAgencyBookById = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await getAgencyBookByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Failed to fetch agency book'
        }
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('getAgencyBookById action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== CREATE AGENCY BOOK ==== //
export const createAgencyBook = async (
  payload: AgencyBookFormValues
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  isError?: boolean;
  errors?: {
    message?: string;
    issues?: any;
  };
}> => {
  // Check add permission
  await requirePermission('agency-books', 'add');

  try {
    // Get current user from session
    const session = await fetchServerSession();
    const user = session?.user?.id
      ? { id: session.user.id, name: session.user.name || undefined }
      : undefined;

    const result = await createAgencyBookService(payload, user);

    if (!result.success) {
      return {
        success: false,
        isError: true,
        errors: result.error || {
          message: result.message || 'Agency book creation failed'
        }
      };
    }

    revalidatePath('/agency-books');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Agency book created successfully',
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('createAgencyBook action error:', error);

    return {
      success: false,
      isError: true,
      data: null,
      errors: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== UPDATE AGENCY BOOK ==== //
export const updateAgencyBook = async (
  id: string,
  payload: UpdateAgencyBookPayload
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  isError?: boolean;
  errors?: {
    message?: string;
    issues?: any;
  };
}> => {
  // Check edit permission
  await requirePermission('agency-books', 'edit');

  try {
    // Get current user from session
    const session = await fetchServerSession();
    const user = session?.user?.id
      ? { id: session.user.id, name: session.user.name || undefined }
      : undefined;

    const result = await updateAgencyBookService(id, payload, user);

    if (!result.success) {
      return {
        success: false,
        isError: true,
        errors: result.error || {
          message: result.message || 'Agency book update failed'
        }
      };
    }

    revalidatePath('/agency-books');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Agency book updated successfully',
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('updateAgencyBook action error:', error);

    return {
      success: false,
      isError: true,
      data: null,
      errors: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE AGENCY BOOK ==== //
export const deleteAgencyBook = async (id: string) => {
  // Check delete permission
  await requirePermission('agency-books', 'delete');

  try {
    const result = await deleteAgencyBookByIdService(id);

    if (!result.success) {
      return {
        success: false,
        isError: true,
        errors: result.error
      };
    }

    revalidatePath('/agency-books');

    return {
      success: true,
      message: result.message,
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteAgencyBook action error:', error);

    return {
      success: false,
      isError: true,
      errors: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== BULK DELETE AGENCY BOOKS ==== //
export const bulkDeleteAgencyBooks = async (ids: string[]) => {
  // Check delete permission
  await requirePermission('agency-books', 'delete');

  try {
    const result = await bulkDeleteAgencyBooksService(ids);

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete agency books');
    }

    revalidatePath('/agency-books');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteAgencyBooks action error:', error);
    throw error;
  }
};

// ==== AGENCY BOOKS EXPORT ==== //
export const getAgencyBooksExport = async (params: { keyword?: string; agencyId?: string }) => {
  try {
    const response = await getAllAgencyBooks({
      page: "0",
      limit: "10000", // Get all records
      keyword: params.keyword ?? "",
      agencyId: params.agencyId
    });

    if (!response.success || !response.data?.length) {
      return {
        success: false,
        message: response.success ? 'No agency books found' : response.message || 'Error getting data'
      };
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.log('getAgencyBooksExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};