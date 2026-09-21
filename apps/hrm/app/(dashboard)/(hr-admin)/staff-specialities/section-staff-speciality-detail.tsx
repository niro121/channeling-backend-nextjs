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
  STAFF_SPECIALITY_CATEGORIES,
  STAFF_SPECIALITY_CATEGORY_LABELS,
  STAFF_SPECIALITY_STATUS_OPTIONS,
  type StaffSpecialityCategoryId,
  type StaffSpecialityFormValues
} from '@/types/staff-speciality';
import {
  createStaffSpecialityAction,
  deleteStaffSpecialityAction,
  updateStaffSpecialityAction
} from '@/app/actions/hr-admin-actions/staff-speciality.actions';
import { emptyStaffSpecialityFormValues } from '@/lib/mappers/staff-speciality-form.mapper';
import { useStaffSpecialityUi } from './staff-speciality-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  name: Yup.string().trim().required('Speciality name is required'),
  categoryId: Yup.string().required('Category is required'),
  description: Yup.string().max(200, 'Must be less than 200 characters'),
  status: Yup.string()
    .required('Status is required')
    .oneOf(
      STAFF_SPECIALITY_STATUS_OPTIONS.map((option) => option.id),
      'Select a valid status'
    ),
  sortOrder: Yup.string()
    .required('Sort order is required')
    .matches(/^\d+$/, 'Sort order must be a whole number')
    .test('max', 'Sort order must be less than 10000', (value) => {
      if (!value) return false;
      return Number.parseInt(value, 10) <= 9999;
    })
});

const categoryOptions = STAFF_SPECIALITY_CATEGORIES.map((id) => ({
  id,
  name: STAFF_SPECIALITY_CATEGORY_LABELS[id]
}));

const statusOptions = STAFF_SPECIALITY_STATUS_OPTIONS.map((option) => ({
  id: option.id,
  name: option.name
}));

function formatAuditLine(name?: string, role?: string, at?: string | null): string {
  if (!name || !at) return '—';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '—';
  const namePart = role ? `${name} (${role})` : name;
  return `${namePart} · ${format(date, 'd MMM yyyy')} · ${format(date, 'HH:mm')}`;
}

export default function SectionStaffSpecialityDetail() {
  const { toast } = useToast();
  const router = useRouter();
  const {
    records,
    selectedId,
    setSelectedId,
    isNew,
    setIsNew,
    detailFormHighlight
  } = useStaffSpecialityUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );

  const formKey = isNew ? 'new' : (selectedId ?? 'empty');
  const initialValues = useMemo<StaffSpecialityFormValues>(() => {
    if (isNew || !selectedRecord) return emptyStaffSpecialityFormValues();
    return {
      name: selectedRecord.name,
      code: selectedRecord.code,
      categoryId: selectedRecord.categoryId,
      description: selectedRecord.description,
      status: String(selectedRecord.status),
      sortOrder: String(selectedRecord.sortOrder)
    };
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
    values: StaffSpecialityFormValues,
    helpers: FormikHelpers<StaffSpecialityFormValues>
  ) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        categoryId: values.categoryId,
        description: values.description.trim(),
        status: Number.parseInt(values.status, 10),
        sortOrder: Number.parseInt(values.sortOrder, 10) || 0
      };

      const result =
        isNew || !selectedRecord
          ? await createStaffSpecialityAction(payload)
          : await updateStaffSpecialityAction(selectedRecord.id, payload);

      if (result.isError || !result.data) {
        const errors = result.errors as Record<string, unknown>;
        if (errors && typeof errors === 'object' && !('message' in errors)) {
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
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description:
            (typeof (errors as any)?.message === 'string' && (errors as any).message) ||
            (typeof (errors as any)?.name?.[0] === 'string' && (errors as any).name[0]) ||
            'Unable to save staff speciality.'
        });
        return;
      }

      setIsNew(false);
      setSelectedId(result.data.id);
      toast({
        title: 'Saved',
        description:
          isNew || !selectedRecord
            ? 'Staff speciality created.'
            : 'Staff speciality updated.'
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
      const result = await deleteStaffSpecialityAction(selectedRecord.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cannot delete',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to delete staff speciality.'
        });
        setDeleteOpen(false);
        return;
      }

      setDeleteOpen(false);
      setSelectedId(null);
      setIsNew(false);
      toast({ title: 'Deleted', description: 'Staff speciality removed.' });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="staff-speciality-detail-form"
      className={cn(
        'flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card transition-all duration-300',
        detailFormHighlight && 'border-primary ring-2 ring-primary/40'
      )}
    >
      <div className="border-b border-primary/10 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          Speciality Details
        </h2>
      </div>

      {showEmptyState ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Select a speciality from the list or click Add to create one.
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
            const categoryLabel =
              STAFF_SPECIALITY_CATEGORY_LABELS[
                formik.values.categoryId as StaffSpecialityCategoryId
              ] ?? '';

            return (
              <Form
                id="staff-speciality-form"
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomFormField
                      id="name"
                      type="text"
                      placeholder="Speciality Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      id="code"
                      type="text"
                      placeholder="Auto-generated"
                      value={formik.values.code}
                      onChange={() => undefined}
                      onBlur={() => undefined}
                      disabled
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomSelectField
                      id="categoryId"
                      placeholder="Select Category"
                      value={formik.values.categoryId}
                      onChange={(value) => formik.setFieldValue('categoryId', value)}
                      required
                      options={categoryOptions}
                      styleClasses={fieldStyleClasses}
                    />

                    <div className="rounded-lg border border-primary/10 bg-muted/40 px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Selected Category
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {categoryLabel || 'Select a category'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomSelectField
                      id="status"
                      placeholder="Status"
                      value={formik.values.status}
                      onChange={(value) => formik.setFieldValue('status', value)}
                      required
                      options={statusOptions}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      id="sortOrder"
                      type="number"
                      placeholder="Sort Order"
                      value={formik.values.sortOrder}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CustomFormField
                    id="description"
                    type="text"
                    placeholder="Short description..."
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />

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
                    form="staff-speciality-form"
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
        title="Delete staff speciality?"
        description={
          selectedRecord
            ? `Remove "${selectedRecord.name}" from the staff speciality master? This cannot be undone.`
            : 'Remove this staff speciality?'
        }
        handleVisibilityChange={setDeleteOpen}
        handleContinue={handleDelete}
        loading={saving}
      />
    </div>
  );
}
