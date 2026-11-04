'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { SaveIcon, Sparkles, Trash2, X } from 'lucide-react';
import { formatAuditLine } from '@/lib/helpers/format-audit-line.helper';
import {
  Button,
  Combobox,
  CustomAlertDialog,
  CustomFormField,
  Label,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import { buttonStyles } from '@/lib/utils/common-styles';
import type { ManageRosterFormValues } from '@/types/manage-roster';
import {
  createManageRosterAction,
  deleteManageRosterAction,
  updateManageRosterAction
} from '@/app/actions/hr-admin-actions/manage-roster.actions';
import {
  emptyManageRosterFormValues,
  manageRosterRecordToFormValues
} from '@/lib/mappers/manage-roster-form.mapper';
import {
  buildManageRosterCodeSuggestion,
  uniquifyManageRosterCode
} from '@/lib/helpers/manage-roster-code.helper';
import { useManageRosterUi } from './manage-roster-ui-context';
import DialogRosterInspect, {
  type RosterInspectDialogMode
} from './dialog-roster-inspect';

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
      'positive-int',
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
    detailFormHighlight,
    departmentOptions
  } = useManageRosterUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inspectMode, setInspectMode] =
    useState<RosterInspectDialogMode>(null);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );

  const formKey = isNew ? 'new' : (selectedId ?? 'empty');
  const initialValues = useMemo<ManageRosterFormValues>(() => {
    if (isNew || !selectedRecord) return emptyManageRosterFormValues();
    return manageRosterRecordToFormValues(selectedRecord);
  }, [isNew, selectedRecord]);

  const departmentComboboxOptions = useMemo(() => {
    const options = [...departmentOptions];
    const currentId = selectedRecord?.departmentId?.trim();
    if (
      currentId &&
      !options.some((item) => item.id === currentId)
    ) {
      options.unshift({
        id: currentId,
        name: selectedRecord?.departmentName || currentId
      });
    }
    return options;
  }, [departmentOptions, selectedRecord]);

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
    if (!isNew && selectedRecord?.inUse) {
      toast({
        variant: 'destructive',
        title: 'Cannot update',
        description:
          'This roster is in use and cannot be modified.'
      });
      return;
    }

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
            (typeof (errors as any)?.departmentId?.[0] === 'string' &&
              (errors as any).departmentId[0]) ||
            'Unable to save roster.'
        });
        return;
      }

      setIsNew(false);
      setSelectedId(result.data.id);
      toast({
        variant: 'success',
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
    if (selectedRecord.inUse) {
      toast({
        variant: 'destructive',
        title: 'Cannot delete',
        description:
          'This roster is in use and cannot be deleted.'
      });
      setDeleteOpen(false);
      return;
    }

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
            const selectedDept = departmentComboboxOptions.find(
              (opt) => opt.id === formik.values.departmentId
            );
            const departmentLabel =
              selectedDept?.name ||
              selectedRecord?.departmentName ||
              formik.values.departmentId;
            const assignedStaff =
              selectedRecord && !isNew ? selectedRecord.assignedStaffCount : 0;
            const activeShifts =
              selectedRecord && !isNew ? selectedRecord.activeShiftCount : 0;
            const codeLocked = !isNew && Boolean(selectedRecord);
            const rosterInUse =
              !isNew && Boolean(selectedRecord?.inUse);
            const fieldsLocked = rosterInUse;
            const inUseBanner =
              rosterInUse && selectedRecord
                ? [
                    selectedRecord.shiftAssignmentRefCount > 0
                      ? `${selectedRecord.shiftAssignmentRefCount} shift assignment(s)`
                      : null,
                    selectedRecord.staffMembershipCount > 0
                      ? `${selectedRecord.staffMembershipCount} staff member(s)`
                      : null
                  ]
                    .filter(Boolean)
                    .join(' and ') || 'downstream records'
                : '';

            const handleGenerateCode = () => {
              if (codeLocked) return;
              const deptName = selectedDept?.name ?? '';
              const suggested = buildManageRosterCodeSuggestion(
                formik.values.name,
                deptName
              );
              if (!suggested) {
                toast({
                  variant: 'destructive',
                  title: 'Cannot generate code',
                  description: 'Enter a name and select a department first.'
                });
                return;
              }
              const unique = uniquifyManageRosterCode(
                suggested,
                records.map((row) => row.code)
              );
              void formik.setFieldValue('code', unique);
              void formik.setFieldTouched('code', true);
            };

            return (
              <Form
                id="manage-roster-form"
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                  {rosterInUse ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100">
                      This roster is in use ({inUseBanner}) and cannot be
                      modified or deleted. Remove linked shift assignments and
                      staff membership first.
                    </div>
                  ) : null}

                  <CustomFormField
                    id="name"
                    type="text"
                    placeholder="Name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    disabled={fieldsLocked}
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className={fieldStyleClasses.parentDiv}>
                      <Label
                        htmlFor="departmentId"
                        className={fieldStyleClasses.labelClassName}
                      >
                        Select Department
                        <span className="text-red-600"> *</span>
                      </Label>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label="Select Department"
                          options={departmentComboboxOptions}
                          value={formik.values.departmentId || ''}
                          defaultValue=""
                          onChange={(value) => {
                            void formik.setFieldValue('departmentId', value);
                            void formik.setFieldTouched('departmentId', true);
                          }}
                          clearable
                          disabled={fieldsLocked}
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                        />
                      </div>
                      {formik.touched.departmentId && formik.errors.departmentId ? (
                        <p className="text-sm text-red-600">
                          {formik.errors.departmentId}
                        </p>
                      ) : null}
                    </div>

                    <CustomFormField
                      id="shiftsPerPersonPerDay"
                      type="number"
                      placeholder="Shifts Per One Person Per Day"
                      value={formik.values.shiftsPerPersonPerDay}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      min={1}
                      disabled={fieldsLocked}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <CustomFormField
                          id="code"
                          type="text"
                          placeholder="Roster Code"
                          value={formik.values.code}
                          onChange={(e) => {
                            const next = e.target.value.toUpperCase();
                            void formik.setFieldValue('code', next);
                          }}
                          onBlur={formik.handleBlur}
                          required
                          disabled={codeLocked}
                          styleClasses={fieldStyleClasses}
                        />
                      </div>
                      {isNew ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-6 h-10 shrink-0 gap-1.5"
                          onClick={handleGenerateCode}
                          disabled={saving}
                        >
                          <Sparkles className="h-4 w-4" />
                          Generate
                        </Button>
                      ) : null}
                    </div>
                    {codeLocked ? (
                      <p className="text-xs text-muted-foreground">
                        Code is locked after create (used as staff / roster membership key).
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Unique short key. Generate from name + department, or enter manually.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      disabled={isNew || !selectedRecord}
                      onClick={() => setInspectMode('active-shifts')}
                      className={cn(
                        'rounded-lg border border-primary/10 bg-muted/40 px-3 py-3 text-left transition',
                        !isNew && selectedRecord
                          ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/70'
                          : 'cursor-default opacity-80'
                      )}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Active shifts
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {activeShifts}
                      </p>
                      {!isNew && selectedRecord ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Click to inspect
                        </p>
                      ) : null}
                    </button>
                    <div className="rounded-lg border border-primary/10 bg-muted/40 px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Linked dept.
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {departmentLabel || '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isNew || !selectedRecord}
                      onClick={() => setInspectMode('staff')}
                      className={cn(
                        'rounded-lg border border-primary/10 bg-muted/40 px-3 py-3 text-left transition',
                        !isNew && selectedRecord
                          ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/70'
                          : 'cursor-default opacity-80'
                      )}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        # Assigned staff
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {assignedStaff}
                      </p>
                      {!isNew && selectedRecord ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Click to inspect
                        </p>
                      ) : null}
                    </button>
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
                    className={cn(
                      'w-full sm:w-24 gap-1.5',
                      buttonStyles.cancel.normal
                    )}
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
                    disabled={
                      !selectedRecord || isNew || saving || rosterInUse
                    }
                    className={cn('gap-1.5', buttonStyles.delete.warning)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    type="submit"
                    form="manage-roster-form"
                    size="sm"
                    className={cn('gap-1.5', buttonStyles.save)}
                    disabled={
                      saving ||
                      rosterInUse ||
                      (!isNew && !formik.dirty)
                    }
                  >
                    <SaveIcon className="h-4 w-4" />
                    {isNew ? 'Save' : 'Update'}
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
        className={{
          actionButton: buttonStyles.delete.danger
        }}
      />

      <DialogRosterInspect
        open={Boolean(inspectMode && selectedRecord)}
        mode={inspectMode}
        rosterId={selectedRecord?.id ?? null}
        rosterLabel={
          selectedRecord
            ? `${selectedRecord.name} (${selectedRecord.code})`
            : ''
        }
        onOpenChange={(next) => {
          if (!next) setInspectMode(null);
        }}
      />
    </div>
  );
}
