'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { FilePlus2, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  useToast
} from '@archmage/ui';
import {
  bulkCreatePaysheetAssignmentsAction,
  checkBulkPaysheetAssignmentOverlapAction
} from '@/app/actions/payroll-actions/paysheet-assignment.actions';
import {
  EMPTY_BULK_PAYSHEET_ASSIGN_FORM,
  type BulkPaysheetAssignFormValues,
  type BulkPaysheetAssignMode,
  type PaysheetAssignmentRecord
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import { useBulkAssignUi } from './bulk-assign-ui-context';
import DialogOverlap from './dialog-overlap';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName:
    'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  componentId: Yup.string().required('Paysheet component is required'),
  effectiveFrom: Yup.date()
    .nullable()
    .required('Effective from date is required'),
  effectiveTo: Yup.date()
    .nullable()
    .required('Effective to date is required')
    .min(
      Yup.ref('effectiveFrom'),
      'Effective to must be on or after effective from'
    ),
  value: Yup.string()
    .required('Value is required')
    .test('num', 'Enter a valid amount', (value) => {
      if (value == null || value === '') return false;
      return Number.isFinite(Number(value));
    })
});

type SectionBulkFormProps = {
  componentOptions?: PaysheetComponentOption[];
  onAssigned?: (count: number, created?: PaysheetAssignmentRecord[]) => void;
  onRemoved?: (count: number) => void;
};

export default function SectionBulkForm({
  componentOptions = [],
  onAssigned,
  onRemoved
}: SectionBulkFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    selectedStaffIds,
    requestClearSelection,
    overlapDialogOpen,
    openOverlapDialog,
    closeOverlapDialog
  } = useBulkAssignUi();
  const [pendingValues, setPendingValues] =
    useState<BulkPaysheetAssignFormValues | null>(null);
  const [overlapCount, setOverlapCount] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const selectOptions = useMemo(
    () =>
      componentOptions.map((item) => ({
        id: item.id,
        name: item.name
      })),
    [componentOptions]
  );

  const handleRemoveSelected = () => {
    const count = selectedStaffIds.length;
    if (count === 0) {
      toast({
        title: 'Nothing selected',
        description: 'Select staff rows before clearing selection.'
      });
      return;
    }
    requestClearSelection();
    onRemoved?.(count);
    toast({
      title: 'Selection cleared',
      description: `${count} staff unchecked (page selection only).`
    });
  };

  const runAssign = async (
    values: BulkPaysheetAssignFormValues,
    mode: BulkPaysheetAssignMode
  ) => {
    setSaving(true);
    try {
      const result = await bulkCreatePaysheetAssignmentsAction({
        staffIds: selectedStaffIds,
        componentId: values.componentId,
        effectiveFrom: values.effectiveFrom as Date,
        effectiveTo: values.effectiveTo,
        value: Number(values.value),
        mode
      });

      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Bulk assign failed',
          description:
            (result.errors.message as string) ??
            'Could not complete bulk assignment.'
        });
        return;
      }

      const createdCount = result.data.created.length;
      onAssigned?.(createdCount, result.data.created);
      requestClearSelection();
      closeOverlapDialog();
      setPendingValues(null);
      setOverlapCount(0);

      const parts = [`${createdCount} assigned`];
      if (result.data.skipped) parts.push(`${result.data.skipped} skipped`);
      if (result.data.overwritten) {
        parts.push(`${result.data.overwritten} overwritten`);
      }

      toast({
        title: 'Bulk assignment complete',
        description: parts.join(' · ')
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Bulk Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            key={formKey}
            initialValues={EMPTY_BULK_PAYSHEET_ASSIGN_FORM}
            validationSchema={validationSchema}
            onSubmit={async (values) => {
              if (selectedStaffIds.length === 0) {
                toast({
                  title: 'Select staff first',
                  description:
                    'Check one or more staff on the matching table before assigning.'
                });
                return;
              }

              setSaving(true);
              try {
                const overlapRes =
                  await checkBulkPaysheetAssignmentOverlapAction({
                    staffIds: selectedStaffIds,
                    componentId: values.componentId,
                    effectiveFrom: values.effectiveFrom as Date,
                    effectiveTo: values.effectiveTo
                  });

                if (overlapRes.isError) {
                  toast({
                    variant: 'destructive',
                    title: 'Overlap check failed',
                    description:
                      (overlapRes.errors.message as string) ??
                      'Could not check overlaps.'
                  });
                  return;
                }

                const overlaps = overlapRes.data ?? [];
                if (overlaps.length > 0) {
                  setPendingValues(values);
                  setOverlapCount(overlaps.length);
                  openOverlapDialog();
                  return;
                }
              } finally {
                setSaving(false);
              }

              await runAssign(values, 'create');
            }}
          >
            {(formik) => (
              <Form className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <CustomSelectField
                    id="componentId"
                    placeholder="Paysheet Component"
                    value={formik.values.componentId}
                    onChange={(value) =>
                      void formik.setFieldValue('componentId', value)
                    }
                    required
                    options={selectOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="effectiveFrom"
                    placeholder="Effective From"
                    required
                    value={formik.values.effectiveFrom}
                    onChange={(value) =>
                      void formik.setFieldValue(
                        'effectiveFrom',
                        value ?? null
                      )
                    }
                    onBlur={formik.handleBlur}
                    styleClasses={fieldStyleClasses}
                    useFormikError
                  />
                  <CustomDatePickerField
                    id="effectiveTo"
                    placeholder="Effective To"
                    required
                    value={formik.values.effectiveTo}
                    onChange={(value) =>
                      void formik.setFieldValue('effectiveTo', value ?? null)
                    }
                    onBlur={formik.handleBlur}
                    styleClasses={fieldStyleClasses}
                    useFormikError
                  />
                  <CustomFormField
                    id="value"
                    type="text"
                    placeholder="Value (LKR)"
                    value={formik.values.value}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 gap-1.5"
                    disabled={saving}
                  >
                    <FilePlus2 className="h-4 w-4" />
                    {saving ? 'Working…' : 'Assign Selected'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 text-red-500 hover:bg-red-500 hover:text-white"
                    disabled={saving}
                    onClick={handleRemoveSelected}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Selected
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9"
                    disabled={saving}
                    onClick={() => {
                      formik.resetForm({
                        values: EMPTY_BULK_PAYSHEET_ASSIGN_FORM
                      });
                      setFormKey((key) => key + 1);
                    }}
                  >
                    Reset form
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>

      <DialogOverlap
        open={overlapDialogOpen}
        selectedCount={selectedStaffIds.length}
        overlapCount={overlapCount}
        loading={saving}
        onCancel={() => {
          if (saving) return;
          closeOverlapDialog();
          setPendingValues(null);
          setOverlapCount(0);
        }}
        onSkipDuplicates={() => {
          if (pendingValues) void runAssign(pendingValues, 'skip');
        }}
        onOverwrite={() => {
          if (pendingValues) void runAssign(pendingValues, 'overwrite');
        }}
      />
    </>
  );
}
