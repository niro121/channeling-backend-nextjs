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
/** Schema for creating an agency book: agency is required. */
const agencyBookCreateSchema = z.object({
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
  agencyId: z
    .string()
    .min(1, 'Agency is required')
    .refine((id) => !id.startsWith('temp-'), { message: 'Please select a valid agency' })
});

/** Schema for update: all fields optional; if agencyId is provided it must be non-empty. */
const agencyBookUpdateSchema = agencyBookCreateSchema.partial().extend({
  id: z.string().min(1, 'Agency Book ID is required'),
  agencyId: z.string().min(1, 'Agency is required').optional()
});

type agencyBookCreateInput = z.infer<typeof agencyBookCreateSchema>;

/**
 * Bookings store agencyRef as bookNumber + 2-digit leaf (e.g. R0001 + 01 → R000101).
 * Returns true when at least one active booking (status 0/1) uses this agency book.
 * Canceled bookings (status 2) are ignored so delete stays consistent with leaf availability.
 */
async function agencyBookHasAssociatedBookings(
  bookNumber: string,
  agencyId: string | null | undefined
): Promise<boolean> {
  const trimmedBook = bookNumber.trim();
  if (!trimmedBook) return false;

  const candidates = await prisma.booking.findMany({
    where: {
      ...(agencyId ? { agencyId } : {}),
      status: { in: [0, 1] },
      agencyRef: { startsWith: trimmedBook },
    },
    select: { agencyRef: true },
    take: 100,
  });

  return candidates.some((b) => {
    const ref = (b.agencyRef ?? "").trim();
    // Exact book match: prefix = bookNumber, suffix = exactly 2 chars (leaf)
    return ref.length === trimmedBook.length + 2 && ref.startsWith(trimmedBook);
  });
}

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
        },
        createdUser: { select: { id: true, name: true } },
        updatedUser: { select: { id: true, name: true } }
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
    const parsed = agencyBookCreateSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: parsed.error.issues?.[0]?.message ?? 'Validation failed',
          issues: parsed.error.flatten().fieldErrors
        }
      };
    }

    const data = parsed.data;

    const isValidObjectId = (id: string): boolean =>
      /^[0-9a-fA-F]{24}$/.test(id);

    if (!isValidObjectId(data.agencyId)) {
      return {
        success: false,
        error: {
          message: 'Agency is required',
          issues: { agencyId: ['Please select a valid agency'] }
        }
      };
    }

    const agencyExists = await prisma.agency.findUnique({
      where: { id: data.agencyId },
      select: { id: true }
    });
    if (!agencyExists) {
      return {
        success: false,
        error: {
          message: 'Selected agency does not exist',
          issues: { agencyId: ['Please select a valid agency'] }
        }
      };
    }

    const agencyRelation = { connect: { id: data.agencyId } };

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

    const isValidObjectId = (id: string | undefined): boolean =>
      !!id && id !== '' && !id.startsWith('temp-') && /^[0-9a-fA-F]{24}$/.test(id);

    let agencyRelation: { connect: { id: string } } | { disconnect: true } | undefined;
    if (data.agencyId !== undefined) {
      if (data.agencyId && isValidObjectId(data.agencyId)) {
        const agencyExists = await prisma.agency.findUnique({
          where: { id: data.agencyId },
          select: { id: true }
        });
        if (!agencyExists) {
          return {
            success: false,
            error: {
              message: 'Selected agency does not exist',
              issues: { agencyId: ['Please select a valid agency'] }
            }
          };
        }
        agencyRelation = { connect: { id: data.agencyId } };
      } else {
        agencyRelation = { disconnect: true };
      }
    }

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
    const existing = await prisma.agencyBook.findUnique({
      where: { id },
      select: { id: true, bookNumber: true, agencyId: true },
    });

    if (!existing) {
      return {
        success: false,
        error: {
          message: 'Agency book not found',
        },
      };
    }

    if (await agencyBookHasAssociatedBookings(existing.bookNumber, existing.agencyId)) {
      return {
        success: false,
        error: {
          message:
            'Cannot delete this agency book because there is at least one active booking associated with it.',
        },
      };
    }

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
    skipped?: string[];
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

    const normalizedIds = ids.map((id) => String(id));
    const books = await prisma.agencyBook.findMany({
      where: { id: { in: normalizedIds } },
      select: { id: true, bookNumber: true, agencyId: true },
    });

    const blocked: { id: string; bookNumber: string }[] = [];
    const deletableIds: string[] = [];

    for (const book of books) {
      if (await agencyBookHasAssociatedBookings(book.bookNumber, book.agencyId)) {
        blocked.push({ id: book.id, bookNumber: book.bookNumber });
      } else {
        deletableIds.push(book.id);
      }
    }

    if (deletableIds.length === 0) {
      const bookNumbers = blocked.map((b) => b.bookNumber).join(', ');
      return {
        success: false,
        error: {
          message: bookNumbers
            ? `Cannot delete agency book(s) that have active bookings: ${bookNumbers}`
            : 'No agency books found to delete',
        },
      };
    }

    const result = await prisma.agencyBook.deleteMany({
      where: {
        id: {
          in: deletableIds
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

    let message = `${result.count} agency book(s) deleted successfully`;
    if (blocked.length > 0) {
      const skippedNumbers = blocked.map((b) => b.bookNumber).join(', ');
      message += `. ${blocked.length} agency book(s) skipped (have active bookings): ${skippedNumbers}`;
    }

    return {
      success: true,
      data: {
        count: result.count,
        skipped: blocked.map((b) => b.id),
      },
      message,
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

