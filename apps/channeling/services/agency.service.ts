'use server';

import prisma from '@/lib/prisma';
import {
  GetAgenciesQuery,
  GetAgenciesReturn,
  Agency,
  AgencyFormValues,
  UpdateAgencyPayload,
  AGENCY_VIOLATION_REASON_ALLOWED_AT_HARD_CAP
} from '@/types/agency';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { sriLankaPhoneRegex, sriLankaMobileRegex } from '@/lib/regex';
import { getNextSequenceNumber } from '@/services/channel-booking/helpers/sequence';
import { createAccount } from '@/services/accounting/account.service';
import { getAccountBalance } from '@/services/accounting/balance-calc.service';
import { formatLKR } from '@/lib/format-money';
import { getAgentBalance } from '@/services/channel-booking/helpers/get-agent-balance';

// ==== AGENCY: VALIDATION SCHEMA ==== //
const agencySchemaBase = z.object({
  name: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  chequePrintingName: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  allowedCreditLimit: z
    .coerce
    .number()
    .min(0, 'Must be 0 or greater')
    .refine((val) => val >= 0, 'Allowed credit limit must be 0 or greater'),
  creditLimit: z
    .coerce
    .number()
    .min(0, 'Must be 0 or greater')
    .refine((val) => val >= 0, 'Credit limit must be 0 or greater'),
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
    .coerce
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Send SMS must be No (0) or Yes (1)'
    }),
  status: z
    .coerce
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Unpublish (0) or Publish (1)'
    }),
  parentAgencyId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable()
});

const agencySchema = agencySchemaBase.superRefine((value, ctx) => {
  if (Number(value.creditLimit) > Number(value.allowedCreditLimit)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Credit limit cannot be greater than allowed credit limit',
      path: ['creditLimit']
    });
  }
});

const agencyUpdateSchema = agencySchemaBase
  .partial()
  .extend({
    id: z.string().min(1, 'Agency ID is required')
  })
  .superRefine((value, ctx) => {
    if (
      value.creditLimit !== undefined &&
      value.allowedCreditLimit !== undefined &&
      Number(value.creditLimit) > Number(value.allowedCreditLimit)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Credit limit cannot be greater than allowed credit limit',
        path: ['creditLimit']
      });
    }
  });

type agencyInput = z.infer<typeof agencySchema>;

function clampCreditLimit(creditLimit: number, allowedCreditLimit: number): number {
  return Math.max(0, Math.min(Number(creditLimit), Number(allowedCreditLimit)));
}

function resolveAgencyHardCreditLimitLkr(account: {
  minBalanceAllowed?: number | null;
  maxBalanceAllowed?: number | null;
} | null | undefined): number | undefined {
  if (!account) return undefined;
  if (account.minBalanceAllowed != null) return Math.abs(Number(account.minBalanceAllowed)) / 100;
  if (account.maxBalanceAllowed != null) return Number(account.maxBalanceAllowed) / 100;
  return undefined;
}

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
          where: { type: 'PAYABLE', isActive: true },
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
        const maxCreditLimit = resolveAgencyHardCreditLimitLkr(acc);
        const standardCreditLimit =
          maxCreditLimit != null
            ? Math.min(Number(row.allowedCreditLimit ?? 0), maxCreditLimit)
            : Number(row.allowedCreditLimit ?? 0);
        const { accounts: _a, ...rest } = row;
        return {
          ...rest,
          balance: balanceCents / 100,
          maxCreditLimit,
          standardCreditLimit,
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

    const rows = await prisma.agency.findMany({
      where: whereClause,
      include: {
        parentAgency: true,
        accounts: {
          where: { type: 'PAYABLE', isActive: true },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const records: Agency[] = await Promise.all(
      rows.map(async (row) => {
        const acc = row.accounts?.[0];
        const balanceCents = acc ? await getAccountBalance(acc.id) : 0;
        const maxCreditLimit = resolveAgencyHardCreditLimitLkr(acc);
        const standardCreditLimit =
          maxCreditLimit != null
            ? Math.min(Number(row.allowedCreditLimit ?? 0), maxCreditLimit)
            : Number(row.allowedCreditLimit ?? 0);
        const { accounts: _a, ...rest } = row;
        return {
          ...rest,
          balance: balanceCents / 100,
          maxCreditLimit,
          standardCreditLimit,
          accountId: acc?.id ?? null,
          accountName: acc?.name ?? null,
          accountCode: acc?.code ?? null
        } as Agency;
      })
    );

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
        createdUser: { select: { id: true, name: true } },
        updatedUser: { select: { id: true, name: true } },
        accounts: {
          where: { type: 'PAYABLE', isActive: true },
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
    const maxCreditLimit = resolveAgencyHardCreditLimitLkr(acc);
    const standardCreditLimit =
      maxCreditLimit != null
        ? Math.min(Number(agency.allowedCreditLimit ?? 0), maxCreditLimit)
        : Number(agency.allowedCreditLimit ?? 0);
    const { accounts: _accounts, ...rest } = agency;
    const data = {
      ...rest,
      balance: balanceCents / 100,
      maxCreditLimit,
      standardCreditLimit,
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
    const safeAllowedCreditLimit = Number(data.allowedCreditLimit);
    const safeCreditLimit = clampCreditLimit(Number(data.creditLimit), safeAllowedCreditLimit);

    const agencyCode = await getNextAgencyCode();

    const agency = await prisma.agency.create({
      data: {
        name: data.name,
        code: agencyCode,
        chequePrintingName: data.chequePrintingName,
        allowedCreditLimit: safeAllowedCreditLimit,
        creditLimit: safeCreditLimit,
        isCreditLimitViolation: false,
        creditLimitViolationAt: null,
        creditLimitViolationReason: null,
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
      type: 'PAYABLE',
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
    const existingAgency = await prisma.agency.findUnique({
      where: { id },
      select: { id: true, allowedCreditLimit: true, creditLimit: true, isCreditLimitViolation: true }
    });
    if (!existingAgency) {
      return {
        success: false,
        error: { message: 'Agency not found' }
      };
    }

    const isLimitEditRequest =
      data.allowedCreditLimit !== undefined || data.creditLimit !== undefined;

    if (existingAgency.isCreditLimitViolation && isLimitEditRequest) {
      return {
        success: false,
        error: {
          message: 'Credit limit violation is active. Limit updates are blocked until deposit clears the violation.'
        }
      };
    }

    const nextAllowedCreditLimit =
      data.allowedCreditLimit !== undefined
        ? Number(data.allowedCreditLimit)
        : Number(existingAgency.allowedCreditLimit);
    const nextCreditLimit =
      data.creditLimit !== undefined
        ? Number(data.creditLimit)
        : Number(existingAgency.creditLimit);
    const safeCreditLimit = clampCreditLimit(nextCreditLimit, nextAllowedCreditLimit);
    const linkedPayableAccount = await prisma.account.findFirst({
      where: {
        agencyId: id,
        type: 'PAYABLE',
        isActive: true
      },
      select: { minBalanceAllowed: true, maxBalanceAllowed: true }
    });
    const hardCreditLimit = resolveAgencyHardCreditLimitLkr(linkedPayableAccount) ?? null;
    if (hardCreditLimit != null && nextAllowedCreditLimit > hardCreditLimit) {
      return {
        success: false,
        error: {
          message: `Allowed credit limit cannot be greater than hard credit limit (${hardCreditLimit.toFixed(2)}). Set it equal to or below the hard credit limit.`
        }
      };
    }

    const allowedBeingUpdated = data.allowedCreditLimit !== undefined;
    const reachesHardCap =
      hardCreditLimit != null &&
      allowedBeingUpdated &&
      Math.round(nextAllowedCreditLimit * 100) === Math.round(hardCreditLimit * 100);

    const agency = await prisma.agency.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.chequePrintingName !== undefined && {
          chequePrintingName: data.chequePrintingName
        }),
        ...(data.allowedCreditLimit !== undefined && {
          allowedCreditLimit: nextAllowedCreditLimit
        }),
        ...((data.creditLimit !== undefined || data.allowedCreditLimit !== undefined) && {
          creditLimit: safeCreditLimit
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
        ...(reachesHardCap && {
          isCreditLimitViolation: true,
          creditLimitViolationAt: new Date(),
          creditLimitViolationReason: AGENCY_VIOLATION_REASON_ALLOWED_AT_HARD_CAP
        }),
        ...(user?.id && { updatedBy: user.id }),
        updatedAt: new Date()
      },
      include: {
        parentAgency: true,
        user: true
      }
    });

    let successMessage = 'Agency updated successfully';
    if (reachesHardCap) {
      successMessage = `Allowed credit limit is now set to the hard limit (${formatLKR(Number(hardCreditLimit))}). A credit-limit restriction is recorded. The allowed credit limit can only be changed again after the agency deposits so the outstanding balance is at or below the agency credit limit of ${formatLKR(Number(safeCreditLimit))}. Until that deposit clears this status, further limit changes are blocked.`;
    }

    return {
      success: true,
      data: agency,
      message: successMessage
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

/** Same eligibility as post-deposit auto-clear: debt at or below agency credit limit. */
export const tryClearAgencyCreditViolationIfEligibleService = async (
  agencyId: string
): Promise<{
  success: boolean;
  cleared?: boolean;
  message?: string;
  error?: { message: string };
  /** Present when `cleared` so callers can log `agencies.limit.soft_changed`. */
  softLimitChange?: {
    oldValue: number;
    newValue: number;
    agencyName: string;
    agencyCode: string | null;
  };
}> => {
  try {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        id: true,
        creditLimit: true,
        isCreditLimitViolation: true,
        name: true,
        code: true,
        allowedCreditLimit: true
      }
    });
    if (!agency) {
      return { success: false, error: { message: 'Agency not found' } };
    }
    if (!agency.isCreditLimitViolation) {
      return {
        success: true,
        cleared: false,
        message: 'There is no active credit violation for this agency.'
      };
    }

    const balanceCents = await getAgentBalance(agencyId);
    const balanceRupees = balanceCents / 100;
    const debtRupees = Math.max(0, -balanceRupees);
    const creditLimit = Number(agency.creditLimit ?? 0);

    if (debtRupees > creditLimit) {
      return {
        success: false,
        error: {
          message: `Outstanding balance is still above the agency credit limit (${formatLKR(creditLimit)} LKR). Record a deposit or correct the account before clearing.`
        }
      };
    }

    const oldAllowed = Number(agency.allowedCreditLimit ?? 0);
    const newAllowed = creditLimit;

    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        allowedCreditLimit: creditLimit,
        isCreditLimitViolation: false,
        creditLimitViolationAt: null,
        creditLimitViolationReason: null
      }
    });

    return {
      success: true,
      cleared: true,
      message:
        'Credit violation cleared. Allowed credit limit was reset to the agency credit limit.',
      softLimitChange: {
        oldValue: oldAllowed,
        newValue: newAllowed,
        agencyName: agency.name,
        agencyCode: agency.code
      }
    };
  } catch (error: any) {
    console.error('tryClearAgencyCreditViolationIfEligibleService error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to clear violation' }
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
