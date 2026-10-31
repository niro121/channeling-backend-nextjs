'use client';

import { useState } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Plus, Trash2 } from 'lucide-react';
import { Button, CustomFormField, useToast } from '@archmage/ui';
import {
  createPayeSlabAction,
  deletePayeSlabAction
} from '@/app/actions/hr-admin-actions/hrm-variable.actions';
import {
  emptyPayeSlabDraft,
  formatSalaryLkr,
  type HrmPayeSlabDraft
} from '@/types/hrm-variable';
import { useHrmVariableUi } from './hrm-variable-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName:
    'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const nonNegNumber = Yup.string()
  .required('Required')
  .test('num', 'Enter a valid amount', (value) => {
    if (value == null || value.trim() === '') return false;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0;
  });

const validationSchema = Yup.object({
  fromSalary: nonNegNumber,
  toSalary: Yup.string().test(
    'to',
    'Must be greater than From, or leave blank for ∞',
    function (value) {
      const from = Number(this.parent.fromSalary);
      if (value == null || value.trim() === '') return true;
      const to = Number(value);
      if (!Number.isFinite(to) || to < 0) return false;
      if (!Number.isFinite(from)) return true;
      return to > from;
    }
  ),
  taxRate: Yup.string()
    .required('Required')
    .test('rate', 'Enter a rate between 0 and 100', (value) => {
      if (value == null || value.trim() === '') return false;
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 && n <= 100;
    })
});

function applyFieldErrors(
  helpers: FormikHelpers<HrmPayeSlabDraft>,
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

export default function SectionPayeSlabs() {
  const { toast } = useToast();
  const { record, setRecord } = useHrmVariableUi();
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (
    values: HrmPayeSlabDraft,
    helpers: FormikHelpers<HrmPayeSlabDraft>
  ) => {
    const fromSalary = Number(values.fromSalary);
    const toSalary =
      values.toSalary.trim() === '' ? null : Number(values.toSalary);
    const taxRate = Number(values.taxRate);

    const result = await createPayeSlabAction({
      fromSalary,
      toSalary,
      taxRate
    });

    if (result.isError || !result.data) {
      applyFieldErrors(helpers, result.errors);
      toast({
        title: 'Could not add slab',
        description: String(
          (result.errors as { message?: string }).message ??
            'Please check the form and try again.'
        ),
        variant: 'destructive'
      });
      return;
    }

    setRecord(result.data);
    helpers.resetForm({ values: emptyPayeSlabDraft() });
    setShowAdd(false);
    toast({
      title: 'PAYE slab added',
      description: 'The tax slab was saved successfully.'
    });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deletePayeSlabAction(id);
      if (result.isError) {
        toast({
          title: 'Could not delete slab',
          description: String(
            (result.errors as { message?: string }).message ??
              'Please try again.'
          ),
          variant: 'destructive'
        });
        return;
      }
      if (result.data) {
        setRecord(result.data);
      } else {
        setRecord({
          ...record,
          slabs: record.slabs.filter((s) => s.id !== id)
        });
      }
      toast({
        title: 'PAYE slab deleted',
        description: 'The tax slab was removed successfully.'
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          PAYE Tax Slabs
        </h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={() => setShowAdd((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          Add Slab
        </Button>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {showAdd && (
          <Formik
            initialValues={emptyPayeSlabDraft()}
            validationSchema={validationSchema}
            onSubmit={handleAdd}
          >
            {(formik) => (
              <Form className="rounded-md border border-dashed border-border bg-muted/20 p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                  <CustomFormField
                    id="fromSalary"
                    placeholder="From Salary"
                    type="number"
                    value={formik.values.fromSalary}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="toSalary"
                    placeholder="To Salary (blank = ∞)"
                    type="number"
                    value={formik.values.toSalary}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <div className="relative">
                    <CustomFormField
                      id="taxRate"
                      placeholder="Tax Rate (%)"
                      type="number"
                      value={formik.values.taxRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={{
                        ...fieldStyleClasses,
                        inputClassName: 'w-full pr-8'
                      }}
                    />
                    <span className="pointer-events-none absolute right-3 top-[2.05rem] text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                  <Button
                    type="submit"
                    className="h-10 gap-1.5"
                    disabled={formik.isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        )}

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">From (LKR)</th>
                <th className="px-3 py-2.5">To (LKR)</th>
                <th className="px-3 py-2.5">Rate</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {record.slabs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    No PAYE slabs yet. Click Add Slab to create one.
                  </td>
                </tr>
              ) : (
                record.slabs.map((slab) => (
                  <tr
                    key={slab.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatSalaryLkr(slab.fromSalary)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatSalaryLkr(slab.toSalary)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {slab.taxRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete slab"
                        disabled={deletingId === slab.id}
                        onClick={() => handleDelete(slab.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
