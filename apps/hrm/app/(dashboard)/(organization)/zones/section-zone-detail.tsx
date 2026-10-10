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
  ZONE_STATUS_OPTIONS,
  emptyZoneFormValues,
  type ZoneFormValues
} from '@/types/zone';
import {
  createZoneAction,
  deleteZoneAction,
  updateZoneAction
} from '@/app/actions/organization-actions/zone.actions';
import { formValuesToZonePayload } from '@/lib/mappers/zone-form.mapper';
import { useZoneUi } from './zone-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .max(150, 'Must be less than 150 characters')
    .required('Zone name is required'),
  description: Yup.string().max(500, 'Must be less than 500 characters'),
  locationId: Yup.string().required('Location is required'),
  status: Yup.string()
    .oneOf(['0', '1'], 'Status must be Unpublish or Publish')
    .required('Status is required')
});

const statusOptions = ZONE_STATUS_OPTIONS.map((opt) => ({
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

export default function SectionZoneDetail() {
  const { toast } = useToast();
  const router = useRouter();
  const {
    records,
    locationOptions,
    selectedId,
    setSelectedId,
    isNew,
    setIsNew,
    detailFormHighlight
  } = useZoneUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );

  const locationSelectOptions = useMemo(() => {
    const options = locationOptions.map((loc) => ({
      id: loc.id,
      name: `${loc.name} (${loc.code})`
    }));
    if (
      selectedRecord &&
      !options.some((opt) => opt.id === selectedRecord.locationId)
    ) {
      options.unshift({
        id: selectedRecord.locationId,
        name: `${selectedRecord.locationName} (${selectedRecord.locationCode})`
      });
    }
    return options;
  }, [locationOptions, selectedRecord]);

  const formKey = isNew ? 'new' : (selectedId ?? 'empty');
  const initialValues = useMemo<ZoneFormValues>(() => {
    if (isNew || !selectedRecord) return emptyZoneFormValues();
    return {
      name: selectedRecord.name,
      description: selectedRecord.description,
      locationId: selectedRecord.locationId,
      status: String(selectedRecord.status)
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
    values: ZoneFormValues,
    helpers: FormikHelpers<ZoneFormValues>
  ) => {
    setSaving(true);
    try {
      const payload = formValuesToZonePayload(values);
      const result =
        isNew || !selectedRecord
          ? await createZoneAction(payload, { syncToChanneling: true })
          : await updateZoneAction(selectedRecord.id, payload, {
              syncToChanneling: true
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
            (typeof (errors as any)?.message === 'string' && (errors as any).message) ||
            (typeof (errors as any)?.name?.[0] === 'string' && (errors as any).name[0]) ||
            'Unable to save zone.'
        });
        return;
      }

      const warning = (result as { channelingWarning?: string }).channelingWarning;
      setIsNew(false);
      setSelectedId(result.data.id);
      toast({
        title: 'Saved',
        description: warning
          ? warning
          : isNew || !selectedRecord
            ? 'Zone created.'
            : 'Zone updated.'
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
      const result = await deleteZoneAction(selectedRecord.id, {
        syncToChanneling: true
      });
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cannot delete',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to delete zone.'
        });
        setDeleteOpen(false);
        return;
      }

      setDeleteOpen(false);
      setSelectedId(null);
      setIsNew(false);
      toast({
        title: 'Deleted',
        description: 'Zone removed.'
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="zone-detail-form"
      className={cn(
        'flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card transition-all duration-300',
        detailFormHighlight && 'border-primary ring-2 ring-primary/40'
      )}
    >
      <div className="border-b border-primary/10 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">Zone Details</h2>
      </div>

      {showEmptyState ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Select a zone from the list or click Add to create one.
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
            <Form id="zone-form" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                {locationOptions.length === 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-900 dark:text-amber-100">
                    No Channeling-linked locations found. Refresh Locations under
                    Organization first, then create zones.
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <CustomFormField
                    id="name"
                    type="text"
                    placeholder="Zone Name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="rounded-lg border border-primary/10 bg-muted/40 px-3 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Zone Code
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {isNew || !selectedRecord
                        ? 'Auto-generated on save'
                        : selectedRecord.code}
                    </p>
                  </div>
                </div>

                <CustomFormField
                  id="description"
                  type="textarea"
                  placeholder="Description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <CustomSelectField
                    id="locationId"
                    placeholder="Location"
                    value={formik.values.locationId}
                    onChange={(value) => formik.setFieldValue('locationId', value)}
                    required
                    options={locationSelectOptions}
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
                  form="zone-form"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={saving || locationOptions.length === 0}
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
        title="Delete zone?"
        description={
          selectedRecord
            ? `Remove "${selectedRecord.name}" (${selectedRecord.code}) from HRM${
                selectedRecord.migrateSourceId ? ' and Channeling' : ''
              }? Linked rooms in Channeling will block deletion.`
            : 'Remove this zone?'
        }
        handleVisibilityChange={setDeleteOpen}
        handleContinue={handleDelete}
        loading={saving}
      />
    </div>
  );
}
