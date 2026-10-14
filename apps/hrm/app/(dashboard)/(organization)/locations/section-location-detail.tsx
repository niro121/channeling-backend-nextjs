'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { CustomColorPicker } from '@/components/custom/custom-color-picker';
import {
  BRANCH_TYPE_OPTIONS,
  LOCATION_STATUS_OPTIONS,
  emptyLocationFormValues,
  type LocationFormValues
} from '@/types/location';
import {
  createLocationAction,
  deleteLocationAction,
  updateLocationAction
} from '@/app/actions/organization-actions/location.actions';
import { formValuesToLocationPayload } from '@/lib/mappers/location-form.mapper';
import { useLocationUi } from './location-ui-context';
import { ChannelingSyncAlertDialog } from '@/components/common/channeling-sync-alert-dialog';
import { buildChannelingSyncDialog } from '@/components/common/channeling-sync-dialog.helper';
import { buttonStyles } from '@/lib/utils/common-styles';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .max(150, 'Must be less than 150 characters')
    .required('Location name is required'),
  addressLine1: Yup.string().max(200, 'Must be less than 200 characters'),
  addressLine2: Yup.string().max(200, 'Must be less than 200 characters'),
  city: Yup.string().max(100, 'Must be less than 100 characters'),
  branchType: Yup.string()
    .oneOf(['1', '2', '3'], 'Branch type is required')
    .required('Branch type is required'),
  status: Yup.string()
    .oneOf(['0', '1'], 'Status must be Unpublish or Publish')
    .required('Status is required'),
  order: Yup.string()
    .required('Order is required')
    .test('order-int', 'Order must be 0 or greater', (value) => {
      if (value == null || value === '') return false;
      const num = Number(value);
      return Number.isInteger(num) && num >= 0;
    }),
  color: Yup.string().test(
    'hex-color',
    'Color must be a hex value (e.g. #22c55e)',
    (value) => {
      if (!value || value.trim() === '') return true;
      return HEX_COLOR_REGEX.test(value.trim());
    }
  )
});

const statusOptions = LOCATION_STATUS_OPTIONS.map((opt) => ({
  id: opt.id,
  name: opt.name
}));

const branchTypeOptions = BRANCH_TYPE_OPTIONS.map((opt) => ({
  id: opt.id,
  name: opt.name
}));

function formatAuditLine(name?: string, role?: string, at?: string | null): string {
  if (!name || !at) return '—';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '—';
  const namePart = role ? `${name} (${role})` : name;
  return `${namePart} · ${format(date, 'd MMM yyyy')} · ${format(date, 'HH:mm')}`;
}

export default function SectionLocationDetail() {
  const { toast } = useToast();
  const router = useRouter();
  const {
    records,
    selectedId,
    setSelectedId,
    setRecords,
    isNew,
    setIsNew,
    detailFormHighlight
  } = useLocationUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChannelingDialog, setShowChannelingDialog] = useState(false);
  const pendingSubmitRef = useRef<{
    values: LocationFormValues;
    helpers: FormikHelpers<LocationFormValues>;
  } | null>(null);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );

  const formKey = isNew ? 'new' : (selectedId ?? 'empty');
  const initialValues = useMemo<LocationFormValues>(() => {
    if (isNew || !selectedRecord) return emptyLocationFormValues();
    return {
      name: selectedRecord.name,
      addressLine1: selectedRecord.addressLine1,
      addressLine2: selectedRecord.addressLine2,
      city: selectedRecord.city,
      branchType: String(selectedRecord.branchType),
      status: String(selectedRecord.status),
      order: String(selectedRecord.order),
      color: selectedRecord.color ?? ''
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
  const isCreating = isNew || !selectedRecord;

  const executeSave = async (
    values: LocationFormValues,
    helpers: FormikHelpers<LocationFormValues>,
    syncToChanneling: boolean
  ) => {
    setSaving(true);
    try {
      const payload = formValuesToLocationPayload(values);
      const result = isCreating
        ? await createLocationAction(payload, { syncToChanneling })
        : await updateLocationAction(selectedRecord!.id, payload, {
            syncToChanneling
          });

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
            (typeof (errors as any)?.message === 'string' &&
              (errors as any).message) ||
            (typeof (errors as any)?.name?.[0] === 'string' &&
              (errors as any).name[0]) ||
            'Unable to save location.'
        });
        return;
      }

      const warning = (result as { channelingWarning?: string })
        .channelingWarning;
      setRecords((prev) => {
        const nextRecord = result.data!;
        const index = prev.findIndex((record) => record.id === nextRecord.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = nextRecord;
          return next;
        }
        return [...prev, nextRecord].sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return a.name.localeCompare(b.name);
        });
      });
      setIsNew(false);
      setSelectedId(result.data.id);
      toast({
        variant: warning ? 'default' : 'success',
        title: warning ? 'Saved in HRM' : 'Saved',
        description: warning
          ? warning
          : isCreating
            ? syncToChanneling
              ? 'Location was created in HRM and Channeling.'
              : 'Location was created in HRM only.'
            : syncToChanneling
              ? 'Location was updated in HRM and Channeling.'
              : 'Location was updated in HRM only.'
      });
      router.refresh();
    } finally {
      setSaving(false);
      setShowChannelingDialog(false);
      pendingSubmitRef.current = null;
    }
  };

  const handleSave = async (
    values: LocationFormValues,
    helpers: FormikHelpers<LocationFormValues>
  ) => {
    pendingSubmitRef.current = { values, helpers };
    setShowChannelingDialog(true);
  };

  const handleChannelingCancel = () => {
    pendingSubmitRef.current = null;
    setShowChannelingDialog(false);
  };

  const handleChannelingSaveHrmOnly = async () => {
    const pending = pendingSubmitRef.current;
    if (!pending) return;
    await executeSave(pending.values, pending.helpers, false);
  };

  const handleChannelingContinue = async () => {
    const pending = pendingSubmitRef.current;
    if (!pending) return;
    await executeSave(pending.values, pending.helpers, true);
  };

  const channelingDialog = buildChannelingSyncDialog({
    entityLabel: 'location',
    mode: isCreating ? 'create' : 'update',
    hasChannelingLink: Boolean(selectedRecord?.migrateSourceId)
  });

  const handleDelete = async () => {
    if (!selectedRecord) return;

    setSaving(true);
    try {
      const result = await deleteLocationAction(selectedRecord.id, {
        syncToChanneling: true
      });
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cannot delete',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to delete location.'
        });
        setDeleteOpen(false);
        return;
      }

      setDeleteOpen(false);
      setSelectedId(null);
      setIsNew(false);
      toast({
        title: 'Deleted',
        description: 'Location removed.'
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="location-detail-form"
      className={cn(
        'flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card transition-all duration-300',
        detailFormHighlight && 'border-primary ring-2 ring-primary/40'
      )}
    >
      <div className="border-b border-primary/10 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">Location Details</h2>
      </div>

      {showEmptyState ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Select a location from the list or click Add to create one.
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
            <Form id="location-form" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <CustomFormField
                    id="name"
                    type="text"
                    placeholder="Location Name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="rounded-lg border border-primary/10 bg-muted/40 px-3 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Location Code
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {isNew || !selectedRecord
                        ? 'Auto-generated on save'
                        : selectedRecord.code}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <CustomSelectField
                    id="branchType"
                    placeholder="Branch Type"
                    value={formik.values.branchType}
                    onChange={(value) => formik.setFieldValue('branchType', value)}
                    required
                    options={branchTypeOptions}
                    styleClasses={fieldStyleClasses}
                  />

                  <CustomSelectField
                    id="status"
                    placeholder="Status"
                    value={formik.values.status}
                    onChange={(value) => formik.setFieldValue('status', value)}
                    required
                    options={statusOptions}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <CustomFormField
                    id="order"
                    type="number"
                    placeholder="Display Order"
                    value={formik.values.order}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />

                  <CustomColorPicker
                    id="color"
                    label="Color"
                    value={formik.values.color}
                    onChange={(value) => formik.setFieldValue('color', value)}
                    onBlur={() => formik.setFieldTouched('color', true)}
                    placeholder="#22c55e"
                    error={
                      formik.touched.color && formik.errors.color
                        ? String(formik.errors.color)
                        : undefined
                    }
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <CustomFormField
                  id="addressLine1"
                  type="text"
                  placeholder="Address Line 1"
                  value={formik.values.addressLine1}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="addressLine2"
                  type="text"
                  placeholder="Address Line 2"
                  value={formik.values.addressLine2}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="city"
                  type="text"
                  placeholder="City"
                  value={formik.values.city}
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
                  disabled={!selectedRecord || isNew || saving}
                  className={cn('gap-1.5', buttonStyles.delete.warning)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button
                  type="submit"
                  form="location-form"
                  size="sm"
                  className={cn('gap-1.5', buttonStyles.save)}
                  disabled={
                    saving ||
                    showChannelingDialog ||
                    (!isCreating && !formik.dirty)
                  }
                >
                  <SaveIcon className="h-4 w-4" />
                  {isCreating ? 'Save' : 'Update'}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      )}

      <ChannelingSyncAlertDialog
        open={showChannelingDialog}
        title={channelingDialog.title}
        description={channelingDialog.description}
        hrmOnlyLabel={channelingDialog.hrmOnlyLabel}
        continueLabel={channelingDialog.continueLabel}
        loading={saving}
        onCancel={handleChannelingCancel}
        onSaveHrmOnly={handleChannelingSaveHrmOnly}
        onContinue={handleChannelingContinue}
      />

      <CustomAlertDialog
        open={deleteOpen}
        title="Delete location?"
        description={
          selectedRecord
            ? `Remove "${selectedRecord.name}" (${selectedRecord.code}) from HRM${
                selectedRecord.migrateSourceId ? ' and Channeling' : ''
              }? Linked zones or rooms in Channeling will block deletion.`
            : 'Remove this location?'
        }
        handleVisibilityChange={setDeleteOpen}
        handleContinue={handleDelete}
        loading={saving}
        className={{
          actionButton: buttonStyles.delete.danger
        }}
      />
    </div>
  );
}
