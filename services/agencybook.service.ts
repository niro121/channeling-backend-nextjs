'use server';

import prisma from '@/lib/prisma';
import {
  GetAgencyBooksQuery,
  GetAgencyBooksReturn,
  AgencyBook,
  AgencyBookFormValues,
  UpdateAgencyBookPayload
} from '@/types/agencybook';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// ==== AGENCY BOOK: VALIDATION SCHEMA ==== //
const agencyBookSchema = z.object({
  bookNumber: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  startNumber: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  endNumber: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Inactive (0) or Active (1)'
    }),
  agencyId: z.string().optional().nullable()
});

const agencyBookUpdateSchema = agencyBookSchema.partial().extend({
  id: z.string().min(1, 'Agency Book ID is required')
});

type agencyBookInput = z.infer<typeof agencyBookSchema>;

// ==== GET ALL AGENCY BOOKS ==== //
export const getAllAgencyBooksService = async ({
  page,
  limit,
  keyword,
  agencyId
}: GetAgencyBooksQuery): Promise<{
  success: boolean;
  data?: {
    records: any[];
    totalRecords: number;
  };
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  const validLimit = limit > 0 ? limit : 10;
  const skip = page * validLimit;

  try {
    const whereClause: Prisma.AgencyBookWhereInput = {};

    // Add keyword search
    if (keyword && keyword.trim() !== '') {
      whereClause.OR = [
        {
          bookNumber: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          startNumber: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          endNumber: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ];
    }

    // Add agency filter
    if (agencyId && agencyId !== '__all__') {
      whereClause.agencyId = agencyId;
    }

    const records = await prisma.agencyBook.findMany({
      skip: skip,
      take: validLimit,
      where: whereClause,
      include: {
        agency: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.agencyBook.count({
      where: whereClause
    });

    return {
      success: true,
      data: {
        records,
        totalRecords
      },
      message: 'Agency books fetched successfully'
    };
  } catch (error: any) {
    console.log('getAllAgencyBooksService error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch agency books'
      }
    };
  }
};

// ==== GET ONE AGENCY BOOK ==== //
export const getAgencyBookByIdService = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    if (!id) {
      return {
        success: false,
        error: {
          message: 'Invalid agency book ID'
        }
      };
    }

    const agencyBook = await prisma.agencyBook.findUnique({
      where: { id: id },
      include: {
        agency: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!agencyBook) {
      return {
        success: false,
        error: {
          message: 'Agency book not found'
        }
      };
    }

    return {
      success: true,
      data: agencyBook,
      message: 'Agency book fetched successfully'
    };
  } catch (error: any) {
    console.log('getAgencyBookByIdService error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get agency book'
      }
    };
  }
};

// ==== CREATE AGENCY BOOK ==== //
export const createAgencyBookService = async (
  payload: AgencyBookFormValues,
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
    issues?: any;
  };
}> => {
  try {
    const parsed = agencyBookSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors
        }
      };
    }

    const data = parsed.data;

    // Validate agencyId if provided
    const isValidObjectId = (id: string | undefined): boolean => {
      if (!id || id === '' || id.startsWith('temp-')) {
        return false;
      }
      return /^[0-9a-fA-F]{24}$/.test(id);
    };

    const agencyRelation = data.agencyId && isValidObjectId(data.agencyId)
      ? { connect: { id: data.agencyId } }
      : undefined;

    // Use relation syntax for user connections (required when relations are defined)
    const createdUserRelation = user?.id && isValidObjectId(user.id)
      ? { connect: { id: user.id } }
      : undefined;
    
    const updatedUserRelation = user?.id && isValidObjectId(user.id)
      ? { connect: { id: user.id } }
      : undefined;

    const agencyBook = await prisma.agencyBook.create({
      data: {
        bookNumber: data.bookNumber,
        startNumber: data.startNumber,
        endNumber: data.endNumber,
        status: data.status,
        agency: agencyRelation,
        ...(createdUserRelation && { createdUser: createdUserRelation }),
        ...(updatedUserRelation && { updatedUser: updatedUserRelation })
      },
      include: {
        agency: {
          select: {
            id: true,
            name: true
          }
        },
        createdUser: true,
        updatedUser: true
      }
    });

    return {
      success: true,
      data: agencyBook,
      message: 'Agency book created successfully'
    };
  } catch (error: any) {
    console.error('createAgencyBookService error:', error);

    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: error.meta?.target
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create agency book'
      }
    };
  }
};

// ==== UPDATE AGENCY BOOK ==== //
export const updateAgencyBookService = async (
  id: string,
  payload: UpdateAgencyBookPayload,
  user?: { id?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
    issues?: any;
  };
}> => {
  try {
    const parsed = agencyBookUpdateSchema.safeParse({
      ...payload,
      id
    });

    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors
        }
      };
    }

    const data = parsed.data;

    // Validate agencyId if provided
    const isValidObjectId = (id: string | undefined): boolean => {
      if (!id || id === '' || id.startsWith('temp-')) {
        return false;
      }
      return /^[0-9a-fA-F]{24}$/.test(id);
    };

    const agencyRelation =
      data.agencyId !== undefined
        ? data.agencyId && isValidObjectId(data.agencyId)
          ? { connect: { id: data.agencyId } }
          : { disconnect: true }
        : undefined;

    // Use relation syntax for updatedUser (required when relations are defined)
    const updatedUserRelation = user?.id && isValidObjectId(user.id)
      ? { connect: { id: user.id } }
      : undefined;

    const agencyBook = await prisma.agencyBook.update({
      where: { id },
      data: {
        ...(data.bookNumber !== undefined && { bookNumber: data.bookNumber }),
        ...(data.startNumber !== undefined && { startNumber: data.startNumber }),
        ...(data.endNumber !== undefined && { endNumber: data.endNumber }),
        ...(data.status !== undefined && { status: data.status }),
        ...(agencyRelation && { agency: agencyRelation }),
        ...(updatedUserRelation && { updatedUser: updatedUserRelation }),
        updatedAt: new Date()
      },
      include: {
        agency: {
          select: {
            id: true,
            name: true
          }
        },
        createdUser: true,
        updatedUser: true
      }
    });

    return {
      success: true,
      data: agencyBook,
      message: 'Agency book updated successfully'
    };
  } catch (error: any) {
    console.error('updateAgencyBookService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Agency book not found'
        }
      };
    }

    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: error.meta?.target
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update agency book'
      }
    };
  }
};

// ==== DELETE ONE AGENCY BOOK ==== //
export const deleteAgencyBookByIdService = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    const agencyBook = await prisma.agencyBook.delete({
      where: {
        id: id
      }
    });

    return {
      success: true,
      data: agencyBook,
      message: 'Agency book deleted successfully'
    };
  } catch (error: any) {
    console.log('deleteAgencyBookByIdService error', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Agency book not found'
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete agency book'
      }
    };
  }
};

// ==== DELETE BULK AGENCY BOOKS ==== //
export const bulkDeleteAgencyBooksService = async (
  ids: string[]
): Promise<{
  success: boolean;
  data?: {
    count: number;
  };
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        error: {
          message: 'No agency book IDs provided'
        }
      };
    }

    const result = await prisma.agencyBook.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    if (result.count === 0) {
      return {
        success: false,
        error: {
          message: 'No agency books found to delete'
        }
      };
    }

    return {
      success: true,
      data: {
        count: result.count
      },
      message: `${result.count} agency book(s) deleted successfully`
    };
  } catch (error: any) {
    console.log('bulkDeleteAgencyBooksService error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete agency books'
      }
    };
  }
};

