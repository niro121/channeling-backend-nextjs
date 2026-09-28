'use client';

import { useState } from 'react';
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
  EMPTY_BULK_PAYSHEET_ASSIGN_FORM,
  type BulkPaysheetAssignFormValues
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

const LATER = 'Will be wired in the dynamic phase.';

const validationSchema = Yup.object({
  componentId: Yup.string().required('Paysheet component is required'),
  effectiveFrom: Yup.date()
    .nullable()
    .required('Effective from date is required'),
  effectiveTo: Yup.date().nullable().required('Effective to date is required'),
  value: Yup.string().required('Value is required')
});

type SectionBulkFormProps = {
  componentOptions?: PaysheetComponentOption[];
  onAssigned?: (count: number) => void;
  onRemoved?: (count: number) => void;
};

export default function SectionBulkForm({
  componentOptions = [],
  onAssigned,
  onRemoved
}: SectionBulkFormProps) {
  const { toast } = useToast();
  const {
    selectedStaffIds,
    requestClearSelection,
    overlapDialogOpen,
    openOverlapDialog,
    closeOverlapDialog
  } = useBulkAssignUi();
  const [pendingValues, setPendingValues] =
    useState<BulkPaysheetAssignFormValues | null>(null);
  const [formKey, setFormKey] = useState(0);

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

  const runAssign = (
    values: BulkPaysheetAssignFormValues,
    mode: 'skip' | 'overwrite'
  ) => {
    const count = selectedStaffIds.length;
    onAssigned?.(count);
    requestClearSelection();
    closeOverlapDialog();
    setPendingValues(null);
    toast({
      variant: 'success',
      title: mode === 'overwrite' ? 'Overwrite selected' : 'Assign selected',
      description: `${LATER} (${count} staff, ${mode}).`
    });
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
            onSubmit={(values) => {
              if (selectedStaffIds.length === 0) {
                toast({
                  title: 'Select staff first',
                  description:
                    'Check one or more staff on the matching table before assigning.'
                });
                return;
              }
              setPendingValues(values);
              openOverlapDialog();
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
                    options={componentOptions}
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
                  <Button type="submit" size="sm" className="h-9 gap-1.5">
                    <FilePlus2 className="h-4 w-4" />
                    Assign Selected
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 text-red-500 hover:bg-red-500 hover:text-white"
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
        onCancel={() => {
          closeOverlapDialog();
          setPendingValues(null);
        }}
        onSkipDuplicates={() => {
          if (pendingValues) runAssign(pendingValues, 'skip');
        }}
        onOverwrite={() => {
          if (pendingValues) runAssign(pendingValues, 'overwrite');
        }}
      />
    </>
  );
}
