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
import { Prisma } from '@prisma/client';

// ==== GET ALL AGENCY BOOKS ==== //
export const getAllAgencyBooks = async (params: GetAgencyBooksParams) => {
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

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getAllAgencyBooks error', error);
    return {
      success: false,
      message: error.message || 'Error getting agency books',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE AGENCY BOOK ==== //
export const getAgencyBookById = async (id: string) => {
  try {
    const response = await getAgencyBookByIdService(id);

    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.log('getAgencyBookById error', error);
    return {
      success: false,
      message: error.message || 'Error getting agency book',
      data: null
    };
  }
};

// ==== CREATE AGENCY BOOK ==== //
export const createAgencyBook = async (
  payload: AgencyBookFormValues,
  user?: { id?: string; name?: string }
) => {
  try {
    // Filter out temporary agency IDs (starting with "temp-") and empty strings
    // Only include agencyId if it's a valid ObjectID format
    const isValidObjectId = (id: string | undefined): boolean => {
      if (!id || id === '' || id.startsWith('temp-')) {
        return false;
      }
      // MongoDB ObjectID is 24 hex characters
      return /^[0-9a-fA-F]{24}$/.test(id);
    };

    const data: Prisma.AgencyBookCreateInput = {
      bookNumber: payload.bookNumber,
      startNumber: payload.startNumber,
      endNumber: payload.endNumber,
      status: payload.status,
      ...(isValidObjectId(payload.agencyId)
        ? { agency: { connect: { id: payload.agencyId } } }
        : {})
    };

    const result = await createAgencyBookService(data);

    revalidatePath('/agency-books');

    return {
      success: true,
      data: result,
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('createAgencyBook error', error);

    return {
      success: false,
      isError: true,
      data: null,
      errors: {
        message: error.message || 'Failed to create agency book'
      }
    };
  }
};

// ==== UPDATE AGENCY BOOK ==== //
export const updateAgencyBook = async (
  id: string,
  payload: UpdateAgencyBookPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    // Filter out temporary agency IDs (starting with "temp-") and empty strings
    const isValidObjectId = (id: string | undefined): boolean => {
      if (!id || id === '' || id.startsWith('temp-')) {
        return false;
      }
      // MongoDB ObjectID is 24 hex characters
      return /^[0-9a-fA-F]{24}$/.test(id);
    };

    const data: Prisma.AgencyBookUpdateInput = {
      updatedAt: new Date()
    };

    if (payload.bookNumber !== undefined) data.bookNumber = payload.bookNumber;
    if (payload.startNumber !== undefined)
      data.startNumber = payload.startNumber;
    if (payload.endNumber !== undefined) data.endNumber = payload.endNumber;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.agencyId !== undefined) {
      if (isValidObjectId(payload.agencyId)) {
        data.agency = { connect: { id: payload.agencyId } };
      } else {
        data.agency = { disconnect: true };
      }
    }

    const result = await updateAgencyBookService(id, data);

    revalidatePath('/agency-books');

    return {
      success: true,
      data: result,
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('updateAgencyBook error', error);

    return {
      success: false,
      isError: true,
      data: null,
      errors: {
        message: error.message || 'Failed to update agency book'
      }
    };
  }
};

// ==== DELETE AGENCY BOOK ==== //
export const deleteAgencyBook = async (id: string) => {
  try {
    await deleteAgencyBookByIdService(id);

    revalidatePath('/agency-books');

    return {
      success: true,
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteAgencyBook error', error);
    return {
      success: false,
      isError: true,
      errors: {
        message: error.message || 'Failed to delete agency book'
      }
    };
  }
};

// ==== BULK DELETE AGENCY BOOKS ==== //
export const bulkDeleteAgencyBooks = async (ids: string[]) => {
  try {
    await bulkDeleteAgencyBooksService(ids);

    revalidatePath('/agency-books');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteAgencyBooks error', error);
    return false;
  }
};

