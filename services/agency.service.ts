'use server';

import prisma from '@/lib/prisma';
import {
  GetAgenciesQuery,
  GetAgenciesReturn,
  Agency,
  AgencyFormValues,
  UpdateAgencyPayload
} from '@/types/agency';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { sriLankaPhoneRegex, sriLankaMobileRegex } from '@/lib/regex';
import { getNextSequenceNumber } from '@/services/channel-booking/helpers/sequence';
import { createAccount } from '@/services/accounting/account.service';
import { getAccountBalance } from '@/services/accounting/balance-calc.service';

// ==== AGENCY: VALIDATION SCHEMA ==== //
const agencySchema = z.object({
  name: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  chequePrintingName: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  allowedCreditLimit: z
    .number()
    .min(0, 'Must be 0 or greater')
    .refine((val) => val >= 0, 'Allowed credit limit must be 0 or greater'),
  contactPersonName: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  phone: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || val.trim() === '' || sriLankaPhoneRegex.test(val),
      'Phone Number Ex: 07x xxxxxxx'
    ),
  mobile: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || val.trim() === '' || sriLankaMobileRegex.test(val),
      'Mobile Number Ex: 07x xxxxxxx'
    ),
  fax: z.string().optional().nullable(),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .nullable()
    .or(z.literal('')), // Allows empty string for optional email
  website: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  contactPersonPhone: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || val.trim() === '' || sriLankaPhoneRegex.test(val),
      'Phone Number Ex: 07x xxxxxxx'
    ),
  contactPersonMobile: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || val.trim() === '' || sriLankaMobileRegex.test(val),
      'Mobile Number Ex: 07x xxxxxxx'
    ),
  contactPersonEmail: z
    .string()
    .email('Invalid email format')
    .optional()
    .nullable()
    .or(z.literal('')), // Allows empty string for optional email
  sendSms: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Send SMS must be No (0) or Yes (1)'
    }),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Unpublish (0) or Publish (1)'
    }),
  parentAgencyId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable()
});

const agencyUpdateSchema = agencySchema.partial().extend({
  id: z.string().min(1, 'Agency ID is required')
});

type agencyInput = z.infer<typeof agencySchema>;

// ==== GET ALL AGENCIES ==== //
export const getAllAgenciesService = async ({
  page,
  limit,
  keyword,
  parentAgencyId
}: GetAgenciesQuery): Promise<{
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
    const whereClause: Prisma.AgencyWhereInput = {};

    // Add keyword search
    if (keyword && keyword.trim() !== '') {
      whereClause.OR = [
        {
          name: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          code: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          email: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          phone: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ];
    }

    // Add parent agency filter
    if (parentAgencyId && parentAgencyId !== '__all__') {
      whereClause.parentAgencyId = parentAgencyId;
    }

    const rows = await prisma.agency.findMany({
      skip: skip,
      take: validLimit,
      where: whereClause,
      include: {
        parentAgency: true,
        user: true,
        createdUser: { select: { id: true, name: true } },
        updatedUser: { select: { id: true, name: true } },
        accounts: {
          where: { type: 'RECEIVABLE', isActive: true },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.agency.count({
      where: whereClause
    });

    const records = await Promise.all(
      rows.map(async (row) => {
        const acc = row.accounts?.[0];
        const balanceCents = acc ? await getAccountBalance(acc.id) : 0;
        const { accounts: _a, ...rest } = row;
        return {
          ...rest,
          balance: balanceCents / 100,
          accountId: acc?.id ?? null,
          accountName: acc?.name ?? null,
          accountCode: acc?.code ?? null
        };
      })
    );

    return {
      success: true,
      data: {
        records,
        totalRecords
      },
      message: 'Agencies fetched successfully'
    };
  } catch (error: any) {
    console.log('getAllAgenciesService error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch agencies'
      }
    };
  }
};

// ==== GET ALL AGENCIES FOR EXPORT ==== //
export const getAllAgenciesExportService = async ({
  keyword,
  parentAgencyId
}: {
  keyword?: string;
  parentAgencyId?: string;
}): Promise<GetAgenciesReturn> => {
  try {
    const whereClause: Prisma.AgencyWhereInput = {};

    if (keyword && keyword.trim() !== '') {
      whereClause.OR = [
        {
          name: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          code: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ];
    }

    if (parentAgencyId && parentAgencyId !== '__all__') {
      whereClause.parentAgencyId = parentAgencyId;
    }

    const records = await prisma.agency.findMany({
      where: whereClause,
      include: {
        parentAgency: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      data: records,
      totalRecords: records.length
    };
  } catch (error: any) {
    console.log('getAllAgenciesExportService error', error);
    throw new Error(error.message ?? 'Error getting agencies for export');
  }
};

// ==== GET ONE AGENCY ==== //
export const getAgencyByIdService = async (
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
          message: 'Invalid agency ID'
        }
      };
    }

    const agency = await prisma.agency.findUnique({
      where: { id: id },
      include: {
        parentAgency: true,
        user: true,
        accounts: {
          where: { type: 'RECEIVABLE', isActive: true },
          take: 1
        }
      }
    });

    if (!agency) {
      return {
        success: false,
        error: {
          message: 'Agency not found'
        }
      };
    }

    const acc = agency.accounts?.[0];
    const balanceCents = acc ? await getAccountBalance(acc.id) : 0;
    const { accounts: _accounts, ...rest } = agency;
    const data = {
      ...rest,
      balance: balanceCents / 100,
      accountId: acc?.id ?? null,
      accountName: acc?.name ?? null,
      accountCode: acc?.code ?? null
    };

    return {
      success: true,
      data,
      message: 'Agency fetched successfully'
    };
  } catch (error: any) {
    console.log('getAgencyByIdService error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get agency'
      }
    };
  }
};

// ==== GET ALL AGENCIES FOR DROPDOWN ==== //
export const getAllAgenciesOptionsService = async () => {
  try {
    const records = await prisma.agency.findMany({
      where: {
        status: 1 // Only published agencies
      },
      select: {
        id: true,
        name: true,
        code: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return {
      data: records,
      totalRecords: records.length
    };
  } catch (error: any) {
    console.log('getAllAgenciesOptionsService error', error);
    throw new Error(error.message ?? 'Error getting agency options');
  }
};

// ==== CREATE AGENCY ==== //
export const createAgencyService = async (
  payload: AgencyFormValues,
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
    const parsed = agencySchema.safeParse(payload);

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

    const agencyCode = await getNextAgencyCode();

    const agency = await prisma.agency.create({
      data: {
        name: data.name,
        code: agencyCode,
        chequePrintingName: data.chequePrintingName,
        allowedCreditLimit: data.allowedCreditLimit,
        phone: data.phone || null,
        mobile: data.mobile || null,
        fax: data.fax || null,
        email: data.email || null,
        website: data.website || null,
        memo: data.memo || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        city: data.city || null,
        contactPersonName: data.contactPersonName,
        contactPersonPhone: data.contactPersonPhone || null,
        contactPersonMobile: data.contactPersonMobile || null,
        contactPersonEmail: data.contactPersonEmail || null,
        sendSms: data.sendSms,
        status: data.status,
        parentAgencyId: data.parentAgencyId || null,
        locationId: data.locationId || null,
        createdBy: user?.id || null,
        updatedBy: user?.id || null
      },
      include: {
        parentAgency: true,
        user: true
      }
    });

    const accountResult = await createAccount({
      name: `Agency - ${agency.name}`,
      type: 'RECEIVABLE',
      agencyId: agency.id,
      code: agency.code ?? undefined,
    });
    if (!accountResult.success) {
      const accountError = accountResult.error ?? 'Unknown error';
      return {
        success: true,
        data: agency,
        message: `Agency created successfully. The linked GL account could not be created: ${accountError}. Please create it manually from the Accounting section or the agency edit page.`
      };
    }

    return {
      success: true,
      data: agency,
      message: 'Agency created successfully'
    };
  } catch (error: any) {
    console.error('createAgencyService error:', error);

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
        message: error.message || 'Failed to create agency'
      }
    };
  }
};

// ==== UPDATE AGENCY ==== //
export const updateAgencyService = async (
  id: string,
  payload: UpdateAgencyPayload,
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
    const parsed = agencyUpdateSchema.safeParse({
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

    const agency = await prisma.agency.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.chequePrintingName !== undefined && {
          chequePrintingName: data.chequePrintingName
        }),
        ...(data.allowedCreditLimit !== undefined && {
          allowedCreditLimit: data.allowedCreditLimit
        }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.mobile !== undefined && { mobile: data.mobile || null }),
        ...(data.fax !== undefined && { fax: data.fax || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.memo !== undefined && { memo: data.memo || null }),
        ...(data.addressLine1 !== undefined && {
          addressLine1: data.addressLine1 || null
        }),
        ...(data.addressLine2 !== undefined && {
          addressLine2: data.addressLine2 || null
        }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.contactPersonName !== undefined && {
          contactPersonName: data.contactPersonName
        }),
        ...(data.contactPersonPhone !== undefined && {
          contactPersonPhone: data.contactPersonPhone || null
        }),
        ...(data.contactPersonMobile !== undefined && {
          contactPersonMobile: data.contactPersonMobile || null
        }),
        ...(data.contactPersonEmail !== undefined && {
          contactPersonEmail: data.contactPersonEmail || null
        }),
        ...(data.sendSms !== undefined && { sendSms: data.sendSms }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.parentAgencyId !== undefined && {
          parentAgencyId: data.parentAgencyId || null
        }),
        ...(data.locationId !== undefined && {
          locationId: data.locationId || null
        }),
        updatedBy: user?.id || null,
        updatedAt: new Date()
      },
      include: {
        parentAgency: true,
        user: true
      }
    });

    return {
      success: true,
      data: agency,
      message: 'Agency updated successfully'
    };
  } catch (error: any) {
    console.error('updateAgencyService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Agency not found'
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
        message: error.message || 'Failed to update agency'
      }
    };
  }
};

// ==== DELETE ONE AGENCY ==== //
export const deleteAgencyByIdService = async (
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
    const agency = await prisma.agency.delete({
      where: {
        id: id
      }
    });

    return {
      success: true,
      data: agency,
      message: 'Agency deleted successfully'
    };
  } catch (error: any) {
    console.log('deleteAgencyByIdService error', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Agency not found'
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete agency'
      }
    };
  }
};

// ==== DELETE BULK AGENCIES ==== //
export const bulkDeleteAgenciesService = async (
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
          message: 'No agency IDs provided'
        }
      };
    }

    // Ensure all IDs are strings for consistent comparison
    const normalizedIds = ids.map((id) => String(id));

    // Check which agencies have child agencies (cannot be deleted due to onDelete: NoAction)
    const agenciesWithChildren = await prisma.agency.findMany({
      where: {
        id: {
          in: normalizedIds
        },
        childAgencies: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Normalize IDs for comparison
    const agenciesWithChildrenIds = agenciesWithChildren.map((a) => String(a.id));
    const deletableIds = normalizedIds.filter((id) => !agenciesWithChildrenIds.includes(String(id)));

    console.log('Bulk delete - Input IDs:', normalizedIds);
    console.log('Bulk delete - Agencies with children:', agenciesWithChildrenIds);
    console.log('Bulk delete - Deletable IDs:', deletableIds);

    if (deletableIds.length === 0) {
      const agencyNames = agenciesWithChildren.map((a) => a.name).join(', ');
      return {
        success: false,
        error: {
          message: `Cannot delete agencies that have child agencies: ${agencyNames}`
        }
      };
    }

    // Delete only agencies without child agencies
    const result = await prisma.agency.deleteMany({
      where: {
        id: {
          in: deletableIds
        }
      }
    });

    console.log('Bulk delete - Deleted count:', result.count);

    let message = `${result.count} agency(s) deleted successfully`;
    if (agenciesWithChildren.length > 0) {
      const skippedNames = agenciesWithChildren.map((a) => a.name).join(', ');
      message += `. ${agenciesWithChildren.length} agency(s) skipped (have child agencies): ${skippedNames}`;
    }

    return {
      success: true,
      data: {
        count: result.count,
        skipped: agenciesWithChildrenIds
      },
      message
    };
  } catch (error: any) {
    console.log('bulkDeleteAgenciesService error', error);

    // Handle Prisma constraint errors
    if (error.code === 'P2014') {
      return {
        success: false,
        error: {
          message: 'Cannot delete agencies that have child agencies. Please delete or reassign child agencies first.'
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete agencies'
      }
    };
  }
};

// ==== GET NEXT AGENCY CODE (Sequence model, no prefix: "1", "2", ...) ==== //
const AGENCY_SCOPE = 'agency';

export const getNextAgencyCode = async (): Promise<string> => {
  try {
    const result = await getNextSequenceNumber(AGENCY_SCOPE, { startFrom: 1 });
    if (!result.success) {
      throw new Error('Unable to generate agency code');
    }
    return String(result.value);
  } catch (error: any) {
    console.log('getNextAgencyCode error', error);
    throw error;
  }
};
