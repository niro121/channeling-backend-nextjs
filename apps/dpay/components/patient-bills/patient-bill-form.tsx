'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { BackButton, Button, useToast } from '@archmage/ui';
import type {
  GeneratedBillNumbers,
  PatientBillDetail,
  PatientBillDraft,
  PatientBillFormErrors,
} from '@/types/patient-bill';
import { calculatePatientBillSummary } from '@/lib/patient-bills/calculations';
import { createInitialDraft } from '@/lib/patient-bills/form-utils';
import { recordToDraft } from '@/lib/patient-bills/mappers';
import { hasValidationErrors, validatePatientBillForm } from '@/lib/patient-bills/validations';
import { usePatientBillDraft } from '@/hooks/patient-bills/use-patient-bill-draft';
import {
  createPatientBillAction,
  updatePatientBillAction,
} from '@/app/actions/patient-bills/patient-bills.actions';
import { BillInformationSection } from './bill-information-section';
import { BillSummaryCard } from './bill-summary-card';
import { BillBreakdownSection } from './bill-breakdown-section';

type PatientBillFormProps = {
  initialNumbers?: GeneratedBillNumbers;
  bill?: PatientBillDetail;
  isEditPage?: boolean;
};

export function PatientBillForm({
  initialNumbers,
  bill,
  isEditPage = false,
}: PatientBillFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { loadDraft, saveDraft, discardDraft } = usePatientBillDraft();
  const [draft, setDraft] = useState<PatientBillDraft>(() => {
    if (isEditPage && bill) return recordToDraft(bill);
    return createInitialDraft(initialNumbers!);
  });
  const [errors, setErrors] = useState<PatientBillFormErrors>({});
  const [hydrated, setHydrated] = useState(isEditPage);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    if (isEditPage) return;

    const stored = loadDraft();
    if (stored) {
      setDraft(stored);
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

  const handleSaveDraft = () => {
    if (isEditPage) return;
    saveDraft(draft);
    toast({
      title: 'Draft saved',
      description: 'Your bill draft has been saved locally.',
    });
  };

  const handleSaveBill = () => {
    const validationErrors = validatePatientBillForm(draft);
    setErrors(validationErrors);
    if (hasValidationErrors(validationErrors)) {
      toast({
        variant: 'destructive',
        title: 'Validation failed',
        description: 'Please complete all required fields before saving.',
      });
      return;
    }

    startSaveTransition(async () => {
      const result = isEditPage
        ? await updatePatientBillAction(bill!.id, draft)
        : await createPatientBillAction(draft);

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: result.message,
        });
        return;
      }

      if (!isEditPage) {
        discardDraft();
      }

      toast({
        title: isEditPage ? 'Bill updated' : 'Bill saved',
        description: isEditPage
          ? 'Patient bill has been updated successfully.'
          : 'Patient bill has been saved successfully.',
      });

      if (isEditPage) {
        router.push(`/patient-bills/${bill!.id}`);
      } else {
        router.push('/patient-bills');
      }
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
                ? 'Update admission details and bill line items.'
                : 'Auto-generated BXT and Bill numbers. Record admission details and add doctor line items.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isEditPage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSaveDraft}
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          )}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BillInformationSection draft={draft} errors={errors} onChange={updateDraft} />
        </div>
        <BillSummaryCard summary={summary} />
      </div>

      <BillBreakdownSection
        lineItems={draft.lineItems}
        summary={summary}
        errors={errors}
        onChange={updateLineItems}
      />

      {!isEditPage && (
        <p className="text-xs text-muted-foreground">
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => {
              discardDraft();
              setDraft(createInitialDraft(initialNumbers!));
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
