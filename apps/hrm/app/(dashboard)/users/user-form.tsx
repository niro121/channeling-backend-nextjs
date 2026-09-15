'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { Ban, Save } from 'lucide-react';
import {
  Button,
  Combobox,
  CustomFormField,
  CustomSelectField,
  Label,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useDialogSafe,
  useToast
} from '@archmage/ui';
import { userTypes } from '@archmage/shared';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_REGEX
} from '@/lib/validations/password';
import type { HrmUser } from '@/types/user';
import {
  createNewUser,
  updateUser,
  updateUserPasswordAction
} from '@/app/actions/user-usergrp-actions/user.actions';
import { getStaffOptionsAction } from '@/app/actions/staff-actions/staff.actions';

type UserFormProps = {
  user: HrmUser | null;
  userGroupOptions: { id: string; name: string }[];
};

type StaffOption = { id: string; name: string; code: string };

const styleClasses = {
  parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'col-span-full sm:col-span-3'
};

export default function UserForm({ user, userGroupOptions }: UserFormProps) {
  const isEditMode = Boolean(user?.id);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffOptionsLoading, setStaffOptionsLoading] = useState(false);
  const saveAndCloseRef = useRef(false);
  const dialogContext = useDialogSafe();
  const { toast } = useToast();
  const router = useRouter();
  const setDialogOpen = dialogContext?.setDialogOpen ?? (() => {});

  useEffect(() => {
    const loadStaffOptions = async () => {
      setStaffOptionsLoading(true);
      const res = await getStaffOptionsAction();
      setStaffOptionsLoading(false);
      if (!res.isError && res.data) {
        setStaffOptions(res.data);
      }
    };
    loadStaffOptions();
  }, []);

  const settingsInitialValues = {
    name: user?.name ?? '',
    email: user?.email ?? '',
    username: user?.username ?? '',
    phone: user?.phone ?? '',
    twoFactorEnabled: user?.twoFactorEnabled ?? false,
    userGroupId: user?.userGroupId ?? '',
    status: user?.status !== undefined ? user.status : 1,
    staffId: user?.staffId ?? ''
  };

  const newUserInitialValues = {
    ...settingsInitialValues,
    password: '',
    confirmPassword: ''
  };

  const passwordInitialValues = {
    password: '',
    confirmPassword: ''
  };

  const settingsValidationSchema = Yup.object({
    name: Yup.string()
      .max(100, 'Must be less than 100 characters')
      .required('This field is mandatory'),
    email: Yup.string()
      .email('Invalid email address')
      .required('This field is mandatory'),
    username: Yup.string()
      .max(50, 'Must be less than 50 characters')
      .nullable()
      .transform((v) => (v === '' ? null : v)),
    phone: Yup.string()
      .nullable()
      .transform((v) => (v === '' ? null : v))
      .test(
        'mobile',
        'Mobile Number Ex: 07x xxxxxxx',
        (v) => v == null || MOBILE_NUMBER_REGEX.test(v)
      ),
    userGroupId: Yup.string().required('User group is required'),
    staffId: Yup.string()
      .required('Staff member is required')
      .test('not-empty', 'Staff member is required', (v) => !!v && v.trim() !== '')
  });

  const newUserValidationSchema = settingsValidationSchema.shape({
    password: Yup.string()
      .matches(
        PASSWORD_REGEX,
        'Password must contain uppercase, lowercase, numbers and special characters'
      )
      .min(MIN_PASSWORD_LENGTH, `Must be at least ${MIN_PASSWORD_LENGTH} characters long`)
      .required('This field is mandatory'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('This field is mandatory')
  });

  const passwordValidationSchema = Yup.object({
    password: Yup.string()
      .matches(
        PASSWORD_REGEX,
        'Password must contain uppercase, lowercase, numbers and special characters'
      )
      .min(MIN_PASSWORD_LENGTH, `Must be at least ${MIN_PASSWORD_LENGTH} characters long`)
      .required('This field is mandatory'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('This field is mandatory')
  });

  const handleSettingsSubmit = async (
    values: typeof settingsInitialValues,
    { resetForm }: FormikHelpers<typeof settingsInitialValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;

    try {
      setLoading(true);

      const payload: HrmUser = {
        name: values.name,
        email: values.email,
        username: values.username || null,
        phone: values.phone || null,
        twoFactorEnabled: values.twoFactorEnabled,
        userType: userTypes.staff,
        status: values.status,
        userGroupId: values.userGroupId,
        staffId: values.staffId,
        password: ''
      };

      const respond = isEditMode
        ? await updateUser(user!.id!, payload)
        : null;

      setLoading(false);

      if (!respond) return;

      if (respond.isError) {
        throw new Error(
          typeof respond.errors === 'object' &&
            respond.errors &&
            'message' in respond.errors
            ? String(respond.errors.message)
            : 'User save unsuccessful.'
        );
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'User was saved successfully'
      });

      if (dialogContext) {
        if (closeAfterSave) {
          resetForm({ values: settingsInitialValues });
          setDialogOpen(false);
        }
        return;
      }

      if (closeAfterSave) router.push('/users');
      else router.refresh();
    } catch (error: unknown) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'User save unsuccessful.'
      });
    }
  };

  const handleCreateSubmit = async (
    values: typeof newUserInitialValues,
    { resetForm }: FormikHelpers<typeof newUserInitialValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;

    try {
      setLoading(true);

      const respond = await createNewUser({
        name: values.name,
        email: values.email,
        username: values.username || null,
        phone: values.phone || null,
        twoFactorEnabled: values.twoFactorEnabled,
        userType: userTypes.staff,
        status: values.status,
        userGroupId: values.userGroupId,
        staffId: values.staffId,
        password: values.password
      });

      setLoading(false);

      if (respond.isError) {
        throw new Error(
          typeof respond.errors === 'object' &&
            respond.errors &&
            'message' in respond.errors
            ? String(respond.errors.message)
            : 'User save unsuccessful.'
        );
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'User was saved successfully'
      });

      if (dialogContext) {
        if (closeAfterSave) {
          resetForm({ values: newUserInitialValues });
          setDialogOpen(false);
        }
        return;
      }

      const newId =
        respond.data && typeof respond.data === 'object' && 'id' in respond.data
          ? String((respond.data as { id?: string }).id ?? '')
          : '';

      if (closeAfterSave) router.push('/users');
      else if (newId) router.push(`/users/${newId}/edit`);
      else router.push('/users');
    } catch (error: unknown) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'User save unsuccessful.'
      });
    }
  };

  const handlePasswordSubmit = async (
    values: typeof passwordInitialValues,
    { resetForm }: FormikHelpers<typeof passwordInitialValues>
  ) => {
    if (!user?.id) return;

    try {
      setPasswordLoading(true);
      const respond = await updateUserPasswordAction(user.id, values.password);
      setPasswordLoading(false);

      if (respond.isError) {
        throw new Error(
          typeof respond.errors === 'object' &&
            respond.errors &&
            'message' in respond.errors
            ? String(respond.errors.message)
            : 'Password update unsuccessful.'
        );
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Password was updated successfully'
      });
      resetForm();
    } catch (error: unknown) {
      setPasswordLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Password update unsuccessful.'
      });
    }
  };

  const renderSettingsFields = (
    formik: {
      values: typeof settingsInitialValues;
      errors: Partial<Record<keyof typeof settingsInitialValues, string>>;
      touched: Partial<Record<keyof typeof settingsInitialValues, boolean>>;
      handleChange: React.ChangeEventHandler<HTMLInputElement>;
      handleBlur: React.FocusEventHandler<HTMLInputElement>;
      setFieldValue: (field: string, value: unknown) => void;
    }
  ) => (
    <div className="grid gap-4 py-4">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Basic Information</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enter login details for this HRM staff user.
          </p>
        </div>

        <CustomFormField
          type="text"
          id="name"
          placeholder="Full Name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          required
          styleClasses={styleClasses}
        />

        <CustomFormField
          type="email"
          id="email"
          placeholder="Email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          required
          styleClasses={styleClasses}
        />

        <CustomFormField
          type="text"
          id="username"
          placeholder="Username (optional)"
          value={formik.values.username ?? ''}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          required={false}
          styleClasses={styleClasses}
        />

        <CustomFormField
          type="text"
          id="phone"
          placeholder="Mobile (optional)"
          value={formik.values.phone ?? ''}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          required={false}
          styleClasses={styleClasses}
        />

        <CustomSelectField
          id="userGroupId"
          placeholder="User Group"
          value={formik.values.userGroupId}
          onChange={(value) => formik.setFieldValue('userGroupId', value)}
          required
          options={userGroupOptions.map((group) => ({
            id: group.id,
            name: group.name
          }))}
          styleClasses={styleClasses}
        />

        <div className={styleClasses.parentDiv}>
          <Label className={styleClasses.labelClassName}>
            Linked Staff <span className="text-red-600">*</span>
          </Label>
          <div className={styleClasses.inputClassName}>
            <Combobox
              label={staffOptionsLoading ? 'Loading staff...' : 'Select Staff'}
              options={staffOptions.map((staff) => ({
                id: staff.id,
                name: staff.code ? `${staff.name} (${staff.code})` : staff.name
              }))}
              value={formik.values.staffId}
              defaultValue=""
              triggerClassName="w-full max-w-none font-normal!"
              popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
              onChange={(value) => formik.setFieldValue('staffId', value)}
            />
            {formik.touched.staffId && formik.errors.staffId ? (
              <p className="text-sm font-medium text-destructive mt-1">
                {formik.errors.staffId}
              </p>
            ) : null}
          </div>
        </div>

        <CustomSelectField
          id="status"
          placeholder="Status"
          value={formik.values.status?.toString()}
          onChange={(value) => formik.setFieldValue('status', parseInt(value, 10))}
          required
          options={[
            { id: '1', name: 'Active' },
            { id: '0', name: 'Inactive' }
          ]}
          styleClasses={styleClasses}
        />

        <div className="flex items-center space-x-2">
          <Switch
            id="twoFactorEnabled"
            checked={formik.values.twoFactorEnabled ?? false}
            onCheckedChange={(checked) =>
              formik.setFieldValue('twoFactorEnabled', !!checked)
            }
          />
          <Label htmlFor="twoFactorEnabled" className="text-sm font-medium">
            Require 2FA for this user
          </Label>
        </div>
      </div>
    </div>
  );

  const renderFormActions = (onCancel: () => void, isSaving: boolean) => (
    <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSaving}
        className="gap-1.5"
      >
        <Ban className="h-4 w-4" />
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={isSaving}
        className="gap-1.5"
        onClick={() => {
          saveAndCloseRef.current = false;
        }}
      >
        <Save className="h-4 w-4" />
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
      <Button
        type="submit"
        disabled={isSaving}
        className="gap-1.5"
        onClick={() => {
          saveAndCloseRef.current = true;
        }}
      >
        <Save className="h-4 w-4" />
        {isSaving ? 'Saving...' : 'Save & Close'}
      </Button>
    </div>
  );

  if (isEditMode) {
    return (
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Formik
            initialValues={settingsInitialValues}
            validationSchema={settingsValidationSchema}
            enableReinitialize
            onSubmit={handleSettingsSubmit}
          >
            {(formik) => (
              <Form className="w-full">
                {renderSettingsFields(formik)}
                {renderFormActions(
                  () =>
                    dialogContext ? setDialogOpen(false) : router.push('/users'),
                  loading
                )}
              </Form>
            )}
          </Formik>
        </TabsContent>

        <TabsContent value="password">
          <Formik
            initialValues={passwordInitialValues}
            validationSchema={passwordValidationSchema}
            onSubmit={handlePasswordSubmit}
          >
            {(formik) => (
              <Form className="w-full">
                <div className="grid gap-4 py-4">
                  <CustomFormField
                    type="password"
                    id="password"
                    placeholder="New Password"
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
                </div>
                <div className="flex justify-end border-t pt-4">
                  <Button type="submit" disabled={passwordLoading} className="gap-1.5">
                    <Save className="h-4 w-4" />
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <Formik
      initialValues={newUserInitialValues}
      validationSchema={newUserValidationSchema}
      onSubmit={handleCreateSubmit}
    >
      {(formik) => (
        <Form className="w-full">
          {renderSettingsFields(formik)}
          <Separator className="my-2" />
          <div className="space-y-4">
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
          </div>
          {renderFormActions(
            () => (dialogContext ? setDialogOpen(false) : router.push('/users')),
            loading
          )}
        </Form>
      )}
    </Formik>
  );
}
