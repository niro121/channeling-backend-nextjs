'use server';

import prisma from '@/lib/prisma';
import { Discount, getDiscountQuery } from '@/types/discount';
import { Prisma } from '@prisma/client';

// ==== GET ALL DISCOUNTS ==== //
export const getAllDiscountsService = async ({
  page,
  limit,
  keyword,
  applyType
}: getDiscountQuery) => {
  const whereClause: Prisma.DiscountWhereInput | undefined =
    keyword && keyword.trim() !== ''
      ? {
          OR: [
            {
              name: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            },
            {
              vouchers: {
                some: {
                  code: {
                    contains: keyword,
                    mode: Prisma.QueryMode.insensitive
                  }
                }
              }
            }
          ],
          ...(applyType ? { applyTo: applyType } : {})
        }
      : applyType
        ? { applyTo: applyType }
        : undefined;

  try {
    const skip = page * limit;

    const records = await prisma.discount.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: whereClause,
      include: {
        vouchers: true,
        createdUser: true,
        updatedUser: true
      }
    });

    const totalRecords = await prisma.discount.count({
      where: whereClause
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getAllDiscountsService error', error);
    throw error;
  }
};

// ==== CREATE A DISCOUNT ==== //
export const checkUniqueVoucherCodes = async (codes: string[]) => {
  try {
    const uniqueVouchers = await prisma.voucherCode.findMany({
      where: {
        code: {
          in: codes
        }
      },
      select: { code: true }
    });

    return uniqueVouchers.map((voucher) => voucher.code);
  } catch (error: any) {
    throw new Error(error.message ?? 'checkUniqueVoucherCode Error');
  }
};

export const createDiscountService = async (
  payload: Prisma.DiscountCreateInput
) => {
  try {
    const result = prisma.discount.create({
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('createDiscountService error', error);
    throw error;
  }
};

// ==== UPDATE A DISCOUNT ==== //
export const updateOneDiscountService = async (
  id: string,
  payload: Prisma.DiscountUpdateInput
): Promise<Discount | null> => {
  try {
    const result = await prisma.discount.update({
      where: { id },
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('updateOneDiscountService error', error);
    throw error;
  }
};

// ==== UPDATE A VOUCHER ==== //
export const updateOneVoucherService = async (
  id: string,
  discountId: string,
  payload: Prisma.VoucherCodeUpdateInput
) => {
  try {
    const result = await prisma.voucherCode.update({
      where: { id, discountId },
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('updateOneVoucherService error', error);
    throw error;
  }
};

// ==== DELETE A VOUCHER ==== //
export const deleteOneVoucherService = async (id: string) => {
  try {
    const result = await prisma.voucherCode.delete({
      where: { id }
    });

    return result;
  } catch (error: any) {
    console.log('updateOneVoucherService error', error);
    throw error;
  }
};

// ==== GET ONE DISCOUNT ==== //
export const getDiscountByIdService = async (id: string) => {
  try {
    const result = prisma.discount.findUnique({
      where: { id }
    });

    return result;
  } catch (error: any) {
    console.log('getDiscountByIdService error', error);
    throw error;
  }
};

// ==== DELETE A DISCOUNT ==== //
export const deleteDiscountByIdService = async (id: string) => {
  try {
    const result = await prisma.discount.delete({
      where: { id }
    });

    return result;
  } catch (error: any) {
    console.log('deleteDiscountByIdService error', error);
    throw error;
  }
};

// ==== DELETE DISCOUNTS ==== //
export const bulkDeleteDiscountsByIdsService = async (ids: string[]) => {
  try {
    const result = await prisma.discount.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return result;
  } catch (error: any) {
    console.log('bulkDeleteDiscountsByIdsService error', error);
    throw error;
  }
};
