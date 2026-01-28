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
import { requirePermission } from '@/lib/server-permissions';

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
  // Check view permission
  await requirePermission('discounts', 'view');
  
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
  // Check add permission
  await requirePermission('discounts', 'add');
  
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

    const result = await createDiscountService(
      {
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
            ? payload.vouchers.map((voucher) => ({
                code: voucher.code,
                limit: voucher.limit
              }))
            : undefined,
        status: payload.status
      },
      user
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Failed to create discount'
        }
      };
    }

    revalidatePath('/discounts');

    return {
      success: true,
      data: result.data,
      message: result.message
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
  // Check edit permission
  await requirePermission('discounts', 'edit');
  
  try {
    let hasSkippedVouchers = false;

    if (payload.isVoucher === 1) {
      const existingVouchers = await checkVouchers(id);

      if (
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

      const voucherCodes = payload.vouchers?.map((v) => v.code) ?? [];

      if (voucherCodes.length > 0) {
        const uniquePayloadCodes = [...new Set(voucherCodes)];

        const existingCodes =
          await checkUniqueVoucherCodes(uniquePayloadCodes);

        const newVoucherCodes = uniquePayloadCodes.filter(
          (code) => !existingCodes.includes(code)
        );

        const skippedDuplicateCount =
          voucherCodes.length - uniquePayloadCodes.length;

        const skippedExistingCount =
          uniquePayloadCodes.length - newVoucherCodes.length;

        hasSkippedVouchers =
          skippedDuplicateCount > 0 || skippedExistingCount > 0;
      }
    }

    const updatePayload: {
      name?: string;
      discountType?: number;
      discountMethod?: any[];
      paymentType?: any[];
      discountValue?: number;
      discountValueForeign?: number;
      fromDate?: Date;
      toDate?: Date;
      isVoucher?: number;
      autoApply?: boolean;
      status?: number;
      applyTo?: number;
      vouchers?: { code: string; limit: number }[];
    } = {};

    if (payload.name !== undefined) updatePayload.name = payload.name;
    if (payload.discountType !== undefined)
      updatePayload.discountType = Number(payload.discountType);
    if (payload.discountMethod !== undefined)
      updatePayload.discountMethod = payload.discountMethod;
    if (payload.paymentType !== undefined)
      updatePayload.paymentType = payload.paymentType;
    if (payload.discountValue !== undefined)
      updatePayload.discountValue = payload.discountValue;
    if (payload.discountValueForeign !== undefined)
      updatePayload.discountValueForeign = payload.discountValueForeign;
    if (payload.fromDate !== undefined) updatePayload.fromDate = payload.fromDate;
    if (payload.toDate !== undefined) updatePayload.toDate = payload.toDate;
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.applyTo !== undefined)
      updatePayload.applyTo = Number(payload.applyTo);
    if (payload.autoApply !== undefined)
      updatePayload.autoApply = payload.autoApply;
    if (payload.isVoucher !== undefined)
      updatePayload.isVoucher = Number(payload.isVoucher);

    if (payload.isVoucher === 1 && payload.vouchers && payload.vouchers.length > 0) {
      updatePayload.vouchers = payload.vouchers.map((v) => ({
        code: v.code,
        limit: v.limit
      }));
    }

    const result = await updateOneDiscountService(id, updatePayload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Failed to update discount'
        }
      };
    }

    revalidatePath('/discounts');

    return {
      success: true,
      message: hasSkippedVouchers
        ? 'Some voucher codes were ignored because they were duplicated or already exist in the system. Only new voucher codes were added.'
        : result.message || 'Discount updated successfully.',
      data: result.data
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
  // Check delete permission
  await requirePermission('discounts', 'delete');
  
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
  // Check delete permission
  await requirePermission('discounts', 'delete');
  
  try {
    const result = await bulkDeleteDiscountsByIdsService(ids);

    revalidatePath('/discounts');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteDiscounts error', error);
    return false;
  }
};
