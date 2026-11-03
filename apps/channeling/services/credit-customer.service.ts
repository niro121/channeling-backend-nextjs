'use server';

import prisma from '@/lib/prisma';
import type {
  GetCreditCustomersQuery,
  GetCreditCustomersReturn,
  CreditCustomer,
  CreditCustomerFormValues,
  UpdateCreditCustomerPayload,
} from '@/types/credit-customer';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { sriLankaPhoneRegex, sriLankaMobileRegex } from '@/lib/regex';
import { getNextSequenceNumber } from '@/services/channel-booking/helpers/sequence';
import { createAccount } from '@/services/accounting/account.service';
import { getAccountBalance } from '@/services/accounting/balance-calc.service';

const CREDIT_CUSTOMER_SCOPE = 'credit_customer';

// ==== VALIDATION SCHEMA ==== //
const creditCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Max 200 characters'),
  code: z.string().max(50).optional().nullable(),
  contactPersonName: z.string().min(1, 'Contact person name is required').max(200),
  phone: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || val.trim() === '' || sriLankaPhoneRegex.test(val), 'Invalid phone'),
  mobile: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || val.trim() === '' || sriLankaMobileRegex.test(val), 'Invalid mobile'),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  contactPersonPhone: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || val.trim() === '' || sriLankaPhoneRegex.test(val), 'Invalid phone'),
  contactPersonEmail: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  status: z.union([
    z.number().int().refine((v) => v === 0 || v === 1, { message: 'Status must be 0 or 1' }),
    z.string().transform((v) => (v === '0' ? 0 : 1)),
  ]),
});

// ==== GET NEXT CODE (CC-00001, CC-00002, ...) — same pattern as doctor ==== //
async function getNextCreditCustomerCode(): Promise<{
  success: boolean;
  data?: string;
  message?: string;
}> {
  try {
    const result = await getNextSequenceNumber(CREDIT_CUSTOMER_SCOPE, { startFrom: 1 });
    if (!result.success) {
      console.debug('[CC] getNextCreditCustomerCode: sequence failed', result);
      return { success: false, message: 'Unable to generate credit customer code' };
    }
    const code = `CC-${String(result.value).padStart(5, '0')}`;
    console.debug('[CC] getNextCreditCustomerCode: sequence returned', { value: result.value, code });
    return { success: true, data: code };
  } catch (e) {
    console.debug('[CC] getNextCreditCustomerCode: exception', e);
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Getting code error',
    };
  }
}

// ==== LIST ==== //
export async function getAllCreditCustomersService(
  query: GetCreditCustomersQuery
): Promise<{
  success: boolean;
  data?: { records: CreditCustomer[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  const validLimit = query.limit > 0 ? query.limit : 10;
  const skip = query.page * validLimit;

  try {
    const where: Prisma.CreditCustomerWhereInput = {};
    if (query.keyword?.trim()) {
      where.OR = [
        { name: { contains: query.keyword, mode: 'insensitive' } },
        { code: { contains: query.keyword, mode: 'insensitive' } },
        { email: { contains: query.keyword, mode: 'insensitive' } },
        { phone: { contains: query.keyword, mode: 'insensitive' } },
        { contactPersonName: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const [rawRecords, totalRecords] = await Promise.all([
      prisma.creditCustomer.findMany({
        skip,
        take: validLimit,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          createdUser: { select: { id: true, name: true } },
          updatedUser: { select: { id: true, name: true } },
          accounts: {
            where: { type: 'RECEIVABLE', isActive: true },
            take: 1,
          },
        },
      }),
      prisma.creditCustomer.count({ where }),
    ]);

    const records: CreditCustomer[] = await Promise.all(
      rawRecords.map(async (r) => {
        const acc = r.accounts[0];
        const balanceCents = acc ? await getAccountBalance(acc.id) : 0;
        const { accounts: _, ...rest } = r;
        return {
          ...rest,
          balance: balanceCents / 100,
          accountId: acc?.id ?? null,
          accountName: acc?.name ?? null,
          accountCode: acc?.code ?? null,
        } as CreditCustomer;
      })
    );

    return {
      success: true,
      data: { records, totalRecords },
      message: 'Credit customers fetched successfully',
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch credit customers';
    return { success: false, error: { message } };
  }
}

// ==== GET BY ID ==== //
export async function getCreditCustomerByIdService(
  id: string
): Promise<{
  success: boolean;
  data?: CreditCustomer;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const record = await prisma.creditCustomer.findUnique({
      where: { id },
      include: {
        accounts: {
          where: { type: 'RECEIVABLE', isActive: true },
          take: 1,
        },
      },
    });
    if (!record) {
      return { success: false, error: { message: 'Credit customer not found' } };
    }
    const acc = record.accounts[0];
    const balanceCents = acc ? await getAccountBalance(acc.id) : 0;
    const { accounts: _, ...rest } = record;
    const data: CreditCustomer = {
      ...rest,
      balance: balanceCents / 100,
      accountId: acc?.id ?? null,
      accountName: acc?.name ?? null,
      accountCode: acc?.code ?? null,
    };
    return { success: true, data, message: 'OK' };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch credit customer';
    return { success: false, error: { message } };
  }
}

// ==== CREATE ==== //
export async function createCreditCustomerService(
  payload: CreditCustomerFormValues,
  user?: { id?: string }
): Promise<{
  success: boolean;
  data?: CreditCustomer;
  message?: string;
  error?: { message?: string; issues?: unknown };
}> {
  let attemptedCode: string | undefined;
  try {
    const parsed = creditCustomerSchema.safeParse({
      ...payload,
      status: payload.status ?? 1,
    });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors,
        },
      };
    }
    const data = parsed.data;

    let code: string;
    if (data.code?.trim()) {
      code = data.code.trim();
    } else {
      const codeResult = await getNextCreditCustomerCode();
      if (!codeResult.success || !codeResult.data) {
        return {
          success: false,
          error: { message: codeResult.message ?? 'Failed to generate credit customer code' },
        };
      }
      code = codeResult.data;
    }
    attemptedCode = code;
    console.debug('[CC] Service: create attempt', { code, name: data.name });

    const created = await prisma.creditCustomer.create({
      data: {
        name: data.name,
        code,
        phone: data.phone?.trim() || null,
        mobile: data.mobile?.trim() || null,
        email: data.email?.trim() || null,
        addressLine1: data.addressLine1?.trim() || null,
        addressLine2: data.addressLine2?.trim() || null,
        city: data.city?.trim() || null,
        contactPersonName: data.contactPersonName,
        contactPersonPhone: data.contactPersonPhone?.trim() || null,
        contactPersonEmail: data.contactPersonEmail?.trim() || null,
        status: data.status,
        createdBy: user?.id ?? null,
        updatedBy: user?.id ?? null,
      },
    });

    const accountResult = await createAccount({
      name: `Credit - ${created.name}`,
      type: 'RECEIVABLE',
      creditCustomerId: created.id,
      code: created.code,
    });
    if (!accountResult.success) {
      const accountError = accountResult.error ?? 'Unknown error';
      return {
        success: true,
        data: { ...created, balance: 0 } as CreditCustomer,
        message: `Credit customer created successfully. The linked GL account could not be created: ${accountError}. Please create it manually from the Accounting section or the credit customer edit page.`,
      };
    }

    return {
      success: true,
      data: { ...created, balance: 0 } as CreditCustomer,
      message: 'Credit customer created successfully',
    };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      const meta = (e as { meta?: { modelName?: string } }).meta;
      const isAccountConflict = meta?.modelName === 'Account';
      console.warn('[CC] Service: P2002', { attemptedCode, meta });
      const message = isAccountConflict && attemptedCode
        ? `The linked accounting account could not be created (code "${attemptedCode}" is already in use). The credit customer was not saved. Please try again or check the Accounting list.`
        : 'Code already in use. The credit customer was not saved. Please try again.';
      return { success: false, error: { message } };
    }
    const message = e instanceof Error ? e.message : 'Failed to create credit customer';
    console.debug('[CC] Service: create error', { message, attemptedCode });
    return { success: false, error: { message } };
  }
}

// ==== UPDATE ==== //
export async function updateCreditCustomerService(
  id: string,
  payload: UpdateCreditCustomerPayload,
  user?: { id?: string }
): Promise<{
  success: boolean;
  data?: CreditCustomer;
  message?: string;
  error?: { message?: string; issues?: unknown };
}> {
  try {
    const parsed = creditCustomerSchema.partial().safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors,
        },
      };
    }
    const data = parsed.data;

    const existing = await prisma.creditCustomer.findUnique({
      where: { id },
      select: { code: true },
    });
    if (!existing) {
      return { success: false, error: { message: 'Credit customer not found' } };
    }
    const newCode = data.code !== undefined ? (data.code?.trim() || null) : undefined;
    const codeUnchanged = newCode !== undefined && existing.code === newCode;

    const updated = await prisma.creditCustomer.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && !codeUnchanged && { code: newCode ?? null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.mobile !== undefined && { mobile: data.mobile?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.addressLine1 !== undefined && { addressLine1: data.addressLine1?.trim() || null }),
        ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2?.trim() || null }),
        ...(data.city !== undefined && { city: data.city?.trim() || null }),
        ...(data.contactPersonName !== undefined && { contactPersonName: data.contactPersonName }),
        ...(data.contactPersonPhone !== undefined && {
          contactPersonPhone: data.contactPersonPhone?.trim() || null,
        }),
        ...(data.contactPersonEmail !== undefined && {
          contactPersonEmail: data.contactPersonEmail?.trim() || null,
        }),
        ...(data.status !== undefined && { status: data.status }),
        updatedBy: user?.id ?? null,
      },
    });
    return {
      success: true,
      data: updated as CreditCustomer,
      message: 'Credit customer updated successfully',
    };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e) {
      const code = (e as { code: string }).code;
      if (code === 'P2025') return { success: false, error: { message: 'Credit customer not found' } };
      if (code === 'P2002') return { success: false, error: { message: 'Code already in use' } };
    }
    const message = e instanceof Error ? e.message : 'Failed to update credit customer';
    return { success: false, error: { message } };
  }
}

// ==== DELETE ONE ==== //
export async function deleteCreditCustomerByIdService(
  id: string
): Promise<{ success: boolean; message?: string; error?: { message?: string } }> {
  try {
    await prisma.creditCustomer.delete({ where: { id } });
    return { success: true, message: 'Credit customer deleted successfully' };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
      return { success: false, error: { message: 'Credit customer not found' } };
    }
    const message = e instanceof Error ? e.message : 'Failed to delete credit customer';
    return { success: false, error: { message } };
  }
}

// ==== BULK DELETE ==== //
export async function bulkDeleteCreditCustomersService(
  ids: string[]
): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  if (!ids?.length) {
    return { success: false, error: { message: 'No IDs provided' } };
  }
  try {
    const result = await prisma.creditCustomer.deleteMany({
      where: { id: { in: ids } },
    });
    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} credit customer(s) deleted successfully`,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to delete credit customers';
    return { success: false, error: { message } };
  }
}

// ==== OPTIONS (for dropdowns, e.g. when connecting to booking) ==== //
export async function getAllCreditCustomersOptionsService(): Promise<{
  success: boolean;
  data?: { id: string; name: string; code: string | null }[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.creditCustomer.findMany({
      where: { status: 1 },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: records };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch credit customer options';
    return { success: false, error: { message } };
  }
}

// ==== EXPORT (all matching keyword) ==== //
export async function getAllCreditCustomersExportService(keyword?: string): Promise<{
  success: boolean;
  data?: CreditCustomer[];
  totalRecords?: number;
  error?: { message?: string };
}> {
  try {
    const where: Prisma.CreditCustomerWhereInput = {};
    if (keyword?.trim()) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    const rawRecords = await prisma.creditCustomer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        accounts: {
          where: { type: 'RECEIVABLE', isActive: true },
          take: 1,
        },
      },
    });
    const records: CreditCustomer[] = await Promise.all(
      rawRecords.map(async (r) => {
        const acc = r.accounts[0];
        const balanceCents = acc ? await getAccountBalance(acc.id) : 0;
        const { accounts: _, ...rest } = r;
        return { ...rest, balance: balanceCents / 100 } as CreditCustomer;
      })
    );
    return {
      success: true,
      data: records,
      totalRecords: records.length,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to export credit customers';
    return { success: false, error: { message } };
  }
}
