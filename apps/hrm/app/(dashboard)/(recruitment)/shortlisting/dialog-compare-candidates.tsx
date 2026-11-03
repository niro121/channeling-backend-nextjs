'use client';

import { Button, CustomDialog } from '@archmage/ui';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  APPLICATION_STAGE_LABELS,
  type ShortlistingRecord
} from '@/types/recruitment';

type DialogCompareCandidatesProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  records: ShortlistingRecord[];
};

type CompareRow = {
  label: string;
  values: string[];
};

export default function DialogCompareCandidates({
  open,
  setOpen,
  records
}: DialogCompareCandidatesProps) {
  const rows: CompareRow[] = [
    {
      label: 'Position',
      values: records.map((r) => r.jobTitle)
    },
    {
      label: 'Qualifications',
      values: records.map((r) => r.qualifications)
    },
    {
      label: 'Experience',
      values: records.map((r) => `${r.experienceYears} yrs`)
    },
    {
      label: 'Skills',
      values: records.map((r) => r.skills.join(', ') || '—')
    },
    {
      label: 'Screening Score',
      values: records.map((r) => String(r.screeningScore))
    },
    {
      label: 'Stage',
      values: records.map((r) => APPLICATION_STAGE_LABELS[r.currentStage])
    }
  ];

  return (
    <CustomDialog open={open} setOpen={setOpen} title="Compare Candidates">
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Side-by-side comparison of selected candidates
        </p>

        {records.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Select at least two candidates to compare.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Criteria
                  </th>
                  {records.map((record) => (
                    <th
                      key={record.id}
                      className="min-w-[10rem] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground"
                    >
                      {record.candidateName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="sticky left-0 z-10 bg-card px-3 py-2.5 font-medium text-muted-foreground">
                      {row.label}
                    </td>
                    {row.values.map((value, index) => (
                      <td
                        key={`${row.label}-${records[index]?.id ?? index}`}
                        className="px-3 py-2.5 text-foreground"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            className={buttonStyles.cancel.healthy}
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </div>
      </div>
    </CustomDialog>
  );
}
