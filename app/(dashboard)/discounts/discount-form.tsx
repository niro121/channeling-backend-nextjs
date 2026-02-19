'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { Ban, Save } from 'lucide-react';
import {
  Discount,
  DiscountFormValues,
  DiscountMethodOption,
  PaymentTypeOption
} from '@/types/discount';
import {
  createDiscount,
  updateOneDiscount
} from '@/app/actions/discount.action';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import { CustomMultiSelect } from '@/components/common/custom-mulit-select';
import { CustomSwitch } from '@/components/common/custom-switch';
import { VoucherModal } from './voucher-modal';
import { DiscountMethod, PaymentType } from '@prisma/client';
import { VoucherFormValues } from '@/types/voucher';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createOneVoucher } from '@/app/actions/discount.action';
import CustomTable from '@/components/common/custom-table';
import { VoucherColumns } from './voucher-columns';

type DiscountFormProps = {
  discount: Discount | null;
  applyToOptions: { id: string; name: string }[];
  discountMethodOptions: DiscountMethodOption[];
  paymentTypeOptions: PaymentTypeOption[];
  discountTypeOptions: { id: string; name: string }[];
  voucherOptions: { id: string; name: string }[];
  isEditPage?: boolean;
  user?: {
    id?: string;
    name?: string;
  };
};

export default function DiscountForm({
  discount,
  applyToOptions,
  discountMethodOptions,
  paymentTypeOptions,
  discountTypeOptions,
  voucherOptions,
  user
}: DiscountFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [loadingCode, setLoadingCode] = React.useState<boolean>(false);
  const saveAndCloseRef = React.useRef<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();
  const [voucherModalOpen, setVoucherModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'discount' | 'voucher'>(
    'discount'
  );
  const [isVoucher, setIsVoucher] = React.useState<number | undefined>(
    discount?.isVoucher
  );

  const initialValues: DiscountFormValues = React.useMemo(
    () => ({
      name: discount?.name ?? '',
      discountType: discount?.discountType ?? 0,
      discountMethod: discount?.discountMethod ?? [],
      paymentType: discount?.paymentType ?? [],
      discountValue: discount?.discountValue ?? 0,
      discountValueForeign: discount?.discountValueForeign ?? 0,
      fromDate: discount?.fromDate ?? new Date(),
      toDate: discount?.toDate ?? new Date(),
      isVoucher: discount?.isVoucher ?? 0,
      autoApply: discount?.autoApply ?? false,
      status: discount?.status ?? 1,
      applyTo: discount?.applyTo ?? 0,
      vouchers: discount?.vouchers ?? []
    }),
    [discount]
  );

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(150, 'Must be less than 150 characters')
      .required('This field is mandatory'),
    applyTo: Yup.number()
      .oneOf([0, 1], 'Select on of option')
      .required('This field is mandatory'),
    discountMethod: Yup.array()
      .of(
        Yup.mixed<DiscountMethod>().oneOf(
          discountMethodOptions.map((m) => m.type)
        )
      )
      .min(1, 'Select at least one booking method')
      .required('Booking method is required'),
    paymentType: Yup.array()
      .of(Yup.mixed<PaymentType>().oneOf(paymentTypeOptions.map((p) => p.type)))
      .min(1, 'Select at least one payment type')
      .required('Booking method is required'),
    discountType: Yup.number()
      .oneOf([0, 1], 'Select at least one discount type')
      .required('This field is mandatory'),
    discountValue: Yup.number().required('This field is mandatory'),
    discountValueForeign: Yup.number().required('This field is mandatory'),
    fromDate: Yup.date().required('This field is mandatory'),
    toDate: Yup.date().required('This field is mandatory'),
    status: Yup.number()
      .oneOf([0, 1], 'Visibility must be Unpublish (0) or Publish (1)')
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: DiscountFormValues,
    { setErrors, setTouched, resetForm }: FormikHelpers<DiscountFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;
    try {
      setLoading(true);
      let respond: any;

      if (discount && discount.id) {
        respond = await updateOneDiscount(discount.id, values, user);
        setLoading(false);

        if (!respond?.success) {
          // Map server-side validation errors to form fields
          if (respond.error?.issues) {
            const fieldErrors: Record<string, string> = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const errorMessages = respond.error.issues[key];
              if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                fieldErrors[key] = errorMessages[0];
              }
            });
            setErrors(fieldErrors);
            setTouched(
              Object.keys(fieldErrors).reduce((acc, key) => {
                acc[key] = true;
                return acc;
              }, {} as Record<string, boolean>)
            );
          }

          toast({
            variant: 'destructive',
            title: 'Error',
            description:
              respond.error?.message || 'Discount update unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: `${respond.message || 'Discount was updated successfully'}`
        });
        if (closeAfterSave) router.push('/discounts');
        else router.refresh();
      } else {
        respond = await createDiscount(values, user);
        setLoading(false);

        if (!respond?.success) {
          // Map server-side validation errors to form fields
          if (respond.error?.issues) {
            const fieldErrors: Record<string, string> = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const errorMessages = respond.error.issues[key];
              if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                fieldErrors[key] = errorMessages[0];
              }
            });
            setErrors(fieldErrors);
            setTouched(
              Object.keys(fieldErrors).reduce((acc, key) => {
                acc[key] = true;
                return acc;
              }, {} as Record<string, boolean>)
            );
          }

          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond.error?.message || 'Discount save unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Discount was created successfully'
        });
        const newId = respond?.data?.id;
        if (closeAfterSave) router.push('/discounts');
        else if (newId) router.push(`/discounts/${newId}/edit`);
        else router.push('/discounts');
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Discount save unsuccessful.'
      });
    }
  };

  const initialVoucherCodeValues: VoucherFormValues = {
    code: '',
    limit: 0
  };

  const handleSubmitVoucher = async (
    values: VoucherFormValues,
    { resetForm }: FormikHelpers<VoucherFormValues>
  ) => {
    const currentDiscount = discount;

    if (!currentDiscount?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please save the discount first'
      });
      return;
    }

    const discountId = currentDiscount?.id;

    try {
      setLoadingCode(true);

      const respond = await createOneVoucher(discountId, values);

      setLoadingCode(false);

      if (!respond?.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: respond.error?.message ?? 'Code save failed'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Voucher code added successfully'
      });

      resetForm();
      router.refresh();
    } catch (error: any) {
      setLoadingCode(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Code save unsuccessful.'
      });
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as any)}
      className="w-full"
    >
      <TabsList>
        <TabsTrigger value="discount" className="cursor-pointer">
          Discount
        </TabsTrigger>
        <TabsTrigger
          value="voucher"
          className="cursor-pointer"
          disabled={!discount?.id}
        >
          Voucher Codes
        </TabsTrigger>
      </TabsList>
      <div className={activeTab === 'discount' ? 'block' : 'hidden'}>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={validationSchema}
          enableReinitialize
        >
          {(formik) => {
            const styleClasses = {
              parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
              labelClassName: 'text-sm text-black font-semibold capitalize',
              inputClassName: 'col-span-full sm:col-span-3'
            };

            return (
              <>
                <Form className="w-full">
                  <div className="grid gap-4 border rounded-lg p-6">
                    <CustomFormField
                      type="text"
                      id="name"
                      placeholder="Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={styleClasses}
                    />

                    <CustomSelectField
                      id="applyTo"
                      placeholder="Apply To"
                      value={formik.values.applyTo.toString()}
                      onChange={(value) =>
                        formik.setFieldValue('applyTo', Number(value))
                      }
                      required
                      disabled={applyToOptions.length === 0}
                      options={applyToOptions}
                      styleClasses={styleClasses}
                    />

                    <CustomSwitch
                      id="autoApply"
                      placeholder="Discount Auto Apply"
                      checked={formik.values.autoApply}
                      onChange={(value) =>
                        formik.setFieldValue('autoApply', value)
                      }
                      styleClasses={styleClasses}
                    />

                    <CustomMultiSelect
                      id="discountMethod"
                      placeholder="Booking Method(s)"
                      value={formik.values.discountMethod.map(
                        (dm) =>
                          discountMethodOptions.find((o) => o.type === dm)
                            ?.id || ''
                      )}
                      onChange={(selectedIds: string[]) => {
                        const selectedTypes: DiscountMethod[] = selectedIds
                          .map((id) => {
                            const method = discountMethodOptions.find(
                              (m) => m.id === id
                            );
                            return method?.type;
                          })
                          .filter((type): type is DiscountMethod => !!type);

                        formik.setFieldValue('discountMethod', selectedTypes);
                        formik.setFieldTouched('discountMethod', true);
                      }}
                      required
                      disabled={discountMethodOptions.length === 0}
                      options={discountMethodOptions}
                      styleClasses={styleClasses}
                    />

                    <CustomMultiSelect
                      id="paymentType"
                      placeholder="Payment Type(s)"
                      value={formik.values.paymentType.map(
                        (pt) =>
                          paymentTypeOptions.find((o) => o.type === pt)?.id ||
                          ''
                      )}
                      onChange={(selectedIds: string[]) => {
                        const selectedTypes: PaymentType[] = selectedIds
                          .map((id) => {
                            const method = paymentTypeOptions.find(
                              (p) => p.id === id
                            );
                            return method?.type;
                          })
                          .filter((type): type is PaymentType => !!type);

                        formik.setFieldValue('paymentType', selectedTypes);
                        formik.setFieldTouched('paymentType', true);
                      }}
                      required
                      disabled={paymentTypeOptions.length === 0}
                      options={paymentTypeOptions}
                      styleClasses={styleClasses}
                    />

                    <CustomSelectField
                      id="discountType"
                      placeholder="Discount Type"
                      value={formik.values.discountType.toString()}
                      onChange={(value) => {
                        formik.setFieldValue('discountType', Number(value));
                        formik.setFieldTouched('discountType', true);
                      }}
                      required
                      disabled={discountTypeOptions.length === 0}
                      options={discountTypeOptions}
                      styleClasses={styleClasses}
                    />

                    <CustomFormField
                      type="number"
                      id="discountValue"
                      placeholder="Discount Value(Local)"
                      value={formik.values.discountValue}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={styleClasses}
                    />

                    <CustomFormField
                      type="number"
                      id="discountValueForeign"
                      placeholder="Discount Value(Foreign)"
                      value={formik.values.discountValueForeign}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={styleClasses}
                    />

                    <CustomDatePickerField
                      id="fromDate"
                      placeholder="From Date"
                      value={formik.values.fromDate}
                      required
                      onChange={(value) =>
                        formik.setFieldValue('fromDate', value)
                      }
                      onBlur={formik.handleBlur}
                      styleClasses={styleClasses}
                    />

                    <CustomDatePickerField
                      id="toDate"
                      placeholder="To Date"
                      value={formik.values.toDate}
                      required
                      onChange={(value) =>
                        formik.setFieldValue('toDate', value)
                      }
                      onBlur={formik.handleBlur}
                      styleClasses={styleClasses}
                    />

                    <CustomSelectField
                      id="isVoucher"
                      placeholder="Is Voucher"
                      value={formik.values.isVoucher?.toString()}
                      onChange={(value) => {
                        const numericValue = Number(value);
                        formik.setFieldValue('isVoucher', numericValue);

                        if (numericValue === 0) {
                          // formik.setFieldValue('vouchers', []);
                          setIsVoucher(0);
                        }

                        if (
                          numericValue === 1 &&
                          formik.values.vouchers?.length === 0
                        ) {
                          setIsVoucher(1);
                          setTimeout(() => setVoucherModalOpen(true), 500);
                        }
                      }}
                      required={false}
                      disabled={voucherOptions.length === 0}
                      options={voucherOptions}
                      styleClasses={styleClasses}
                    />

                    <CustomSelectField
                      id="status"
                      placeholder="Status"
                      value={formik.values.status?.toString()}
                      onChange={(value) =>
                        formik.setFieldValue('status', parseInt(value))
                      }
                      required
                      options={[
                        { id: '0', name: 'Unpublish' },
                        { id: '1', name: 'Publish' }
                      ]}
                      styleClasses={styleClasses}
                    />

                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                        type="button"
                        onClick={() => router.push('/discounts')}
                        disabled={loading}
                      >
                        <Ban className="h-4 w-4" />
                        <span>Cancel</span>
                      </Button>
                      <Button
                        disabled={loading}
                        size="sm"
                        type="button"
                        className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                        onClick={() => { saveAndCloseRef.current = false; formik.submitForm(); }}
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </Button>
                      <Button
                        disabled={loading}
                        size="sm"
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto gap-1 px-6"
                        onClick={() => { saveAndCloseRef.current = true; formik.submitForm(); }}
                      >
                        <Save className="h-4 w-4" />
                        <span>Save and Close</span>
                      </Button>
                    </div>
                  </div>
                </Form>
                {/* ==== VOUCHER CODE INSERTING POPUP ==== */}
                <VoucherModal
                  open={voucherModalOpen}
                  vouchers={formik.values.vouchers || []}
                  onClose={() => setVoucherModalOpen(false)}
                  onSave={(vouchers) =>
                    formik.setFieldValue('vouchers', vouchers)
                  }
                />
              </>
            );
          }}
        </Formik>
      </div>
      <div className={activeTab === 'voucher' ? 'block' : 'hidden'}>
        <Formik
          initialValues={initialVoucherCodeValues}
          onSubmit={handleSubmitVoucher}
          enableReinitialize
        >
          {(formik) => {
            const styleClasses = {
              parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
              labelClassName: 'text-sm text-black font-semibold capitalize',
              inputClassName: 'col-span-full sm:col-span-3'
            };
            return (
              <Form className="w-full">
                <div className="grid gap-4 border rounded-lg p-6">
                  <CustomFormField
                    type="text"
                    id="code"
                    placeholder="Code"
                    value={formik.values.code}
                    required
                    styleClasses={styleClasses}
                    onChange={formik.handleChange}
                    onBlur={(e) => {
                      const formattedValue = e.target.value
                        .trim()
                        .toUpperCase();

                      formik.setFieldValue('code', formattedValue);
                      formik.setFieldTouched('code', true);
                    }}
                  />
                  <CustomFormField
                    id="limit"
                    type="number"
                    placeholder="Limit"
                    value={formik.values.limit}
                    onChange={formik.handleChange}
                    required={false}
                    onBlur={() => {
                      const formattedLimit = Math.max(
                        0,
                        Math.round(Number(formik.values.limit))
                      );
                      formik.setFieldValue('limit', formattedLimit);
                      formik.setFieldTouched('limit', true);
                    }}
                    styleClasses={styleClasses}
                  />
                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                      type="button"
                      disabled={loadingCode}
                      onClick={() => formik.resetForm()}
                    >
                      <Ban className="h-4 w-4" />
                      <span>Cancel</span>
                    </Button>
                    <Button
                      disabled={loadingCode}
                      size={'sm'}
                      type="submit"
                      className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </Button>
                  </div>
                </div>
              </Form>
            );
          }}
        </Formik>
        <CustomTable
          heading="Voucher Codes"
          subheading={`Included voucher codes for ${discount?.name}`}
          data={discount?.vouchers ?? []}
          columns={VoucherColumns}
          rowCount={discount?.vouchers?.length ?? 0}
        />
      </div>
    </Tabs>
  );
}
