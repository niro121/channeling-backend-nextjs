'use client';

import { useMemo, useState } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';
import { Eye, Save, Send } from 'lucide-react';
import {
  Button,
  CustomAlertDialog,
  CustomFormField,
  CustomSelectField,
  useToast
} from '@archmage/ui';
import { buttonStyles } from '@/lib/utils/common-styles';
import { cn } from '@/lib/utils';
import {
  EVALUATION_CRITERIA,
  EVALUATION_CRITERION_LABELS,
  EVALUATION_DECISION_LABELS,
  EVALUATION_DECISIONS,
  EVALUATION_RATING_LABELS,
  EVALUATION_RATINGS,
  INTERVIEW_TYPE_LABELS,
  computeEvaluationScore,
  type EvaluationCriterionId,
  type EvaluationFormValues,
  type EvaluationRating,
  type EvaluationRecord
} from '@/types/recruitment';
import { useEvaluationUi } from './evaluation-ui-context';

type SectionFormProps = {
  record: EvaluationRecord;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const decisionOptions = EVALUATION_DECISIONS.map((id) => ({
  id,
  name: EVALUATION_DECISION_LABELS[id]
}));

const validationSchema = Yup.object({
  recommendation: Yup.string().required('Recommendation is required'),
  finalDecision: Yup.string().required('Final decision is required')
});

function formatDay(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value || '—'}</p>
    </div>
  );
}

export default function SectionForm({ record }: SectionFormProps) {
  const { toast } = useToast();
  const { openPreview, setActiveRecord } = useEvaluationUi();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<EvaluationFormValues | null>(null);
  const [loading, setLoading] = useState(false);

  const initialValues = useMemo<EvaluationFormValues>(
    () => ({
      ratings: { ...record.ratings },
      strengths: record.strengths,
      weaknesses: record.weaknesses,
      interviewComments: record.interviewComments,
      recommendation: record.recommendation,
      finalDecision: record.finalDecision
    }),
    [record]
  );

  const isLocked = record.status === 'submitted';

  const handleSaveDraft = (values: EvaluationFormValues) => {
    const { score } = computeEvaluationScore(values.ratings);
    toast({
      title: 'Not saved',
      description: `Draft evaluation for ${record.candidateName} (score ${score}) will be wired in the workflow phase.`
    });
    setActiveRecord({
      ...record,
      ...values,
      recommendation: (values.recommendation || '') as EvaluationRecord['recommendation'],
      finalDecision: (values.finalDecision || '') as EvaluationRecord['finalDecision'],
      overallScore: score,
      status: 'draft'
    });
  };

  const handleSubmitConfirm = () => {
    if (!pendingValues) return;
    setLoading(true);
    const { score } = computeEvaluationScore(pendingValues.ratings);
    toast({
      title: 'Not saved',
      description: `Submit evaluation for ${record.candidateName} (score ${score}) will be wired in the workflow phase.`
    });
    setActiveRecord({
      ...record,
      ...pendingValues,
      recommendation: (pendingValues.recommendation ||
        '') as EvaluationRecord['recommendation'],
      finalDecision: (pendingValues.finalDecision ||
        '') as EvaluationRecord['finalDecision'],
      overallScore: score,
      status: 'submitted'
    });
    setLoading(false);
    setSubmitOpen(false);
    setPendingValues(null);
  };

  return (
    <>
      <Formik
        key={record.id}
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={(values) => {
          setPendingValues(values);
          setSubmitOpen(true);
        }}
      >
        {(formik) => {
          const { score, ratedCount, totalCriteria } = computeEvaluationScore(
            formik.values.ratings
          );

          return (
            <Form className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[1fr_16rem]">
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Interview Evaluation
                      </h2>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          record.status === 'draft'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-emerald-100 text-emerald-800'
                        )}
                      >
                        {record.status === 'draft' ? 'Draft' : 'Submitted'}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetaCard label="Candidate" value={record.candidateName} />
                      <MetaCard label="Job Position" value={record.jobTitle} />
                      <MetaCard
                        label="Interview Date"
                        value={formatDay(record.interviewDate)}
                      />
                      <MetaCard label="Interviewer" value={record.interviewer} />
                      <MetaCard
                        label="Interview Type"
                        value={INTERVIEW_TYPE_LABELS[record.interviewType]}
                      />
                      <MetaCard
                        label="Interview Stage"
                        value={record.interviewStage}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Evaluation Criteria
                    </h2>
                    <div className="space-y-3">
                      {EVALUATION_CRITERIA.map((criterionId) => (
                        <div
                          key={criterionId}
                          className="flex flex-col gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <p className="text-sm font-medium">
                            {EVALUATION_CRITERION_LABELS[criterionId]}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {EVALUATION_RATINGS.map((rating) => {
                              const selected =
                                formik.values.ratings[criterionId] === rating;
                              return (
                                <Button
                                  key={rating}
                                  type="button"
                                  size="sm"
                                  variant={selected ? 'default' : 'outline'}
                                  disabled={isLocked}
                                  className={cn(
                                    'h-8 rounded-full px-3',
                                    selected &&
                                      'bg-primary text-primary-foreground hover:bg-primary/90'
                                  )}
                                  onClick={() => {
                                    const next = {
                                      ...formik.values.ratings
                                    } as Record<
                                      EvaluationCriterionId,
                                      EvaluationRating | undefined
                                    >;
                                    if (selected) {
                                      delete next[criterionId];
                                    } else {
                                      next[criterionId] = rating;
                                    }
                                    void formik.setFieldValue('ratings', next);
                                  }}
                                >
                                  {EVALUATION_RATING_LABELS[rating]}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                    <CustomFormField
                      id="strengths"
                      type="textarea"
                      placeholder="Strengths"
                      value={formik.values.strengths}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled={isLocked}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="weaknesses"
                      type="textarea"
                      placeholder="Weaknesses"
                      value={formik.values.weaknesses}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled={isLocked}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="interviewComments"
                      type="textarea"
                      placeholder="Interview Comments"
                      value={formik.values.interviewComments}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled={isLocked}
                      styleClasses={fieldStyleClasses}
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <CustomSelectField
                        id="recommendation"
                        placeholder="Recommendation"
                        value={formik.values.recommendation || undefined}
                        onChange={(value) =>
                          void formik.setFieldValue('recommendation', value)
                        }
                        required
                        disabled={isLocked}
                        options={decisionOptions}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomSelectField
                        id="finalDecision"
                        placeholder="Final Decision"
                        value={formik.values.finalDecision || undefined}
                        onChange={(value) =>
                          void formik.setFieldValue('finalDecision', value)
                        }
                        required
                        disabled={isLocked}
                        options={decisionOptions}
                        styleClasses={fieldStyleClasses}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        aria-label="Preview evaluation"
                        onClick={() => {
                          const { score: liveScore } = computeEvaluationScore(
                            formik.values.ratings
                          );
                          setActiveRecord({
                            ...record,
                            ...formik.values,
                            recommendation: (formik.values.recommendation ||
                              '') as EvaluationRecord['recommendation'],
                            finalDecision: (formik.values.finalDecision ||
                              '') as EvaluationRecord['finalDecision'],
                            overallScore: liveScore
                          });
                          openPreview();
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isLocked ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className={buttonStyles.saveAndClose}
                            onClick={() => handleSaveDraft(formik.values)}
                          >
                            <Save className="h-4 w-4" />
                            Save Draft
                          </Button>
                          <Button
                            type="submit"
                            className={`${buttonStyles.save} gap-1.5`}
                          >
                            <Send className="h-4 w-4" />
                            Submit Evaluation
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Overall Score
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums text-primary">
                      {score}
                      <span className="text-base font-medium text-muted-foreground">
                        /100
                      </span>
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, score)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {ratedCount} of {totalCriteria} criteria rated
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Previous Evaluations
                    </p>
                    {record.previousEvaluations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None yet.</p>
                    ) : (
                      <ul className="space-y-3">
                        {record.previousEvaluations.map((entry) => (
                          <li key={entry.id} className="text-sm">
                            <p className="font-medium">
                              {entry.title} ({entry.score})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.by} · {formatDay(entry.at)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>

      <CustomAlertDialog
        open={submitOpen}
        handleVisibilityChange={(open) => {
          setSubmitOpen(open);
          if (!open) setPendingValues(null);
        }}
        loading={loading}
        title="Submit evaluation?"
        description="Submitted evaluations are locked and shared with the hiring panel."
        handleContinue={handleSubmitConfirm}
        className={{
          actionButton:
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
        }}
      />
    </>
  );
}
