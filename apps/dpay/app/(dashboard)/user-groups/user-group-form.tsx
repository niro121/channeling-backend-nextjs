'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Ban, RefreshCw, Save } from 'lucide-react';
import {
  Button,
  Checkbox,
  CustomFormField,
  CustomSelectField,
  Label,
  Separator,
  Textarea,
  useToast,
} from '@archmage/ui';
import { PERMISSION_ACTIONS, type Permissions, type UserGroup } from '@archmage/shared';
import { saveDpayUserGroupAction } from '@/app/actions/user-groups/user-group.actions';
import {
  DPAY_REPORTS,
  REPORT_CATEGORIES,
  reportPermissionFlags,
  reportPrivilegeChecked,
} from '@/lib/report-privileges';
import { RESOURCES, groupPermissionResources } from '@/types/user-group';

const styleClasses = {
  parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'col-span-full sm:col-span-3',
};

function emptyPermissions(): Permissions {
  const permissions: Permissions = {};
  for (const resource of RESOURCES) {
    permissions[resource.id] = Object.fromEntries(resource.actions.map((action) => [action, false]));
  }
  return permissions;
}

function mergePermissions(stored?: Permissions | null): Permissions {
  const permissions = emptyPermissions();
  for (const resource of RESOURCES) {
    permissions[resource.id] = { ...permissions[resource.id], ...stored?.[resource.id] };
  }
  return permissions;
}

export function UserGroupForm({
  userGroup,
  sessionUserType,
}: {
  userGroup: UserGroup | null;
  sessionUserType?: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const saveAndCloseRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(userGroup?.id);

  const initialValues: UserGroup = {
    id: userGroup?.id,
    name: userGroup?.name ?? '',
    description: userGroup?.description ?? '',
    status: userGroup?.status === 0 ? 0 : 1,
    app: 'dpay',
    permissions: mergePermissions(userGroup?.permissions),
  };

  const onSubmit = async (values: UserGroup, { setSubmitting }: FormikHelpers<UserGroup>) => {
    const closeAfterSave = saveAndCloseRef.current;
    setLoading(true);
    try {
      const saved = await saveDpayUserGroupAction({
        ...values,
        name: values.name.trim(),
        description: values.description ?? '',
        app: 'dpay',
      });
      toast({ title: 'Success', description: 'User group was saved successfully' });
      if (closeAfterSave || !saved.id) {
        router.push('/user-groups');
      } else if (!isEdit) {
        router.push(`/user-groups/${saved.id}/edit`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'User group save unsuccessful.',
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      validationSchema={Yup.object({
        name: Yup.string().max(100, 'Must be less than 100 characters').required('This field is mandatory'),
        status: Yup.number().oneOf([0, 1]).required('This field is mandatory'),
      })}
      onSubmit={onSubmit}
    >
      {(formik) => {
        const setAll = (checked: boolean) => {
          const next: Permissions = {};
          for (const resource of RESOURCES) {
            next[resource.id] =
              resource.id === 'reports'
                ? reportPermissionFlags(checked)
                : Object.fromEntries(resource.actions.map((action) => [action, checked]));
          }
          formik.setFieldValue('permissions', next);
        };

        return (
          <Form className="w-full">
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Basic Information</h3>
                  <p className="text-sm text-muted-foreground mb-4">Enter the basic details for this user group.</p>
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
                  <Label className={styleClasses.labelClassName}>Description</Label>
                  <Textarea
                    id="description"
                    name="description"
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
                  value={String(formik.values.status)}
                  onChange={(value) => formik.setFieldValue('status', Number.parseInt(value, 10))}
                  required
                  options={[
                    { id: '1', name: 'Active' },
                    { id: '0', name: 'Inactive' },
                  ]}
                  styleClasses={styleClasses}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Permissions</h3>
                    <p className="text-sm text-muted-foreground">
                      Select the permissions for this user group. Permissions are organized by resource.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setAll(true)}>
                    <RefreshCw className="h-4 w-4" />
                    Sync Permissions
                  </Button>
                </div>

                <div className="space-y-8">
                  {groupPermissionResources().map((group) => (
                    <div key={group.name} className="space-y-6">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</h4>
                      {group.resources.map((resource) => {
                        const actions = PERMISSION_ACTIONS.filter((action) => resource.actions.includes(action.id));
                        const values = formik.values.permissions[resource.id] ?? {};
                        const setResource = (checked: boolean) => {
                          formik.setFieldValue('permissions', {
                            ...formik.values.permissions,
                            [resource.id]:
                              resource.id === 'reports'
                                ? reportPermissionFlags(checked)
                                : Object.fromEntries(resource.actions.map((action) => [action, checked])),
                          });
                        };
                        return (
                          <div key={resource.id} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold">{resource.name}</Label>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => setResource(true)}
                                  className="text-sm text-muted-foreground hover:text-foreground underline"
                                >
                                  Select All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setResource(false)}
                                  className="text-sm text-muted-foreground hover:text-foreground underline"
                                >
                                  Deselect All
                                </button>
                              </div>
                            </div>
                            {resource.id === 'reports' ? (
                              <ReportPermissionFields
                                stored={values}
                                onChange={(actionId, checked) =>
                                  formik.setFieldValue('permissions', {
                                    ...formik.values.permissions,
                                    reports: { ...values, [actionId]: checked },
                                  })
                                }
                              />
                            ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {actions.map((action) => (
                                <div key={action.id} className="flex items-center space-x-2 p-3 border rounded-md">
                                  <Checkbox
                                    id={`${resource.id}-${action.id}`}
                                    checked={values[action.id] === true}
                                    onCheckedChange={(checked) =>
                                      formik.setFieldValue('permissions', {
                                        ...formik.values.permissions,
                                        [resource.id]: { ...values, [action.id]: checked === true },
                                      })
                                    }
                                  />
                                  <Label
                                    htmlFor={`${resource.id}-${action.id}`}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {action.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  type="button"
                  disabled={loading}
                  onClick={() => router.push('/user-groups')}
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
        );
      }}
    </Formik>
  );
}

function ReportPermissionFields({
  stored,
  onChange,
}: {
  stored: Record<string, boolean> | undefined;
  onChange: (actionId: string, value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        View reports list opens the reports page. Turn on each report this group may open and run. A group that
        could already open reports keeps those reports until one is turned off.
      </p>
      <div className="flex items-center space-x-2 p-3 border rounded-md sm:max-w-sm">
        <Checkbox
          id="reports-view"
          checked={stored?.view === true}
          onCheckedChange={(checked) => onChange('view', checked === true)}
        />
        <Label htmlFor="reports-view" className="text-sm font-medium cursor-pointer">
          View reports list
        </Label>
      </div>
      {REPORT_CATEGORIES.map((category) => {
        const reports = DPAY_REPORTS.filter((report) => report.category === category);
        return (
          <div key={category} className="space-y-2">
            <p className="text-sm font-medium">{category}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reports.map((report) => (
                <div key={report.action} className="flex items-start space-x-2 p-3 border rounded-md">
                  <Checkbox
                    id={`reports-${report.action}`}
                    checked={reportPrivilegeChecked(stored, report.action)}
                    onCheckedChange={(checked) => onChange(report.action, checked === true)}
                  />
                  <Label
                    htmlFor={`reports-${report.action}`}
                    className="text-sm font-medium cursor-pointer leading-snug"
                  >
                    {report.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
