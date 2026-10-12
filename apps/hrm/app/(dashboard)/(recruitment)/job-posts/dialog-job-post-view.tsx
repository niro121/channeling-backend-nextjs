'use client';

import { Badge, CustomDialog } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  JOB_POST_STATUS_LABELS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  type JobPostRecord
} from '@/types/recruitment';

type DialogJobPostViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: JobPostRecord | null;
};

type DetailRow = {
  label: string;
  value: string;
  fullWidth?: boolean;
};

function formatDateOnly(value?: string | null): string {
  if (!value) return '—';
  return formatDateTime(value, 'dd MMM yyyy');
}

function DetailCard({ label, value, fullWidth }: DetailRow) {
  return (
    <div
      className={
        fullWidth
          ? 'rounded-md border border-border bg-muted/20 px-3 py-2 sm:col-span-2'
          : 'rounded-md border border-border bg-muted/20 px-3 py-2'
      }
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold">
        {value || '—'}
      </dd>
    </div>
  );
}

export default function DialogJobPostView({
  open,
  setOpen,
  record
}: DialogJobPostViewProps) {
  const title = record ? `View ${record.jobPostId}` : 'Job post details';

  const rows: DetailRow[] = record
    ? [
        { label: 'Job Post ID', value: record.jobPostId },
        {
          label: 'Status',
          value: JOB_POST_STATUS_LABELS[record.status]
        },
        { label: 'Job Title', value: record.jobTitle },
        {
          label: 'Linked Vacancy Request(s)',
          value: record.linkedVacancyRequestLabel || '—'
        },
        {
          label: 'Slug',
          value: record.slug || '—'
        },
        {
          label: 'Short Description',
          value: record.shortDescription || '—',
          fullWidth: true
        },
        { label: 'Department', value: record.department },
        { label: 'Designation', value: record.designation },
        {
          label: 'Employment Type',
          value: VACANCY_EMPLOYMENT_TYPE_LABELS[record.employmentType]
        },
        { label: 'Openings', value: String(record.openings) },
        {
          label: 'Posted Date',
          value: formatDateOnly(record.postedDate)
        },
        {
          label: 'Closing Date',
          value: formatDateOnly(record.closingDate)
        },
        {
          label: 'Applications',
          value: String(record.applicationsCount)
        },
        {
          label: 'Salary Information',
          value: record.salaryInformation || '—'
        },
        {
          label: 'Job Description',
          value: record.jobDescription || '—',
          fullWidth: true
        },
        {
          label: 'Responsibilities',
          value: record.responsibilities || '—',
          fullWidth: true
        },
        {
          label: 'Qualifications',
          value: record.qualifications || '—',
          fullWidth: true
        },
        {
          label: 'Experience',
          value: record.experience || '—',
          fullWidth: true
        },
        {
          label: 'Application Instructions',
          value: record.applicationInstructions || '—',
          fullWidth: true
        },
        {
          label: 'Created',
          value: record.createdBy
            ? `${record.createdBy} · ${formatDateTime(record.createdAt)}`
            : formatDateTime(record.createdAt)
        },
        {
          label: 'Updated',
          value: record.updatedBy
            ? `${record.updatedBy} · ${formatDateTime(record.updatedAt)}`
            : formatDateTime(record.updatedAt)
        }
      ]
    : [];

  return (
    <CustomDialog open={open} setOpen={setOpen} title={title}>
      <div className="space-y-4 py-4">
        {record ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <DetailCard key={row.label} {...row} />
              ))}
            </dl>

            {record.skills.length ? (
              <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Skills
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {record.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="border-0 bg-primary/10 text-primary hover:bg-primary/15"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No record selected.</p>
        )}
      </div>
    </CustomDialog>
  );
}
