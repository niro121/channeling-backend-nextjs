'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { BackButton, Button, useToast } from '@archmage/ui';
import type {
  PatientBillDetail,
  PatientBillDraft,
  PatientBillFormErrors,
} from '@/types/patient-bill';
import { calculatePatientBillSummary } from '@/lib/patient-bills/calculations';
import { createInitialDraft } from '@/lib/patient-bills/form-utils';
import { recordToDraft } from '@/lib/patient-bills/mappers';
import {
  hasPatientBillDetailsErrors,
  hasValidationErrors,
  validatePatientBillDetailsForm,
  validatePatientBillForm,
} from '@/lib/patient-bills/validations';
import { usePatientBillDraft } from '@/hooks/patient-bills/use-patient-bill-draft';
import {
  createPatientBillAction,
  updatePatientBillDetailsAction,
} from '@/app/actions/patient-bills/patient-bills.actions';
import { BillInformationSection } from './bill-information-section';
import { BillSummaryCard } from './bill-summary-card';
import { BillBreakdownSection } from './bill-breakdown-section';

type PatientBillFormProps = {
  bill?: PatientBillDetail;
  isEditPage?: boolean;
};

export function PatientBillForm({ bill, isEditPage = false }: PatientBillFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { loadDraft, discardDraft } = usePatientBillDraft();
  const [draft, setDraft] = useState<PatientBillDraft>(() => {
    if (isEditPage && bill) return recordToDraft(bill);
    return createInitialDraft();
  });
  const [errors, setErrors] = useState<PatientBillFormErrors>({});
  const [hydrated, setHydrated] = useState(isEditPage);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    if (isEditPage) return;

    const stored = loadDraft();
    if (stored) {
      setDraft({ ...stored, billNumber: '' });
    }
    setHydrated(true);
  }, [isEditPage, loadDraft]);

  const summary = useMemo(() => calculatePatientBillSummary(draft.lineItems), [draft.lineItems]);

  const updateDraft = useCallback((patch: Partial<PatientBillDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setErrors({});
  }, []);

  const updateLineItems = useCallback((lineItems: PatientBillDraft['lineItems']) => {
    setDraft((prev) => ({ ...prev, lineItems }));
    setErrors({});
  }, []);

  const handleSaveBill = () => {
    const validationErrors = isEditPage
      ? validatePatientBillDetailsForm(draft)
      : validatePatientBillForm(draft);
    setErrors(validationErrors);

    const hasErrors = isEditPage
      ? hasPatientBillDetailsErrors(validationErrors)
      : hasValidationErrors(validationErrors);

    if (hasErrors) {
      toast({
        variant: 'destructive',
        title: 'Validation failed',
        description: 'Please complete all required fields before saving.',
      });
      return;
    }

    startSaveTransition(async () => {
      if (isEditPage) {
        const result = await updatePatientBillDetailsAction(bill!.id, {
          admissionDate: draft.admissionDate,
          dischargeDate: draft.dischargeDate,
          customerName: draft.customerName,
          customerNicPhone: draft.customerNicPhone,
          customerAddress: draft.customerAddress,
        });
        if (!result.success) {
          toast({
            variant: 'destructive',
            title: 'Save failed',
            description: result.message,
          });
          return;
        }

        toast({
          title: 'Bill updated',
          description: 'Patient bill has been updated successfully.',
        });
        router.push(`/patient-bills/${bill!.id}`);
        router.refresh();
        return;
      }

      const result = await createPatientBillAction(draft);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: result.message,
        });
        return;
      }

      discardDraft();
      const isDraftSave = summary.lineItemCount === 0;
      toast({
        title: isDraftSave ? 'Draft admission saved' : 'Bill saved',
        description: isDraftSave
          ? `Saved as ${result.bxtNumber} · ${result.billNumber}. Add doctor charges when ready.`
          : `Saved as ${result.bxtNumber} · ${result.billNumber}`,
      });
      router.push(`/patient-bills/${result.id}`);
      router.refresh();
    });
  };

  if (!hydrated) {
    return null;
  }

  const backHref = isEditPage ? `/patient-bills/${bill!.id}` : '/patient-bills';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <BackButton href={backHref} label={isEditPage ? 'Back to Bill' : 'Back to Bills'} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEditPage ? 'Edit Patient Bill' : 'Create Patient Bill'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isEditPage
                ? 'Update admission and customer details. Manage doctor charges from the bill detail page.'
                : 'Enter BHT manually. Bill number is assigned on save. You can save admission details as Draft, then add doctor charges later.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={handleSaveBill}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving…' : isEditPage ? 'Update Bill' : 'Save Bill'}
          </Button>
        </div>
      </div>

      <div className={`grid gap-6 ${isEditPage ? '' : 'lg:grid-cols-3'}`}>
        <div className={isEditPage ? '' : 'lg:col-span-2'}>
          <BillInformationSection draft={draft} errors={errors} onChange={updateDraft} />
        </div>
        {!isEditPage && <BillSummaryCard summary={summary} />}
      </div>

      {!isEditPage && (
        <BillBreakdownSection
          lineItems={draft.lineItems}
          summary={summary}
          errors={errors}
          onChange={updateLineItems}
        />
      )}

      {!isEditPage && (
        <p className="text-xs text-muted-foreground">
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => {
              discardDraft();
              setDraft(createInitialDraft());
              setErrors({});
              toast({ title: 'Draft discarded' });
            }}
          >
            Discard saved draft
          </button>
          {' · '}
          <Link href="/patient-bills" className="underline hover:text-foreground">
            Return to list
          </Link>
        </p>
      )}
    </div>
  );
}
