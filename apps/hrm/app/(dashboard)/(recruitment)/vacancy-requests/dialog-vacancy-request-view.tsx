'use client';

import { Badge, CustomDialog } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_PRIORITY_LABELS,
  VACANCY_REQUEST_STATUS_LABELS,
  type VacancyRequestRecord
} from '@/types/recruitment';

type DialogVacancyRequestViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: VacancyRequestRecord | null;
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

export default function DialogVacancyRequestView({
  open,
  setOpen,
  record
}: DialogVacancyRequestViewProps) {
  const title = record
    ? `View ${record.requestId}`
    : 'Vacancy request details';

  const rows: DetailRow[] = record
    ? [
        { label: 'Request ID', value: record.requestId },
        {
          label: 'Status',
          value: VACANCY_REQUEST_STATUS_LABELS[record.status]
        },
        { label: 'Department', value: record.department },
        { label: 'Designation', value: record.designation },
        { label: 'Vacancies', value: String(record.vacancies) },
        {
          label: 'Employment Type',
          value: VACANCY_EMPLOYMENT_TYPE_LABELS[record.employmentType]
        },
        { label: 'Requested By', value: record.requestedBy },
        {
          label: 'Priority',
          value: VACANCY_PRIORITY_LABELS[record.priority]
        },
        {
          label: 'Requested Date',
          value: formatDateOnly(record.requestedDate)
        },
        {
          label: 'Required Date',
          value: formatDateOnly(record.requiredDate)
        },
        {
          label: 'Required Experience',
          value: record.requiredExperience || '—'
        },
        {
          label: 'Salary Range',
          value: record.salaryRange || '—'
        },
        {
          label: 'Required Qualifications',
          value: record.requiredQualifications || '—',
          fullWidth: true
        },
        {
          label: 'Job Description',
          value: record.jobDescription || '—',
          fullWidth: true
        },
        {
          label: 'Justification',
          value: record.justification || '—',
          fullWidth: true
        },
        {
          label: 'Remarks',
          value: record.remarks || '—',
          fullWidth: true
        },
        {
          label: 'Linked Job Post',
          value: record.linkedJobPost ? 'Yes' : 'No'
        },
        {
          label: 'Reject Reason',
          value: record.rejectReason || '—'
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
