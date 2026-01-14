'use server';

import {
  createDiscountService,
  getAllDiscountsService,
  getDiscountByIdService,
  checkUniqueVoucherCodes,
  updateOneDiscountService,
  deleteDiscountByIdService,
  bulkDeleteDiscountsByIdsService,
  createOneVoucherService,
  deleteOneVoucherService,
  checkDiscountId,
  checkVouchers
} from '@/services/discount.service';
import {
  Discount,
  DiscountFormValues,
  getDiscountParams,
  getDiscountQuery,
  UpdatedDiscountPayload
} from '@/types/discount';
import { VoucherFormValues } from '@/types/voucher';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

type createDiscountPayload = DiscountFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

type createVoucherPayload = VoucherFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

// ==== GET ALL DISCOUNTS ==== //
export const getAllDiscounts = async (sort: getDiscountParams) => {
  try {
    let newFilter: getDiscountQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: sort.keyword ?? '',
      discountType:
        sort.discountType !== undefined && sort.discountType !== null
          ? parseInt(sort.discountType)
          : undefined
    };

    const response = await getAllDiscountsService(newFilter);

    return {
      success: true,
      data: response.data as Discount[],
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getAllDiscounts error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE DISCOUNT ==== //
export const getDiscountById = async (id: string) => {
  try {
    const response = await getDiscountByIdService(id);

    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.log('getDiscountByIdService error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: null
    };
  }
};

// ==== CREATE A DISCOUNT ==== //
export const createDiscount = async (
  payload: createDiscountPayload,
  user?: { id?: string; name?: string }
) => {
  // console.log('CREATING DATA', payload);
  try {
    const voucherAccepted = payload.isVoucher === 1;

    if (!voucherAccepted && payload.vouchers?.length) {
      return {
        success: false,
        error: {
          message: 'Vouchers are not allowed when isVoucher is disabled'
        }
      };
    }

    if (
      voucherAccepted &&
      (!payload.vouchers || payload.vouchers.length === 0)
    ) {
      return {
        success: false,
        error: {
          message:
            'At least one voucher code is required when isVoucher is enabled'
        }
      };
    }

    if (voucherAccepted && payload.vouchers) {
      const codes = payload.vouchers.map((v) => v.code);
      const duplicatedCodes = await checkUniqueVoucherCodes(codes);

      if (duplicatedCodes.length > 0) {
        return {
          success: false,
          error: {
            message: `Voucher code(s) already exist: ${duplicatedCodes.join(', ')}`
          }
        };
      }
    }

    const discountRelation = user?.id
      ? { connect: { id: user.id } }
      : undefined;

    const result = await createDiscountService({
      name: payload.name,
      discountType: Number(payload.discountType),
      discountMethod: payload.discountMethod,
      paymentType: payload.paymentType,
      discountValue: payload.discountValue,
      discountValueForeign: payload.discountValueForeign,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      isVoucher: Number(payload.isVoucher),
      autoApply: payload.autoApply,
      applyTo: Number(payload.applyTo),
      vouchers:
        voucherAccepted && payload.vouchers && payload.vouchers.length > 0
          ? {
              create: payload.vouchers.map((voucher) => ({
                code: voucher.code,
                limit: voucher.limit,
                status: 1,
                createdUser: discountRelation,
                updatedUser: discountRelation
              }))
            }
          : undefined,
      status: payload.status,
      createdUser: discountRelation,
      updatedUser: discountRelation
    });

    revalidatePath('/discounts');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('createDiscount error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create discount'
      }
    };
  }
};

// ==== UPDATE A DISCOUNT ==== //
export const updateOneDiscount = async (
  id: string,
  payload: UpdatedDiscountPayload,
  user?: { id?: string; name?: string }
) => {
  // console.log('UPDATING DATA', payload);

  try {
    const existingVouchers = await checkVouchers(id);

    if (
      payload.isVoucher === 1 &&
      payload.vouchers?.length === 0 &&
      existingVouchers?.vouchers.length === 0
    ) {
      return {
        success: false,
        error: {
          message:
            'At least one voucher code is required when isVoucher is enabled'
        }
      };
    }

    console.log('UPDATING DATA', payload);

    const voucherCodes = payload.vouchers?.map((v) => v.code) ?? [];

    if (voucherCodes.length === 0) return [];

    const uniquePayloadCodes = [...new Set(voucherCodes)];

    const existingCodes = await checkUniqueVoucherCodes(uniquePayloadCodes);

    const newVoucherCodes = uniquePayloadCodes.filter(
      (code) => !existingCodes.includes(code)
    );

    const skippedDuplicateCount =
      voucherCodes.length - uniquePayloadCodes.length;

    const skippedExistingCount =
      uniquePayloadCodes.length - newVoucherCodes.length;

    const hasSkippedVouchers =
      skippedDuplicateCount > 0 || skippedExistingCount > 0;

    const discountRelation = user?.id
      ? { connect: { id: user.id } }
      : undefined;

    const data: Prisma.DiscountUpdateInput = {
      updatedAt: new Date(),
      ...(discountRelation && { updatedUser: discountRelation })
    };

    if (payload.name !== undefined) data.name = payload.name;
    if (payload.discountType !== undefined)
      data.discountType = Number(payload.discountType);
    if (payload.discountMethod !== undefined)
      data.discountMethod = payload.discountMethod;
    if (payload.paymentType !== undefined)
      data.paymentType = payload.paymentType;
    if (payload.discountValue !== undefined)
      data.discountValue = payload.discountValue;
    if (payload.discountValueForeign !== undefined)
      data.discountValueForeign = payload.discountValueForeign;
    if (payload.fromDate !== undefined) data.fromDate = payload.fromDate;
    if (payload.toDate !== undefined) data.toDate = payload.toDate;
    if (payload.isVoucher !== undefined)
      data.isVoucher = Number(payload.isVoucher);
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.applyTo !== undefined) data.applyTo = Number(payload.applyTo);
    if (payload.autoApply !== undefined) data.autoApply = payload.autoApply;

    if (payload.isVoucher === 1 && newVoucherCodes.length > 0) {
      data.vouchers = {
        create: newVoucherCodes.map((code) => {
          const voucher = payload.vouchers!.find((v) => v.code === code)!;

          return {
            code: voucher.code,
            limit: voucher.limit,
            status: 1,
            createdUser: discountRelation,
            updatedUser: discountRelation
          };
        })
      };
    }

    const result = await updateOneDiscountService(id, data);

    revalidatePath('/discounts');

    return {
      success: true,
      message: hasSkippedVouchers
        ? 'Some voucher codes were ignored because they were duplicated or already exist in the system. Only new voucher codes were added.'
        : 'Discount updated successfully.',
      data: result
    };
  } catch (error: any) {
    console.error('updateOneDiscount error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update Discount'
      }
    };
  }
};

// ==== CREATE A VOUCHER ==== //
export const createOneVoucher = async (
  discountId: string,
  payload: createVoucherPayload
) => {
  try {
    const existingDiscountId = await checkDiscountId(discountId);

    if (!existingDiscountId) {
      return {
        success: false,
        message: 'No relevant discount found to save the voucher code'
      };
    }

    const checkExistingCodes = await checkUniqueVoucherCodes([payload.code]);

    if (checkExistingCodes.length > 0) {
      return {
        success: false,
        error: {
          message: `Voucher code already exist}`
        }
      };
    }

    const result = await createOneVoucherService(discountId, {
      code: payload.code,
      limit: payload.limit,
      status: 1
    });

    revalidatePath('/discounts');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('createOneVoucher error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create voucher code'
      }
    };
  }
};

// ==== DELETE A VOUCHER ==== //
export const deleteOneVoucher = async (id: string) => {
  try {
    const result = await deleteOneVoucherService(id);

    revalidatePath('/discounts');

    return {
      success: result.success,
      data: result.data || null,
      message: result.message
    };
  } catch (error: any) {
    console.log('deleteOneVoucher error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete Voucher'
      }
    };
  }
};

// ==== DELETE A DISCOUNT ==== //
export const deleteDiscount = async (id: string) => {
  try {
    const result = await deleteDiscountByIdService(id);

    revalidatePath('/discounts');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('deleteDiscount error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete Discount'
      }
    };
  }
};

// ==== DELETE BULK DISCOUNTS ==== //
export const bulkDeleteDiscounts = async (ids: string[]) => {
  try {
    const result = await bulkDeleteDiscountsByIdsService(ids);

    revalidatePath('/discounts');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteDiscounts error', error);
    return false;
  }
};
