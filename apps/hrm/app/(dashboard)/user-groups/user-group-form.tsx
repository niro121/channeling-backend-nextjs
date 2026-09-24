'use client';

import React, { useRef, useState } from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Ban, RefreshCw, Save } from 'lucide-react';
import {
  Button,
  Checkbox,
  CustomFormField,
  CustomSelectField,
  Label,
  Separator,
  Switch,
  Textarea,
  useDialogSafe,
  useToast
} from '@archmage/ui';
import { TWO_FACTOR_AUTH } from '@archmage/shared';
import { useRouter } from 'next/navigation';
import {
  PERMISSION_ACTIONS,
  RESOURCES,
  type Permissions,
  type ResourcePermissions,
  type ResourceWithOptionalActions,
  type UserGroup
} from '@/types/user-group';
import {
  createNewUserGroup,
  updateUserGroup
} from '@/app/actions/user-usergrp-actions/user-group.actions';

type UserGroupFormProps = {
  userGroup: UserGroup | null;
  sessionUserType: number | undefined;
};

function initializePermissions(): Permissions {
  const perms: Permissions = {};
  RESOURCES.forEach((resource) => {
    if (resource.customActions?.length) {
      perms[resource.id] = Object.fromEntries(
        resource.customActions.map((a) => [a.id, false])
      ) as ResourcePermissions;
    } else {
      perms[resource.id] = {
        view: false,
        add: false,
        edit: false,
        delete: false
      };
    }
  });
  return perms;
}

export default function UserGroupForm({
  userGroup,
  sessionUserType
}: UserGroupFormProps) {
  const initialValues: UserGroup = {
    id: userGroup?.id ?? '',
    name: userGroup?.name ?? '',
    description: userGroup?.description ?? '',
    status: userGroup?.status !== undefined ? userGroup.status : 1,
    permissions: userGroup?.permissions || initializePermissions(),
    twoFactorEnabled: userGroup?.twoFactorEnabled ?? false,
    twoFactorMethods: Array.isArray(userGroup?.twoFactorMethods)
      ? userGroup.twoFactorMethods
      : [],
    createdAt: userGroup?.createdAt ?? new Date()
  };

  const [loading, setLoading] = useState(false);
  const saveAndCloseRef = useRef(false);
  const dialogContext = useDialogSafe();
  const { toast } = useToast();
  const router = useRouter();
  const setDialogOpen = dialogContext?.setDialogOpen ?? (() => {});

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(100, 'Must be less than 100 characters')
      .required('This field is mandatory'),
    status: Yup.number()
      .oneOf([0, 1], 'Status must be Active (1) or Inactive (0)')
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: UserGroup,
    { resetForm }: FormikHelpers<UserGroup>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;

    try {
      setLoading(true);

      const respond = userGroup?.id
        ? await updateUserGroup(userGroup.id, values)
        : await createNewUserGroup(values);

      setLoading(false);

      if (respond.isError) {
        throw new Error(respond.errors.message);
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'User group was saved successfully'
      });

      if (dialogContext) {
        if (closeAfterSave) {
          resetForm({ values: initialValues });
          setDialogOpen(false);
        }
        return;
      }

      if (userGroup?.id) {
        if (closeAfterSave) router.push('/user-groups');
        else router.refresh();
        return;
      }

      const newId =
        respond.data && typeof respond.data === 'object' && 'id' in respond.data
          ? String((respond.data as { id?: string }).id ?? '')
          : '';
      if (closeAfterSave) router.push('/user-groups');
      else if (newId) router.push(`/user-groups/${newId}/edit`);
      else router.push('/user-groups');
    } catch (error: unknown) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'User group save unsuccessful.'
      });
    }
  };

  const handleSyncPermissions = (formik: {
    setFieldValue: (field: string, value: Permissions) => void;
  }) => {
    const syncedPermissions: Permissions = {};
    RESOURCES.forEach((resource) => {
      if (resource.customActions?.length) {
        syncedPermissions[resource.id] = Object.fromEntries(
          resource.customActions.map((a) => [a.id, true])
        ) as ResourcePermissions;
      } else {
        syncedPermissions[resource.id] = {
          view: true,
          add: true,
          edit: true,
          delete: true
        };
      }
    });
    formik.setFieldValue('permissions', syncedPermissions);
  };

  const handleSelectAll = (
    formik: {
      values: UserGroup;
      setFieldValue: (field: string, value: Permissions) => void;
    },
    resource: ResourceWithOptionalActions
  ) => {
    const currentPermissions = { ...formik.values.permissions };
    if (resource.customActions?.length) {
      currentPermissions[resource.id] = Object.fromEntries(
        resource.customActions.map((a) => [a.id, true])
      ) as ResourcePermissions;
    } else {
      const actions = resource.actions?.length
        ? resource.actions
        : (['view', 'add', 'edit', 'delete'] as const);
      currentPermissions[resource.id] = {
        view: actions.includes('view'),
        add: actions.includes('add'),
        edit: actions.includes('edit'),
        delete: actions.includes('delete')
      };
    }
    formik.setFieldValue('permissions', currentPermissions);
  };

  const handleDeselectAll = (
    formik: {
      values: UserGroup;
      setFieldValue: (field: string, value: Permissions) => void;
    },
    resource: ResourceWithOptionalActions
  ) => {
    const currentPermissions = { ...formik.values.permissions };
    const existing = formik.values.permissions[resource.id] || {};
    if (resource.customActions?.length) {
      currentPermissions[resource.id] = Object.fromEntries(
        resource.customActions.map((a) => [a.id, false])
      ) as ResourcePermissions;
    } else {
      const actions = resource.actions?.length
        ? resource.actions
        : (['view', 'add', 'edit', 'delete'] as const);
      currentPermissions[resource.id] = {
        view: actions.includes('view') ? false : (existing.view ?? false),
        add: actions.includes('add') ? false : (existing.add ?? false),
        edit: actions.includes('edit') ? false : (existing.edit ?? false),
        delete: actions.includes('delete') ? false : (existing.delete ?? false)
      };
    }
    formik.setFieldValue('permissions', currentPermissions);
  };

  const handlePermissionChange = (
    formik: {
      values: UserGroup;
      setFieldValue: (field: string, value: Permissions) => void;
    },
    resourceId: string,
    action: string,
    value: boolean
  ) => {
    const currentPermissions = { ...formik.values.permissions };
    if (!currentPermissions[resourceId]) {
      currentPermissions[resourceId] = {};
    }
    currentPermissions[resourceId] = {
      ...currentPermissions[resourceId],
      [action]: value
    };
    formik.setFieldValue('permissions', currentPermissions);
  };

  const styleClasses = {
    parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
    labelClassName: 'text-sm text-black font-semibold capitalize',
    inputClassName: 'col-span-full sm:col-span-3'
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize
    >
      {(formik) => (
        <Form className="w-full">
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  Basic Information
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter the basic details for this HRM user group.
                </p>
              </div>

              <CustomFormField
                type="text"
                id="name"
                placeholder="Group Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Description"
                  value={formik.values.description || ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={styleClasses.inputClassName}
                  rows={3}
                />
              </div>

              <CustomSelectField
                id="status"
                placeholder="Status"
                value={formik.values.status?.toString()}
                onChange={(value) =>
                  formik.setFieldValue('status', parseInt(value, 10))
                }
                required
                options={[
                  { id: '1', name: 'Active' },
                  { id: '0', name: 'Inactive' }
                ]}
                styleClasses={styleClasses}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  Two-factor authentication
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  When enabled, users in this group must complete 2FA at login.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="twoFactorEnabled"
                  checked={formik.values.twoFactorEnabled ?? false}
                  onCheckedChange={(checked) =>
                    formik.setFieldValue('twoFactorEnabled', !!checked)
                  }
                />
                <Label
                  htmlFor="twoFactorEnabled"
                  className="text-sm font-medium"
                >
                  Require 2FA for this group
                </Label>
              </div>
              {formik.values.twoFactorEnabled && (
                <div className="space-y-2 pl-2">
                  <Label className="text-sm font-medium">Allowed methods</Label>
                  <div className="flex flex-wrap gap-4">
                    {TWO_FACTOR_AUTH.map((method) => {
                      const methods = formik.values.twoFactorMethods ?? [];
                      const isChecked = methods.includes(method.id);
                      return (
                        <div
                          key={method.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`2fa-${method.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...methods, method.id]
                                : methods.filter((m) => m !== method.id);
                              formik.setFieldValue('twoFactorMethods', next);
                            }}
                          />
                          <Label
                            htmlFor={`2fa-${method.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {method.option}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Permissions</h3>
                  <p className="text-sm text-muted-foreground">
                    Select permissions for this group. Resources match HRM
                    modules only.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncPermissions(formik)}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Permissions
                </Button>
              </div>

              <div className="space-y-6">
                {RESOURCES.map((resource) => {
                  const defaultPerms = resource.customActions?.length
                    ? Object.fromEntries(
                        resource.customActions.map((a) => [a.id, false])
                      )
                    : { view: false, add: false, edit: false, delete: false };
                  const resourcePermissions = {
                    ...defaultPerms,
                    ...formik.values.permissions[resource.id]
                  };

                  const actionsToShow = resource.customActions?.length
                    ? resource.customActions
                    : resource.actions?.length
                      ? PERMISSION_ACTIONS.filter((a) =>
                          resource.actions!.includes(a.id)
                        )
                      : PERMISSION_ACTIONS;

                  return (
                    <div key={resource.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">
                          {resource.name}
                        </Label>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleSelectAll(formik, resource)}
                            className="text-sm text-muted-foreground hover:text-foreground underline"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeselectAll(formik, resource)}
                            className="text-sm text-muted-foreground hover:text-foreground underline"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {actionsToShow.map((action) => {
                          const actionId = action.id;
                          const label = action.name;
                          const description =
                            'description' in action
                              ? ((action as { description?: string })
                                  .description ?? '')
                              : '';

                          return (
                            <div
                              key={actionId}
                              className="flex items-center space-x-2 p-3 border rounded-md"
                            >
                              <Checkbox
                                id={`${resource.id}-${actionId}`}
                                checked={!!resourcePermissions[actionId]}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(
                                    formik,
                                    resource.id,
                                    actionId,
                                    checked as boolean
                                  )
                                }
                              />
                              <div className="flex-1">
                                <Label
                                  htmlFor={`${resource.id}-${actionId}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {label}
                                </Label>
                                {description ? (
                                  <p className="text-xs text-muted-foreground">
                                    {description}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                type="button"
                onClick={() => {
                  if (dialogContext) {
                    setDialogOpen(false);
                    formik.resetForm({ values: initialValues });
                  } else {
                    router.push('/user-groups');
                  }
                }}
                disabled={loading}
              >
                <Ban className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button
                disabled={!sessionUserType || loading}
                size="sm"
                type="button"
                className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                onClick={() => {
                  saveAndCloseRef.current = false;
                  formik.submitForm();
                }}
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </Button>
              <Button
                disabled={!sessionUserType || loading}
                size="sm"
                type="button"
                variant="secondary"
                className="w-full sm:w-auto gap-1 px-6"
                onClick={() => {
                  saveAndCloseRef.current = true;
                  formik.submitForm();
                }}
              >
                <Save className="h-4 w-4" />
                <span>Save and Close</span>
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}
