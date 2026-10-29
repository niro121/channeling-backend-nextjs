'use client';

import { useMemo, useState } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { RefreshCw, SaveIcon } from 'lucide-react';
import {
  Button,
  Combobox,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Label,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  getChangeStaffDetailAction,
  applyChangeStaffAction
} from '@/app/actions/hr-admin-actions/change-staff.actions';
import { EMPLOYEE_STATUS_OPTIONS } from '@/types/staff-employment-options';
import { STAFF_CATEGORY_OPTIONS } from '@/types/staff-category';
import type { ChangeStaffFormValues } from '@/types/change-staff';
import { useChangeStaffUi } from './change-staff-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName:
    'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  staffId: Yup.string().required('Select a staff member'),
  departmentId: Yup.string().required('Working department is required'),
  employeeStatusId: Yup.string().required('Employee status is required'),
  categoryId: Yup.string(),
  gradeId: Yup.string(),
  designationId: Yup.string(),
  basic: Yup.string()
    .required('Staff basic is required')
    .test('positive-number', 'Must be a positive number', (value) => {
      const n = Number(value);
      return Number.isFinite(n) && n > 0;
    }),
  activeFrom: Yup.date().nullable().required('Active from date is required')
});

function optionLabel(
  options: Array<{ id: string; name: string }>,
  id: string
): string {
  if (!id) return '';
  return options.find((o) => o.id === id)?.name ?? id;
}

function memberToFormValues(
  staffId: string,
  member: {
    departmentId: string;
    employeeStatusId: string;
    categoryId: string;
    gradeId: string;
    designationId: string;
    basic: string;
  } | null
): ChangeStaffFormValues {
  if (!member) {
    return {
      staffId,
      departmentId: '',
      employeeStatusId: '',
      categoryId: '',
      gradeId: '',
      designationId: '',
      basic: '',
      activeFrom: null
    };
  }
  return {
    staffId,
    departmentId: member.departmentId,
    employeeStatusId: member.employeeStatusId,
    categoryId: member.categoryId,
    gradeId: member.gradeId,
    designationId: member.designationId,
    basic: member.basic,
    activeFrom: new Date()
  };
}

function withOrphanOption(
  options: Array<{ id: string; name: string }>,
  currentId: string,
  currentLabel?: string
) {
  if (!currentId || options.some((o) => o.id === currentId)) return options;
  return [{ id: currentId, name: currentLabel || currentId }, ...options];
}

export default function SectionChangeStaffForm() {
  const { toast } = useToast();
  const {
    members,
    selectedStaffId,
    setSelectedStaffId,
    selectedMember,
    updateMemberSnapshot,
    setHistory,
    formOptions
  } = useChangeStaffUi();
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [saving, setSaving] = useState(false);

  const staffOptions = useMemo(
    () =>
      members.map((m) => ({
        id: m.id,
        name: `${m.name} (${m.staffCode})`
      })),
    [members]
  );

  const statusOptions = useMemo(
    () => EMPLOYEE_STATUS_OPTIONS.map((o) => ({ id: o.id, name: o.name })),
    []
  );
  const categoryOptions = useMemo(
    () => STAFF_CATEGORY_OPTIONS.map((o) => ({ id: o.id, name: o.name })),
    []
  );

  const departmentOptions = useMemo(
    () =>
      withOrphanOption(
        formOptions.departments,
        selectedMember?.departmentId ?? ''
      ),
    [formOptions.departments, selectedMember?.departmentId]
  );
  const designationOptions = useMemo(
    () =>
      withOrphanOption(
        formOptions.designations,
        selectedMember?.designationId ?? ''
      ),
    [formOptions.designations, selectedMember?.designationId]
  );
  const gradeOptions = useMemo(
    () => withOrphanOption(formOptions.grades, selectedMember?.gradeId ?? ''),
    [formOptions.grades, selectedMember?.gradeId]
  );

  const initialValues = useMemo(
    () => memberToFormValues(selectedStaffId, selectedMember),
    [selectedStaffId, selectedMember]
  );

  const handleStaffChange = async (staffId: string) => {
    setSelectedStaffId(staffId);
    if (!staffId) {
      setHistory([]);
      return;
    }
    setLoadingStaff(true);
    try {
      const result = await getChangeStaffDetailAction(staffId);
      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Load failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to load staff detail.'
        });
        return;
      }
      updateMemberSnapshot(result.data.member);
      setHistory(result.data.history);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleChange = async (
    values: ChangeStaffFormValues,
    helpers: FormikHelpers<ChangeStaffFormValues>
  ) => {
    if (!selectedMember || !values.activeFrom) return;

    setSaving(true);
    try {
      const result = await applyChangeStaffAction({
        staffId: selectedMember.id,
        activeFrom: values.activeFrom,
        departmentId: values.departmentId,
        employeeStatusId: values.employeeStatusId,
        categoryId: values.categoryId,
        gradeId: values.gradeId,
        designationId: values.designationId,
        basic: values.basic.trim(),
        labels: {
          department: optionLabel(departmentOptions, values.departmentId),
          employeeStatus: optionLabel(statusOptions, values.employeeStatusId),
          category: values.categoryId
            ? optionLabel(categoryOptions, values.categoryId)
            : '',
          grade: values.gradeId
            ? optionLabel(gradeOptions, values.gradeId)
            : '',
          designation: values.designationId
            ? optionLabel(designationOptions, values.designationId)
            : '',
          basic: values.basic.trim()
        }
      });

      if (result.isError || !result.data) {
        const errors = result.errors as Record<string, unknown>;
        toast({
          variant: 'destructive',
          title: 'Change failed',
          description:
            (typeof errors?.message === 'string' && errors.message) ||
            'Unable to apply change.'
        });
        return;
      }

      updateMemberSnapshot(result.data.member);
      setHistory(result.data.history);
      helpers.resetForm({
        values: memberToFormValues(result.data.member.id, result.data.member)
      });

      toast({
        variant: 'success',
        title: 'Saved',
        description: 'Employment change applied with effective date.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Formik
      key={selectedStaffId || 'empty'}
      initialValues={initialValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleChange}
    >
      {(formik) => {
        const info = selectedMember;

        return (
          <Form className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(14rem,1fr)_minmax(18rem,1.4fr)_minmax(12rem,0.9fr)]">
              <div className="flex flex-col gap-3 rounded-lg border border-primary/15 bg-card p-4">
                <div className={fieldStyleClasses.parentDiv}>
                  <Label className={fieldStyleClasses.labelClassName}>
                    Select Staff
                    <span className="text-red-600"> *</span>
                  </Label>
                  <Combobox
                    label="Select Staff"
                    options={staffOptions}
                    value={selectedStaffId}
                    defaultValue=""
                    loading={loadingStaff}
                    onChange={(value) => void handleStaffChange(value)}
                    triggerClassName="w-full max-w-none font-normal!"
                    popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                  />
                </div>

                <div className="rounded-md border border-primary/10 bg-muted/40 px-3 py-3 text-sm">
                  {info ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {info.staffCode} — {info.name}
                      </p>
                      <p className="text-muted-foreground">
                        EPF: {info.epfNumber} — NIC: {info.nic}
                      </p>
                      <p className="text-muted-foreground">
                        Joined: {info.joinedLabel}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Select a staff member.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-primary/15 bg-card p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Working Department
                      <span className="text-red-600"> *</span>
                    </Label>
                    <Combobox
                      label="Working Department"
                      options={departmentOptions}
                      value={formik.values.departmentId || ''}
                      defaultValue=""
                      clearable
                      onChange={(value) =>
                        void formik.setFieldValue('departmentId', value)
                      }
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                    />
                    {formik.touched.departmentId && formik.errors.departmentId ? (
                      <p className="text-sm text-red-600">
                        {formik.errors.departmentId}
                      </p>
                    ) : null}
                  </div>

                  <CustomSelectField
                    id="employeeStatusId"
                    placeholder="Employee Status"
                    options={statusOptions}
                    value={formik.values.employeeStatusId}
                    onChange={(v) =>
                      void formik.setFieldValue('employeeStatusId', v)
                    }
                    required
                    styleClasses={fieldStyleClasses}
                  />

                  <CustomSelectField
                    id="categoryId"
                    placeholder="Staff Category"
                    options={categoryOptions}
                    value={formik.values.categoryId}
                    onChange={(v) => void formik.setFieldValue('categoryId', v)}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />

                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Staff Grade
                    </Label>
                    <Combobox
                      label="Staff Grade"
                      options={gradeOptions}
                      value={formik.values.gradeId || ''}
                      defaultValue=""
                      clearable
                      onChange={(value) =>
                        void formik.setFieldValue('gradeId', value)
                      }
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                    />
                  </div>

                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Staff Designation
                    </Label>
                    <Combobox
                      label="Staff Designation"
                      options={designationOptions}
                      value={formik.values.designationId || ''}
                      defaultValue=""
                      clearable
                      onChange={(value) =>
                        void formik.setFieldValue('designationId', value)
                      }
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                    />
                  </div>

                  <CustomFormField
                    id="basic"
                    type="number"
                    placeholder="Staff Basic"
                    value={formik.values.basic}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-primary/15 bg-card p-4">
                <CustomDatePickerField
                  id="activeFrom"
                  placeholder="Active From"
                  required
                  value={formik.values.activeFrom}
                  onChange={(value) =>
                    void formik.setFieldValue('activeFrom', value ?? null)
                  }
                  onBlur={formik.handleBlur}
                  styleClasses={fieldStyleClasses}
                  useFormikError
                />

                <div className="mt-auto flex flex-col gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className={cn('w-full gap-1.5', buttonStyles.save)}
                    disabled={!selectedMember || saving || loadingStaff}
                  >
                    <SaveIcon className="h-4 w-4" />
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-full gap-1.5',
                      buttonStyles.cancel.healthy
                    )}
                    disabled={!selectedMember || saving}
                    onClick={() => {
                      formik.resetForm({
                        values: memberToFormValues(
                          selectedStaffId,
                          selectedMember
                        )
                      });
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Changes are versioned. Prior values stay in the history
                    tables below.
                  </p>
                </div>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
