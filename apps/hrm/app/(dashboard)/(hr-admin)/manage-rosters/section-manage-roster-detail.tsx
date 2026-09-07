'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { SaveIcon, Trash2, X } from 'lucide-react';
import {
  Button,
  CustomAlertDialog,
  CustomFormField,
  CustomSelectField,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import {
  MANAGE_ROSTER_DEPARTMENT_LABELS,
  type ManageRosterDepartmentId,
  type ManageRosterFormValues
} from '@/types/manage-roster';
import {
  createManageRosterAction,
  deleteManageRosterAction,
  updateManageRosterAction
} from '@/app/actions/hr-admin-actions/manage-roster.actions';
import {
  emptyManageRosterFormValues,
  manageRosterDepartmentOptions,
  manageRosterRecordToFormValues
} from '@/lib/mappers/manage-roster-form.mapper';
import { useManageRosterUi } from './manage-roster-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  departmentId: Yup.string().required('Department is required'),
  shiftsPerPersonPerDay: Yup.string()
    .required('Shifts per person per day is required')
    .test(
      'min-1',
      'Must be a whole number of at least 1',
      (value) => {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed >= 1;
      }
    ),
  code: Yup.string()
    .trim()
    .required('Roster code is required')
    .max(12, 'Must be 12 characters or less')
});

function formatAuditLine(name?: string, role?: string, at?: string | null): string {
  if (!name || !at) return '—';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '—';
  const namePart = role ? `${name} (${role})` : name;
  return `${namePart} · ${format(date, 'd MMM yyyy')} · ${format(date, 'HH:mm')}`;
}

function applyFieldErrors(
  helpers: FormikHelpers<ManageRosterFormValues>,
  errors: Record<string, unknown>
) {
  if (!errors || typeof errors !== 'object' || 'message' in errors) return;
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (Array.isArray(value) && value[0]) {
      fieldErrors[key] = String(value[0]);
    }
  }
  if (Object.keys(fieldErrors).length) {
    helpers.setErrors(fieldErrors);
  }
}

export default function SectionManageRosterDetail() {
  const { toast } = useToast();
  const router = useRouter();
  const {
    records,
    selectedId,
    setSelectedId,
    isNew,
    setIsNew,
    detailFormHighlight
  } = useManageRosterUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );

  const formKey = isNew ? 'new' : (selectedId ?? 'empty');
  const initialValues = useMemo<ManageRosterFormValues>(() => {
    if (isNew || !selectedRecord) return emptyManageRosterFormValues();
    return manageRosterRecordToFormValues(selectedRecord);
  }, [isNew, selectedRecord]);

  useEffect(() => {
    if (!detailFormHighlight) return;
    const timer = window.setTimeout(() => {
      document.getElementById('name')?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [detailFormHighlight, formKey]);

  const showEmptyState = !isNew && !selectedRecord;

  const handleSave = async (
    values: ManageRosterFormValues,
    helpers: FormikHelpers<ManageRosterFormValues>
  ) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        departmentId: values.departmentId,
        shiftsPerPersonPerDay: Number(values.shiftsPerPersonPerDay)
      };

      const result =
        isNew || !selectedRecord
          ? await createManageRosterAction(payload)
          : await updateManageRosterAction(selectedRecord.id, payload);

      if (result.isError || !result.data) {
        const errors = result.errors as Record<string, unknown>;
        applyFieldErrors(helpers, errors);
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description:
            (typeof (errors as any)?.message === 'string' && (errors as any).message) ||
            (typeof (errors as any)?.name?.[0] === 'string' && (errors as any).name[0]) ||
            (typeof (errors as any)?.code?.[0] === 'string' && (errors as any).code[0]) ||
            'Unable to save roster.'
        });
        return;
      }

      setIsNew(false);
      setSelectedId(result.data.id);
      toast({
        title: 'Saved',
        description:
          isNew || !selectedRecord ? 'Roster created.' : 'Roster updated.'
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    setSaving(true);
    try {
      const result = await deleteManageRosterAction(selectedRecord.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cannot delete',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to delete roster.'
        });
        setDeleteOpen(false);
        return;
      }

      setDeleteOpen(false);
      setSelectedId(null);
      setIsNew(false);
      toast({ title: 'Deleted', description: 'Roster removed.' });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="manage-roster-detail-form"
      className={cn(
        'flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card transition-all duration-300',
        detailFormHighlight && 'border-primary ring-2 ring-primary/40'
      )}
    >
      <div className="border-b border-primary/10 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">Roster Details</h2>
      </div>

      {showEmptyState ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Select a roster from the list or click Add to create one.
        </div>
      ) : (
        <Formik
          key={formKey}
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={handleSave}
        >
          {(formik) => {
            const departmentLabel =
              MANAGE_ROSTER_DEPARTMENT_LABELS[
                formik.values.departmentId as ManageRosterDepartmentId
              ] ?? formik.values.departmentId;
            const assignedStaff =
              selectedRecord && !isNew ? selectedRecord.assignedStaffCount : 0;
            const activeShifts =
              selectedRecord && !isNew ? selectedRecord.activeShiftCount : 0;

            return (
              <Form
                id="manage-roster-form"
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                  <CustomFormField
                    id="name"
                    type="text"
                    placeholder="Name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomSelectField
                      id="departmentId"
                      placeholder="Select Department"
                      value={formik.values.departmentId}
                      onChange={(value) =>
                        formik.setFieldValue('departmentId', value)
                      }
                      required
                      options={manageRosterDepartmentOptions}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      id="shiftsPerPersonPerDay"
                      type="number"
                      placeholder="Shifts Per One Person Per Day"
                      value={formik.values.shiftsPerPersonPerDay}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CustomFormField
                    id="code"
                    type="text"
                    placeholder="Roster Code"
                    value={formik.values.code}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-primary/10 bg-muted/40 px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Active shifts
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {activeShifts}
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary/10 bg-muted/40 px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Linked dept.
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {departmentLabel || '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary/10 bg-muted/40 px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        # Assigned staff
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {assignedStaff}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">Created by:</span>
                      <span className="text-muted-foreground">
                        {selectedRecord && !isNew
                          ? formatAuditLine(
                              selectedRecord.createdByUser.name,
                              selectedRecord.createdByUser.role,
                              selectedRecord.createdAt
                            )
                          : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">Last updated:</span>
                      <span className="text-muted-foreground">
                        {selectedRecord && !isNew
                          ? formatAuditLine(
                              selectedRecord.updatedByUser.name,
                              selectedRecord.updatedByUser.role,
                              selectedRecord.updatedAt
                            )
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-primary/10 px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                    disabled={saving}
                    onClick={() => {
                      if (isNew) {
                        setIsNew(false);
                        setSelectedId(records[0]?.id ?? null);
                        return;
                      }
                      formik.resetForm();
                    }}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    disabled={!selectedRecord || isNew || saving}
                    className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    type="submit"
                    form="manage-roster-form"
                    size="sm"
                    className="h-9 gap-1.5"
                    disabled={saving}
                  >
                    <SaveIcon className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </Form>
            );
          }}
        </Formik>
      )}

      <CustomAlertDialog
        open={deleteOpen}
        title="Delete roster?"
        description={
          selectedRecord
            ? `Remove "${selectedRecord.name}" (${selectedRecord.code}) from the roster master? This cannot be undone.`
            : 'Remove this roster?'
        }
        handleVisibilityChange={setDeleteOpen}
        handleContinue={handleDelete}
        loading={saving}
      />
    </div>
  );
}
