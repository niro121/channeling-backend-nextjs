'use client';

import React, { useState } from 'react';
import { Agency, AgencyFormValues } from '@/types/agency';
import { Form, Formik, FormikHelpers } from 'formik';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { Ban, Save } from 'lucide-react';
import * as Yup from 'yup';
import {
  createAgency,
  updateAgency,
  createAgencyLogin,
  createAgencyAccount
} from '@/app/actions/agency.actions';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatLKR } from '@/lib/format-money';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { BookOpen, Pencil, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import CustomCheckedField from '@/components/common/custom-checked-field';

type AgencyFormProps = {
  agency?: Agency | null;
  parentAgencies?: { id: string; name: string }[];
  locations?: { id: string; name: string }[];
  isEditPage?: boolean;
};

const AgencyForm = ({
  agency,
  parentAgencies = [],
  locations = [],
  isEditPage = false
}: AgencyFormProps) => {
  const initialValues: AgencyFormValues = {
    name: agency?.name || '',
    code: agency?.code || '',
    chequePrintingName: agency?.chequePrintingName || '',
    parentAgencyId: agency?.parentAgencyId || '',
    allowedCreditLimit: agency?.allowedCreditLimit || 0,
    phone: agency?.phone || '',
    mobile: agency?.mobile || '',
    fax: agency?.fax || '',
    email: agency?.email || '',
    website: agency?.website || '',
    memo: agency?.memo || '',
    addressLine1: agency?.addressLine1 || '',
    addressLine2: agency?.addressLine2 || '',
    city: agency?.city || '',
    contactPersonName: agency?.contactPersonName || '',
    contactPersonPhone: agency?.contactPersonPhone || '',
    contactPersonMobile: agency?.contactPersonMobile || '',
    contactPersonEmail: agency?.contactPersonEmail || '',
    sendSms: agency?.sendSms ?? 1,
    status: agency?.status !== undefined && agency.status !== null ? agency.status : 1,
    // Login tab
    fullName: '',
    loginEmail: '', // User email for login
    password: '',
    confirmPassword: '',
    locationId: ''
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [tab, setTab] = useState('agencyDetails');
  const saveAndCloseRef = React.useRef<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const styleClasses = {
    parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
    labelClassName: 'text-sm text-black font-semibold capitalize',
    inputClassName: 'col-span-full sm:col-span-3'
  };

  const agencyDetailsSchema = Yup.object({
    name: Yup.string()
      .required('Name is required')
      .max(100, 'Must be less than 100 characters'),
    chequePrintingName: Yup.string()
      .required('Cheque printing name is required')
      .max(100, 'Must be less than 100 characters'),
    allowedCreditLimit: Yup.number()
      .transform((_, val) => (val === '' || val === null || val === undefined ? undefined : Number(val)))
      .required('Allowed credit limit is required')
      .min(0, 'Must be 0 or greater'),
    contactPersonName: Yup.string()
      .required('Contact person name is required')
      .max(100, 'Must be less than 100 characters'),
    sendSms: Yup.number().oneOf([0, 1], 'Invalid value'),
    status: Yup.number()
      .transform((_, val) => (val === '' || val === null || val === undefined ? undefined : Number(val)))
      .required('Status is required')
      .oneOf([0, 1], 'Status must be either 0 or 1'),
    email: Yup.string()
      .transform((val) => (val === '' ? null : val))
      .email('Invalid email')
      .nullable(),
    contactPersonEmail: Yup.string()
      .transform((val) => (val === '' ? null : val))
      .email('Invalid email')
      .nullable()
  });

  const loginSchema = Yup.object({
    fullName: Yup.string().required('Full name is required'),
    loginEmail: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
    confirmPassword: Yup.string()
      .required('Confirm password is required')
      .oneOf([Yup.ref('password')], 'Passwords must match')
  });

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={agencyDetailsSchema}
      onSubmit={() => {}}
      enableReinitialize
    >
      {(formik) => {
        const handleAgencySubmitLocal = async () => {
          const closeAfterSave = saveAndCloseRef.current;
          try {
            // Validate agency details fields
            await agencyDetailsSchema.validate(formik.values, { abortEarly: false });
            
            // Coerce values for server (Zod expects numbers; HTML inputs can send strings)
            const payload = {
              ...formik.values,
              allowedCreditLimit: Number(formik.values.allowedCreditLimit),
              status: Number(formik.values.status),
              sendSms: Number(formik.values.sendSms)
            };
            
            setLoading(true);
            let respond: any;

            if (agency && agency.id) {
              respond = await updateAgency(agency.id, payload);
            } else {
              respond = await createAgency(payload);
            }

            setLoading(false);
            
            if (respond.isError) {
              // Build user-friendly description from first field error for debugging
              const firstIssue = respond.errors?.issues && typeof respond.errors.issues === 'object'
                ? Object.entries(respond.errors.issues).find(
                    ([_, arr]) => Array.isArray(arr) && arr.length > 0 && arr[0]
                  ) as [string, string[]] | undefined
                : undefined;
              const firstErrorDesc = firstIssue
                ? `${firstIssue[0]}: ${firstIssue[1][0]}`
                : respond.errors?.message || 'Please check the form for errors.';
              // Handle server-side validation errors
              if (respond.errors?.issues) {
                // Set field-level errors from server validation
                const fieldErrors: any = {};
                const touchedFields: any = {};
                Object.keys(respond.errors.issues).forEach((key) => {
                  const errorArray = respond.errors.issues[key];
                  if (Array.isArray(errorArray) && errorArray.length > 0) {
                    fieldErrors[key] = errorArray[0];
                    touchedFields[key] = true;
                  }
                });
                formik.setErrors(fieldErrors);
                formik.setTouched(touchedFields);
                toast({
                  variant: 'destructive',
                  title: 'Validation Error',
                  description: firstErrorDesc
                });
              } else {
                toast({
                  variant: 'destructive',
                  title: 'Error',
                  description: respond.errors?.message || 'Agency save unsuccessful.'
                });
              }
              return;
            }

            toast({
              variant: 'success',
              title: 'Success',
              description: `Agency was ${agency?.id ? 'updated' : 'created'} successfully`
            });
            if (agency?.id) {
              if (closeAfterSave) router.push('/agencies');
              else router.refresh();
            } else {
              const newId = respond?.data?.id;
              if (closeAfterSave) router.push('/agencies');
              else if (newId) router.push(`/agencies/${newId}/edit`);
              else router.push('/agencies');
            }
          } catch (error: any) {
            setLoading(false);
            if (error.name === 'ValidationError') {
              // Highlight client-side validation errors
              const errors = error.inner.reduce((acc: any, err: any) => {
                acc[err.path] = err.message;
                return acc;
              }, {});
              const touched = error.inner.reduce((acc: any, err: any) => {
                acc[err.path] = true;
                return acc;
              }, {});
              formik.setErrors(errors);
              formik.setTouched(touched);
              const firstMsg = error.inner?.[0];
              const description = firstMsg
                ? `${firstMsg.path}: ${firstMsg.message}`
                : 'Please check the Agency Details tab for errors.';
              toast({
                variant: 'destructive',
                title: 'Validation Error',
                description
              });
            } else {
              toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message ?? 'Agency save unsuccessful.'
              });
            }
          }
        };

        const handleLoginSubmitLocal = async () => {
          try {
            // 1. Validate Login fields
            await loginSchema.validate(formik.values, { abortEarly: false });
            
            setLoading(true);

            // Create/Update login (User account)
            const respond = await createAgencyLogin(agency?.id, {
              fullName: formik.values.fullName || '',
              loginEmail: formik.values.loginEmail || '',
              password: formik.values.password,
              locationId: formik.values.locationId
            });

            setLoading(false);
            if (respond.isError) {
              throw new Error(respond.errors.message);
            }

            toast({
              variant: 'success',
              title: 'Success',
              description: agency?.id 
                ? 'Agency login created and linked successfully' 
                : 'User login created successfully. Please save Agency Details to link it.'
            });

            // Reset password fields
            formik.setFieldValue('password', '');
            formik.setFieldValue('confirmPassword', '');
            
          } catch (error: any) {
            setLoading(false);
            if (error.name === 'ValidationError') {
              formik.setErrors(
                error.inner.reduce((acc: any, err: any) => {
                  acc[err.path] = err.message;
                  return acc;
                }, {})
              );
              toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: 'Please check the login fields for errors.'
              });
            } else {
              toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message ?? 'Login creation unsuccessful.'
              });
            }
          }
        };

        return (
          <Form className="w-full">
            <Tabs
              defaultValue="agencyDetails"
              className="w-full"
              value={tab}
              onValueChange={setTab}
            >
              <TabsList>
                <TabsTrigger value="agencyDetails" className="cursor-pointer">
                  Agency Details
                </TabsTrigger>
                <TabsTrigger value="createLogin" className="cursor-pointer">
                  Create Login
                </TabsTrigger>
              </TabsList>

              <TabsContent value="agencyDetails">
                {isEditPage && agency && (
                  <div className="grid gap-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-6 mb-6">
                    <h3 className="text-lg font-semibold">Balance</h3>
                    {agency.accountId ? (
                      <>
                        <div className={styleClasses.parentDiv}>
                          <Label className={styleClasses.labelClassName}>Current balance (from account)</Label>
                          <div className={styleClasses.inputClassName}>
                            <span className="font-medium tabular-nums">
                              {formatLKR(Number(agency.balance ?? 0))}
                            </span>
                          </div>
                        </div>
                        <div className={styleClasses.parentDiv}>
                          <Label className={styleClasses.labelClassName}>Linked account</Label>
                          <div className={styleClasses.inputClassName}>
                            <span className="text-muted-foreground">
                              {agency.accountName ?? agency.accountCode ?? '—'}
                              {agency.accountCode && agency.accountName
                                ? ` (${agency.accountCode})`
                                : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            asChild
                          >
                            <Link href={`/accounting/${agency.accountId}/statement`}>
                              <BookOpen className="h-4 w-4" />
                              Statement
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            asChild
                          >
                            <Link
                              href={`/accounting/${agency.accountId}/edit`}
                              className="inline-flex items-center gap-1.5"
                            >
                              <Pencil className="h-4 w-4" />
                              Open account
                            </Link>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground text-sm">No GL account linked. Create one to track balance and view statement.</p>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={creatingAccount}
                          onClick={async () => {
                            if (!agency.id) return;
                            setCreatingAccount(true);
                            try {
                              const res = await createAgencyAccount(agency.id);
                              if (res.success) {
                                toast({
                                  variant: 'success',
                                  title: 'Success',
                                  description: res.message ?? 'GL account created.',
                                });
                                router.refresh();
                              } else {
                                toast({
                                  variant: 'destructive',
                                  title: 'Error',
                                  description: res.message ?? 'Failed to create GL account.',
                                });
                              }
                            } finally {
                              setCreatingAccount(false);
                            }
                          }}
                        >
                          <PlusCircle className="h-4 w-4" />
                          {creatingAccount ? 'Creating…' : 'Create GL account'}
                        </Button>
                      </>
                    )}
                  </div>
                )}
                <div className="grid gap-4 border rounded-lg p-6">
                  {/* Name */}
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

                  {/* Code (Auto Generated) */}
                  <div className={styleClasses.parentDiv}>
                    <Label className={styleClasses.labelClassName}>
                      Code (Auto Generated)
                    </Label>
                    <div className={styleClasses.inputClassName}>
                      <span className="text-muted-foreground">
                        {formik.values.code || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Parent Agency */}
                  <div className={styleClasses.parentDiv}>
                    <Label className={styleClasses.labelClassName}>
                      Parent Agency
                    </Label>
                    <div className={styleClasses.inputClassName}>
                      <CustomSelectField
                        id="parentAgencyId"
                        placeholder="Select"
                        value={formik.values.parentAgencyId || ''}
                        onChange={(value) =>
                          formik.setFieldValue('parentAgencyId', value)
                        }
                        required={false}
                        options={parentAgencies.map((a) => ({
                          id: a.id,
                          name: a.name
                        }))}
                        styleClasses={{
                          ...styleClasses,
                          parentDiv: '',
                          inputClassName: '',
                          labelClassName: 'hidden'
                        }}
                      />
                    </div>
                  </div>

                  {/* Cheque Printing Name */}
                  <CustomFormField
                    type="text"
                    id="chequePrintingName"
                    placeholder="Cheque Printing Name"
                    value={formik.values.chequePrintingName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={styleClasses}
                  />

                  {/* Allowed Credit Limit: soft limit for bookings; hard limit is account minBalanceAllowed */}
                  <CustomFormField
                    type="number"
                    id="allowedCreditLimit"
                    placeholder="Allowed Credit Limit"
                    value={formik.values.allowedCreditLimit}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={styleClasses}
                  />

                  {/* Contact Information */}
                  <CustomFormField
                    type="text"
                    id="phone"
                    placeholder="Phone"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="text"
                    id="mobile"
                    placeholder="Mobile"
                    value={formik.values.mobile}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="text"
                    id="fax"
                    placeholder="Fax"
                    value={formik.values.fax}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="email"
                    id="email"
                    placeholder="Email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  {/* Address */}
                  <CustomFormField
                    type="text"
                    id="addressLine1"
                    placeholder="Address Line 1"
                    value={formik.values.addressLine1}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="text"
                    id="addressLine2"
                    placeholder="Address Line 2"
                    value={formik.values.addressLine2}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="text"
                    id="city"
                    placeholder="City"
                    value={formik.values.city}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="text"
                    id="website"
                    placeholder="Website"
                    value={formik.values.website}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  {/* Memo */}
                  <div className={styleClasses.parentDiv}>
                    <Label className={styleClasses.labelClassName}>Memo</Label>
                    <div className={styleClasses.inputClassName}>
                      <Textarea
                        id="memo"
                        value={formik.values.memo || ''}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="Memo"
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Contact Person Details */}
                  <h3 className="col-span-full text-lg font-semibold">
                    Contact Person Details
                  </h3>

                  <CustomFormField
                    type="text"
                    id="contactPersonName"
                    placeholder="Contact Person Name"
                    value={formik.values.contactPersonName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="text"
                    id="contactPersonPhone"
                    placeholder="Contact Person Phone"
                    value={formik.values.contactPersonPhone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="text"
                    id="contactPersonMobile"
                    placeholder="Contact Person Mobile"
                    value={formik.values.contactPersonMobile}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="email"
                    id="contactPersonEmail"
                    placeholder="Contact Person Email"
                    value={formik.values.contactPersonEmail}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={styleClasses}
                  />

                  {/* Send SMS */}
                  <div className={styleClasses.parentDiv}>
                    <Label className={styleClasses.labelClassName}>
                      Send SMS
                    </Label>
                    <div className={styleClasses.inputClassName}>
                      <CustomCheckedField
                        id="sendSms"
                        placeholder=""
                        value={formik.values.sendSms}
                        onChange={(value) => formik.setFieldValue('sendSms', value)}
                        required={false}
                        options={[
                          { id: 0, name: 'No' },
                          { id: 1, name: 'Yes' }
                        ]}
                        styleClasses={{
                          ...styleClasses,
                          parentDiv: '',
                          labelClassName: 'hidden'
                        }}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className={styleClasses.parentDiv}>
                    <Label className={styleClasses.labelClassName}>
                      Status <span className="text-red-600">*</span>
                    </Label>
                    <div className={styleClasses.inputClassName}>
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
                        styleClasses={{
                          ...styleClasses,
                          parentDiv: '',
                          inputClassName: '',
                          labelClassName: 'hidden'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                    type="button"
                    onClick={() => router.push('/agencies')}
                    disabled={loading}
                  >
                    <Ban className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    disabled={loading}
                    size="sm"
                    type="button"
                    onClick={() => { saveAndCloseRef.current = false; handleAgencySubmitLocal(); }}
                    className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
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
                    onClick={() => { saveAndCloseRef.current = true; handleAgencySubmitLocal(); }}
                  >
                    <Save className="h-4 w-4" />
                    <span>Save and Close</span>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="createLogin">
                <div className="grid gap-4 border rounded-lg p-6">
                  <CustomFormField
                    type="text"
                    id="fullName"
                    placeholder="Full Name"
                    value={formik.values.fullName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="email"
                    id="loginEmail"
                    placeholder="Email"
                    value={formik.values.loginEmail || ''}
                    onChange={(e) =>
                      formik.setFieldValue('loginEmail', e.target.value)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="password"
                    id="password"
                    placeholder="Password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={styleClasses}
                  />

                  <CustomFormField
                    type="password"
                    id="confirmPassword"
                    placeholder="Confirm Password"
                    value={formik.values.confirmPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={styleClasses}
                  />

                  <div className={styleClasses.parentDiv}>
                    <Label className={styleClasses.labelClassName}>
                      Location
                    </Label>
                    <div className={styleClasses.inputClassName}>
                      <CustomSelectField
                        id="locationId"
                        placeholder="Select"
                        value={formik.values.locationId || ''}
                        onChange={(value) =>
                          formik.setFieldValue('locationId', value)
                        }
                        required={false}
                        options={locations.map((l) => ({
                          id: l.id,
                          name: l.name
                        }))}
                        styleClasses={{
                          ...styleClasses,
                          parentDiv: '',
                          inputClassName: '',
                          labelClassName: 'hidden'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                    type="button"
                    onClick={() => {
                      router.push('/agencies');
                    }}
                    disabled={loading}
                  >
                    <Ban className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    disabled={loading}
                    size={'sm'}
                    type="button"
                    onClick={handleLoginSubmitLocal}
                    className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </Form>
        );
      }}
    </Formik>
  );
};

export default AgencyForm;
