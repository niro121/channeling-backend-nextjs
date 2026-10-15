'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import {
  Building2,
  Layers,
  MinusCircle,
  Plus,
  PlusCircle,
  Save,
  Trash2,
  X
} from 'lucide-react';
import {
  Button,
  Combobox,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  cn,
  useToast
} from '@archmage/ui';
import {
  createSalaryStructureAction,
  updateSalaryStructureAction
} from '@/app/actions/payroll-actions/salary-structure.actions';
import { formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import { STAFF_CATEGORY_OPTIONS } from '@/types/staff-employment-options';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import {
  EMPTY_SALARY_STRUCTURE_FORM,
  SALARY_STRUCTURE_CALC_METHOD_LABELS,
  SALARY_STRUCTURE_READONLY_CALC_METHODS,
  SALARY_STRUCTURE_STATUS_OPTIONS,
  type SalaryFilterOption,
  type SalaryStructureCalcMethod,
  type SalaryStructureFormValues,
  type SalaryStructureLine,
  type SalaryStructurePayload,
  type SalaryStructureRecord,
  type SalaryStructureStatus
} from '@/types/payroll';
import type { SalaryStructureFormSheetMode } from './salary-structures-ui-context';

type SheetStructureFormProps = {
  open: boolean;
  mode: SalaryStructureFormSheetMode;
  record: SalaryStructureRecord | null;
  componentOptions?: PaysheetComponentOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  onOpenChange: (open: boolean) => void;
};

const SECTION_TYPE_IDS: Record<
  'earnings' | 'deductions' | 'employerContributions' | 'otherComponents',
  string[]
> = {
  earnings: ['fixed_allowance', 'percentage_allowance', 'ot'],
  deductions: ['fixed_deduction', 'loan', 'advance'],
  employerContributions: [],
  otherComponents: ['basic_salary']
};

type LineSectionKey =
  | 'earnings'
  | 'deductions'
  | 'employerContributions'
  | 'otherComponents';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  code: Yup.string().trim(),
  name: Yup.string().trim().required('Structure name is required'),
  staffCategory: Yup.string().required('Staff category is required'),
  designationId: Yup.string().required('Designation is required'),
  effectiveFrom: Yup.date()
    .nullable()
    .required('Effective from date is required'),
  basicSalary: Yup.string()
    .trim()
    .required('Basic salary is required')
    .test('is-number', 'Enter a valid amount', (value) => {
      if (!value) return false;
      const n = Number(String(value).replace(/,/g, ''));
      return Number.isFinite(n) && n >= 0;
    })
});

const staffCategoryOptions = STAFF_CATEGORY_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

const statusOptions = SALARY_STRUCTURE_STATUS_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

function parseMoney(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function isReadonlyMethod(method: SalaryStructureCalcMethod): boolean {
  return SALARY_STRUCTURE_READONLY_CALC_METHODS.includes(method);
}

function sumFixedLines(lines: SalaryStructureLine[]): number {
  return lines.reduce((total, line) => {
    if (line.calcMethod !== 'fixed') return total;
    return total + parseMoney(line.value);
  }, 0);
}

function estimateSummary(values: SalaryStructureFormValues) {
  const basic = parseMoney(values.basicSalary);
  const allowances = sumFixedLines(values.earnings);
  const deductions = sumFixedLines(values.deductions);
  const gross = basic + allowances;
  const net = gross - deductions;
  return { gross, deductions, net };
}

function calcMethodForType(typeId?: string): SalaryStructureCalcMethod {
  if (typeId === 'percentage_allowance') return 'percent_of_basic';
  return 'fixed';
}

function optionsForSection(
  section: LineSectionKey,
  all: PaysheetComponentOption[]
): PaysheetComponentOption[] {
  const allowed = SECTION_TYPE_IDS[section];
  if (allowed.length === 0) {
    return all.filter(
      (opt) =>
        !SECTION_TYPE_IDS.earnings.includes(opt.typeId ?? '') &&
        !SECTION_TYPE_IDS.deductions.includes(opt.typeId ?? '') &&
        !SECTION_TYPE_IDS.otherComponents.includes(opt.typeId ?? '')
    );
  }
  return all.filter((opt) => allowed.includes(opt.typeId ?? ''));
}

function recordToFormValues(
  record: SalaryStructureRecord | null
): SalaryStructureFormValues {
  if (!record) return EMPTY_SALARY_STRUCTURE_FORM;
  return {
    ...EMPTY_SALARY_STRUCTURE_FORM,
    code: record.code ?? '',
    name: record.name ?? '',
    institutionId: record.institutionId ?? '',
    staffCategory: record.staffCategoryId ?? '',
    designationId: record.designationId ?? '',
    departmentId: record.departmentId ?? '__all__',
    effectiveFrom: record.effectiveFrom
      ? new Date(record.effectiveFrom)
      : null,
    effectiveTo: record.effectiveTo ? new Date(record.effectiveTo) : null,
    status: record.status ?? 'active',
    basicSalary:
      record.basicSalary != null ? String(record.basicSalary) : '',
    earnings: record.earnings ?? [],
    deductions: record.deductions ?? [],
    employerContributions: record.employerContributions ?? [],
    otherComponents: record.otherComponents ?? []
  };
}

function formValuesToPayload(
  values: SalaryStructureFormValues
): SalaryStructurePayload {
  return {
    name: values.name.trim(),
    institutionId: values.institutionId || '',
    departmentId: values.departmentId || '__all__',
    staffCategoryId: values.staffCategory,
    designationId: values.designationId,
    basicSalary: parseMoney(values.basicSalary),
    effectiveFrom: values.effectiveFrom ?? new Date(),
    effectiveTo: values.effectiveTo,
    status: values.status,
    earnings: values.earnings,
    deductions: values.deductions,
    employerContributions: values.employerContributions,
    otherComponents: values.otherComponents
  };
}

function ComponentSection({
  title,
  icon,
  iconWrapClass,
  sectionKey,
  lines,
  formik,
  pickerOptions,
  addingSection,
  onStartAdd,
  onCancelAdd,
  onPickComponent
}: {
  title: string;
  icon: ReactNode;
  iconWrapClass: string;
  sectionKey: LineSectionKey;
  lines: SalaryStructureLine[];
  formik: FormikProps<SalaryStructureFormValues>;
  pickerOptions: PaysheetComponentOption[];
  addingSection: LineSectionKey | null;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onPickComponent: (componentId: string) => void;
}) {
  const removeLine = (lineId: string) => {
    void formik.setFieldValue(
      sectionKey,
      lines.filter((line) => line.id !== lineId)
    );
  };

  const updateValue = (lineId: string, value: string) => {
    void formik.setFieldValue(
      sectionKey,
      lines.map((line) => (line.id === lineId ? { ...line, value } : line))
    );
  };

  const isAdding = addingSection === sectionKey;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full',
              iconWrapClass
            )}
          >
            {icon}
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1 text-primary"
          onClick={onStartAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {isAdding ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
          <div className="min-w-[12rem] flex-1">
            <Combobox
              label="Paysheet component"
              options={pickerOptions.map((opt) => ({
                id: opt.id,
                name: opt.name
              }))}
              value=""
              defaultValue=""
              onChange={onPickComponent}
              clearable
              triggerClassName="self-end"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10"
            onClick={onCancelAdd}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {lines.length === 0 && !isAdding ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          No components yet. Use Add to pick a paysheet component.
        </p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line) => {
            const readonly = isReadonlyMethod(line.calcMethod);
            return (
              <li
                key={line.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {SALARY_STRUCTURE_CALC_METHOD_LABELS[line.calcMethod]}
                  </p>
                </div>
                <Input
                  className="h-9 w-28 text-right tabular-nums"
                  value={line.value}
                  disabled={readonly}
                  readOnly={readonly}
                  onChange={(e) => updateValue(line.id, e.target.value)}
                  aria-label={`${line.name} value`}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => removeLine(line.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function SheetStructureForm({
  open,
  mode,
  record,
  componentOptions = [],
  departmentOptions = [],
  designationOptions = [],
  onOpenChange
}: SheetStructureFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [addingSection, setAddingSection] = useState<LineSectionKey | null>(
    null
  );

  const initialValues = useMemo(() => recordToFormValues(record), [record]);

  const departmentSelectOptions = useMemo(
    () => [{ id: '__all__', name: 'All' }, ...departmentOptions],
    [departmentOptions]
  );

  const title =
    mode === 'edit' ? 'Edit Salary Structure' : 'Add Salary Structure';
  const description = 'Configure the structure and its salary components.';

  const handleClose = () => {
    setAddingSection(null);
    onOpenChange(false);
  };

  const handlePickComponent = (
    sectionKey: LineSectionKey,
    componentId: string,
    formik: FormikProps<SalaryStructureFormValues>
  ) => {
    if (!componentId) return;
    const option = componentOptions.find((item) => item.id === componentId);
    if (!option) return;

    const lines = formik.values[sectionKey];
    if (lines.some((line) => line.componentId === componentId)) {
      toast({
        title: 'Already added',
        description: `${option.name} is already in this section.`
      });
      setAddingSection(null);
      return;
    }

    const calcMethod = calcMethodForType(option.typeId);
    const next: SalaryStructureLine = {
      id: crypto.randomUUID(),
      componentId: option.id,
      name: option.name,
      calcMethod,
      value:
        calcMethod === 'percent_of_basic' && option.percentage != null
          ? String(option.percentage)
          : ''
    };
    void formik.setFieldValue(sectionKey, [...lines, next]);
    setAddingSection(null);
  };

  const handleSubmit = async (
    values: SalaryStructureFormValues,
    helpers: FormikHelpers<SalaryStructureFormValues>
  ) => {
    setSaving(true);
    try {
      const payload = formValuesToPayload(values);
      const result =
        mode === 'edit' && record?.id
          ? await updateSalaryStructureAction(record.id, payload)
          : await createSalaryStructureAction(payload);

      if (result.isError || !result.data) {
        const issues = result.errors.issues as
          | Record<string, string[]>
          | undefined;
        if (issues) {
          for (const [field, messages] of Object.entries(issues)) {
            helpers.setFieldError(field, messages[0]);
          }
        }
        toast({
          title: 'Save failed',
          description:
            (result.errors.message as string) ??
            'Could not save salary structure.'
        });
        return;
      }

      toast({
        title: mode === 'edit' ? 'Structure updated' : 'Structure created',
        description: `${result.data.code} — ${result.data.name}`
      });
      handleClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <Formik
          key={`${mode}-${record?.id ?? 'new'}-${formKey}`}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formik) => {
            const summary = estimateSummary(formik.values);

            return (
              <Form className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CustomFormField
                      id="code"
                      type="text"
                      placeholder="Structure Code (Auto Generated)"
                      value={formik.values.code}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="name"
                      type="text"
                      placeholder="Structure Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="institutionId"
                      placeholder="Institution"
                      value={formik.values.institutionId}
                      onChange={(value) =>
                        void formik.setFieldValue('institutionId', value)
                      }
                      required={false}
                      options={INSTITUTION_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="staffCategory"
                      placeholder="Staff Category"
                      value={formik.values.staffCategory}
                      onChange={(value) =>
                        void formik.setFieldValue('staffCategory', value)
                      }
                      required
                      options={staffCategoryOptions}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="designationId"
                      placeholder="Designation"
                      value={formik.values.designationId}
                      onChange={(value) =>
                        void formik.setFieldValue('designationId', value)
                      }
                      required
                      options={designationOptions}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="departmentId"
                      placeholder="Department"
                      value={formik.values.departmentId}
                      onChange={(value) =>
                        void formik.setFieldValue('departmentId', value)
                      }
                      required={false}
                      options={departmentSelectOptions}
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
                      required={false}
                      value={formik.values.effectiveTo}
                      onChange={(value) =>
                        void formik.setFieldValue('effectiveTo', value ?? null)
                      }
                      onBlur={formik.handleBlur}
                      styleClasses={fieldStyleClasses}
                      useFormikError={false}
                    />
                    <CustomSelectField
                      id="status"
                      placeholder="Status"
                      value={formik.values.status}
                      onChange={(value) =>
                        void formik.setFieldValue(
                          'status',
                          value as SalaryStructureStatus
                        )
                      }
                      required={false}
                      options={statusOptions}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <CustomFormField
                      id="basicSalary"
                      type="text"
                      placeholder="Basic Salary (LKR)"
                      value={formik.values.basicSalary}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <ComponentSection
                    title="Earnings / Allowances"
                    icon={<PlusCircle className="h-4 w-4 text-emerald-700" />}
                    iconWrapClass="bg-emerald-100"
                    sectionKey="earnings"
                    lines={formik.values.earnings}
                    formik={formik}
                    pickerOptions={optionsForSection(
                      'earnings',
                      componentOptions
                    )}
                    addingSection={addingSection}
                    onStartAdd={() => setAddingSection('earnings')}
                    onCancelAdd={() => setAddingSection(null)}
                    onPickComponent={(id) =>
                      handlePickComponent('earnings', id, formik)
                    }
                  />

                  <ComponentSection
                    title="Deductions"
                    icon={<MinusCircle className="h-4 w-4 text-red-700" />}
                    iconWrapClass="bg-red-100"
                    sectionKey="deductions"
                    lines={formik.values.deductions}
                    formik={formik}
                    pickerOptions={optionsForSection(
                      'deductions',
                      componentOptions
                    )}
                    addingSection={addingSection}
                    onStartAdd={() => setAddingSection('deductions')}
                    onCancelAdd={() => setAddingSection(null)}
                    onPickComponent={(id) =>
                      handlePickComponent('deductions', id, formik)
                    }
                  />

                  <ComponentSection
                    title="Employer Contributions"
                    icon={<Building2 className="h-4 w-4 text-sky-700" />}
                    iconWrapClass="bg-sky-100"
                    sectionKey="employerContributions"
                    lines={formik.values.employerContributions}
                    formik={formik}
                    pickerOptions={optionsForSection(
                      'employerContributions',
                      componentOptions
                    )}
                    addingSection={addingSection}
                    onStartAdd={() => setAddingSection('employerContributions')}
                    onCancelAdd={() => setAddingSection(null)}
                    onPickComponent={(id) =>
                      handlePickComponent('employerContributions', id, formik)
                    }
                  />

                  <ComponentSection
                    title="Other Salary Components"
                    icon={<Layers className="h-4 w-4 text-slate-700" />}
                    iconWrapClass="bg-slate-100"
                    sectionKey="otherComponents"
                    lines={formik.values.otherComponents}
                    formik={formik}
                    pickerOptions={optionsForSection(
                      'otherComponents',
                      componentOptions
                    )}
                    addingSection={addingSection}
                    onStartAdd={() => setAddingSection('otherComponents')}
                    onCancelAdd={() => setAddingSection(null)}
                    onPickComponent={(id) =>
                      handlePickComponent('otherComponents', id, formik)
                    }
                  />

                  <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Gross
                      </p>
                      <p className="mt-0.5 font-semibold tabular-nums">
                        {formatLkr(summary.gross, { currency: false })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Deductions
                      </p>
                      <p className="mt-0.5 font-semibold tabular-nums text-red-600">
                        {formatLkr(summary.deductions, { currency: false })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Net (est.)
                      </p>
                      <p className="mt-0.5 font-semibold tabular-nums text-emerald-700">
                        {formatLkr(summary.net, { currency: false })}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimate uses Basic + fixed earnings − fixed deductions.
                    Percentage and Auto lines are ignored in the estimate.
                  </p>

                  {mode === 'edit' ? (
                    <div className="grid gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>
                        Created by:{' '}
                        <span className="text-foreground">
                          {record?.createdBy
                            ? `${record.createdBy}${
                                record.createdAt
                                  ? ` — ${formatDateTime(record.createdAt)}`
                                  : ''
                              }`
                            : '—'}
                        </span>
                      </p>
                      <p>
                        Last updated:{' '}
                        <span className="text-foreground">
                          {record?.updatedBy
                            ? `${record.updatedBy}${
                                record.updatedAt
                                  ? ` — ${formatDateTime(record.updatedAt)}`
                                  : ''
                              }`
                            : '—'}
                        </span>
                      </p>
                    </div>
                  ) : null}
                </div>

                <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                    disabled={saving}
                    onClick={() => {
                      formik.resetForm({
                        values: EMPTY_SALARY_STRUCTURE_FORM
                      });
                      setFormKey((key) => key + 1);
                      handleClose();
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 gap-1.5"
                    disabled={saving || formik.isSubmitting}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </SheetFooter>
              </Form>
            );
          }}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
