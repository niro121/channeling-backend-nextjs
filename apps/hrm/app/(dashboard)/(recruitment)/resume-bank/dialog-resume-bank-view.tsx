'use client';

import { Badge, CustomDialog } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  APPLICATION_SOURCE_LABELS,
  RESUME_BANK_STATUS_LABELS,
  type ResumeBankRecord
} from '@/types/recruitment';

type DialogResumeBankViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: ResumeBankRecord | null;
};

type DetailRow = {
  label: string;
  value: string;
  fullWidth?: boolean;
};

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

export default function DialogResumeBankView({
  open,
  setOpen,
  record
}: DialogResumeBankViewProps) {
  const title = record
    ? `View ${record.candidateName}`
    : 'Candidate profile';

  const rows: DetailRow[] = record
    ? [
        { label: 'Profile ID', value: record.profileId },
        {
          label: 'Status',
          value: RESUME_BANK_STATUS_LABELS[record.status]
        },
        { label: 'Candidate Name', value: record.candidateName },
        { label: 'Email', value: record.email },
        { label: 'Phone', value: record.phone },
        { label: 'Qualifications', value: record.qualifications },
        {
          label: 'Experience',
          value: `${record.experienceYears} yrs`
        },
        {
          label: 'Preferred Position',
          value: record.preferredPosition
        },
        {
          label: 'Preferred Department',
          value: record.preferredDepartment
        },
        { label: 'Location', value: record.location },
        {
          label: 'Source',
          value: APPLICATION_SOURCE_LABELS[record.source]
        },
        {
          label: 'Date Added',
          value: formatDateTime(record.dateAdded, 'dd MMM yyyy')
        },
        {
          label: 'Resume/CV',
          value: record.resumeFileName
        },
        {
          label: 'Notes',
          value: record.notes || '—',
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
