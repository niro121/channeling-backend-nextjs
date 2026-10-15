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
  STAFF_GRADE_LEVELS,
  STAFF_GRADE_LEVEL_LABELS,
  type StaffGradeFormValues
} from '@/types/staff-grade';
import {
  createStaffGradeAction,
  deleteStaffGradeAction,
  updateStaffGradeAction
} from '@/app/actions/hr-admin-actions/staff-grade.actions';
import { useStaffGradeUi } from './staff-grade-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  name: Yup.string().trim().required('Area name is required'),
  gradeLevelId: Yup.string().required('Grade level is required')
});

const gradeLevelOptions = STAFF_GRADE_LEVELS.map((id) => ({
  id,
  name: STAFF_GRADE_LEVEL_LABELS[id]
}));

function emptyStaffGradeFormValues(): StaffGradeFormValues {
  return {
    name: '',
    code: '',
    gradeLevelId: ''
  };
}

function formatAuditLine(name?: string, role?: string, at?: string | null): string {
  if (!name || !at) return '—';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '—';
  const namePart = role ? `${name} (${role})` : name;
  return `${namePart} · ${format(date, 'd MMM yyyy')} · ${format(date, 'HH:mm')}`;
}

export default function SectionStaffGradeDetail() {
  const { toast } = useToast();
  const router = useRouter();
  const {
    records,
    selectedId,
    setSelectedId,
    isNew,
    setIsNew,
    detailFormHighlight
  } = useStaffGradeUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );

  const formKey = isNew ? 'new' : (selectedId ?? 'empty');
  const initialValues = useMemo<StaffGradeFormValues>(() => {
    if (isNew || !selectedRecord) return emptyStaffGradeFormValues();
    return {
      name: selectedRecord.name,
      code: selectedRecord.code,
      gradeLevelId: selectedRecord.gradeLevelId
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
    values: StaffGradeFormValues,
    helpers: FormikHelpers<StaffGradeFormValues>
  ) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        gradeLevelId: values.gradeLevelId
      };

      const result =
        isNew || !selectedRecord
          ? await createStaffGradeAction(payload)
          : await updateStaffGradeAction(selectedRecord.id, payload);

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
            'Unable to save area.'
        });
        return;
      }

      setIsNew(false);
      setSelectedId(result.data.id);
      toast({
        title: 'Saved',
        description: isNew || !selectedRecord ? 'Area created.' : 'Area updated.'
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
      const result = await deleteStaffGradeAction(selectedRecord.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cannot delete',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to delete area.'
        });
        setDeleteOpen(false);
        return;
      }

      setDeleteOpen(false);
      setSelectedId(null);
      setIsNew(false);
      toast({ title: 'Deleted', description: 'Area removed.' });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="staff-grade-detail-form"
      className={cn(
        'flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card transition-all duration-300',
        detailFormHighlight && 'border-primary ring-2 ring-primary/40'
      )}
    >
      <div className="border-b border-primary/10 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">Area Details</h2>
      </div>

      {showEmptyState ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Select an area from the list or click Add to create one.
        </div>
      ) : (
        <Formik
          key={formKey}
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={handleSave}
        >
          {(formik) => (
            <Form id="staff-grade-form" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                <CustomFormField
                  id="name"
                  type="text"
                  placeholder="Area Name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-4 md:grid-cols-2">
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

                  <CustomSelectField
                    id="gradeLevelId"
                    placeholder="Select Grade Level"
                    value={formik.values.gradeLevelId}
                    onChange={(value) => formik.setFieldValue('gradeLevelId', value)}
                    required
                    options={gradeLevelOptions}
                    styleClasses={fieldStyleClasses}
                  />
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
                  form="staff-grade-form"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={saving}
                >
                  <SaveIcon className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      )}

      <CustomAlertDialog
        open={deleteOpen}
        title="Delete area?"
        description={
          selectedRecord
            ? `Remove "${selectedRecord.name}" from the area / staff grade master? This cannot be undone.`
            : 'Remove this area?'
        }
        handleVisibilityChange={setDeleteOpen}
        handleContinue={handleDelete}
        loading={saving}
      />
    </div>
  );
}
