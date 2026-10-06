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
import {
  ROOM_STATUS_OPTIONS,
  emptyRoomFormValues,
  type RoomFormValues
} from '@/types/room';
import {
  createRoomAction,
  deleteRoomAction,
  updateRoomAction
} from '@/app/actions/organization-actions/room.actions';
import { formValuesToRoomPayload } from '@/lib/mappers/room-form.mapper';
import { useRoomUi } from './room-ui-context';
import { ChannelingSyncAlertDialog } from '@/components/common/channeling-sync-alert-dialog';
import { buildChannelingSyncDialog } from '@/components/common/channeling-sync-dialog.helper';
import { buttonStyles } from '@/lib/utils/common-styles';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  number: Yup.string()
    .trim()
    .max(50, 'Must be less than 50 characters')
    .required('Room number is required'),
  description: Yup.string().max(500, 'Must be less than 500 characters'),
  locationId: Yup.string().required('Location is required'),
  zoneId: Yup.string().required('Zone is required'),
  status: Yup.string()
    .oneOf(['0', '1'], 'Status must be Unpublish or Publish')
    .required('Status is required')
});

const statusOptions = ROOM_STATUS_OPTIONS.map((opt) => ({
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

export default function SectionRoomDetail() {
  const { toast } = useToast();
  const router = useRouter();
  const {
    records,
    locationOptions,
    zoneOptions,
    selectedId,
    setSelectedId,
    setRecords,
    isNew,
    setIsNew,
    detailFormHighlight
  } = useRoomUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChannelingDialog, setShowChannelingDialog] = useState(false);
  const pendingSubmitRef = useRef<{
    values: RoomFormValues;
    helpers: FormikHelpers<RoomFormValues>;
  } | null>(null);

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
  const initialValues = useMemo<RoomFormValues>(() => {
    if (isNew || !selectedRecord) return emptyRoomFormValues();
    return {
      number: selectedRecord.number,
      description: selectedRecord.description,
      locationId: selectedRecord.locationId,
      zoneId: selectedRecord.zoneId,
      status: String(selectedRecord.status)
    };
  }, [isNew, selectedRecord]);

  useEffect(() => {
    if (!detailFormHighlight) return;
    const timer = window.setTimeout(() => {
      document.getElementById('number')?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [detailFormHighlight, formKey]);

  const showEmptyState = !isNew && !selectedRecord;
  const canSaveParents = locationOptions.length > 0 && zoneOptions.length > 0;
  const isCreating = isNew || !selectedRecord;

  const executeSave = async (
    values: RoomFormValues,
    helpers: FormikHelpers<RoomFormValues>,
    syncToChanneling: boolean
  ) => {
    setSaving(true);
    try {
      const payload = formValuesToRoomPayload(values);
      const result = isCreating
        ? await createRoomAction(payload, { syncToChanneling })
        : await updateRoomAction(selectedRecord!.id, payload, {
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
            (typeof (errors as any)?.number?.[0] === 'string' &&
              (errors as any).number[0]) ||
            'Unable to save room.'
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
        return [...prev, nextRecord].sort((a, b) =>
          a.number.localeCompare(b.number)
        );
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
              ? 'Room was created in HRM and Channeling.'
              : 'Room was created in HRM only.'
            : syncToChanneling
              ? 'Room was updated in HRM and Channeling.'
              : 'Room was updated in HRM only.'
      });
      router.refresh();
    } finally {
      setSaving(false);
      setShowChannelingDialog(false);
      pendingSubmitRef.current = null;
    }
  };

  const handleSave = async (
    values: RoomFormValues,
    helpers: FormikHelpers<RoomFormValues>
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
    entityLabel: 'room',
    mode: isCreating ? 'create' : 'update',
    hasChannelingLink: Boolean(selectedRecord?.migrateSourceId)
  });

  const handleDelete = async () => {
    if (!selectedRecord) return;

    setSaving(true);
    try {
      const result = await deleteRoomAction(selectedRecord.id, {
        syncToChanneling: true
      });
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cannot delete',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to delete room.'
        });
        setDeleteOpen(false);
        return;
      }

      setDeleteOpen(false);
      setSelectedId(null);
      setIsNew(false);
      toast({
        title: 'Deleted',
        description: 'Room removed.'
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="room-detail-form"
      className={cn(
        'flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card transition-all duration-300',
        detailFormHighlight && 'border-primary ring-2 ring-primary/40'
      )}
    >
      <div className="border-b border-primary/10 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">Room Details</h2>
      </div>

      {showEmptyState ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Select a room from the list or click Add to create one.
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
            const zonesForLocation = zoneOptions.filter(
              (zone) => zone.locationId === formik.values.locationId
            );
            const zoneSelectOptions = (() => {
              const options = zonesForLocation.map((zone) => ({
                id: zone.id,
                name: `${zone.name} (${zone.code})`
              }));
              if (
                selectedRecord &&
                formik.values.locationId === selectedRecord.locationId &&
                !options.some((opt) => opt.id === selectedRecord.zoneId)
              ) {
                options.unshift({
                  id: selectedRecord.zoneId,
                  name: `${selectedRecord.zoneName} (${selectedRecord.zoneCode})`
                });
              }
              return options;
            })();

            return (
              <Form id="room-form" className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                  {!canSaveParents && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-900 dark:text-amber-100">
                      No published locations/zones found. Publish Locations and
                      Zones under Organization first, then create rooms.
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomFormField
                      id="number"
                      type="text"
                      placeholder="Room Number"
                      value={formik.values.number}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <div className="rounded-lg border border-primary/10 bg-muted/40 px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Room Code
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
                      onChange={(value) => {
                        formik.setFieldValue('locationId', value);
                        formik.setFieldValue('zoneId', '');
                      }}
                      required
                      options={locationSelectOptions}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomSelectField
                      id="zoneId"
                      placeholder="Zone"
                      value={formik.values.zoneId}
                      onChange={(value) => formik.setFieldValue('zoneId', value)}
                      required
                      options={zoneSelectOptions}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CustomSelectField
                    id="status"
                    placeholder="Status"
                    value={formik.values.status}
                    onChange={(value) => formik.setFieldValue('status', value)}
                    required
                    options={statusOptions}
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
                    form="room-form"
                    size="sm"
                    className={cn('gap-1.5', buttonStyles.save)}
                    disabled={
                      saving ||
                      showChannelingDialog ||
                      !canSaveParents ||
                      (!isCreating && !formik.dirty)
                    }
                  >
                    <SaveIcon className="h-4 w-4" />
                    {isCreating ? 'Save' : 'Update'}
                  </Button>
                </div>
              </Form>
            );
          }}
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
        title="Delete room?"
        description={
          selectedRecord
            ? `Remove room "${selectedRecord.number}" (${selectedRecord.code}) from HRM${
                selectedRecord.migrateSourceId ? ' and Channeling' : ''
              }? Occupancy or linked sessions in Channeling will block deletion.`
            : 'Remove this room?'
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
