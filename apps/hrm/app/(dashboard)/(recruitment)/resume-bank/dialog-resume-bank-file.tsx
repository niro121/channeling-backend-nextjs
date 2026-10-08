'use client';

import { Download, FileText } from 'lucide-react';
import { Button, CustomDialog, useToast } from '@archmage/ui';
import { buttonStyles } from '@/lib/utils/common-styles';
import type { ResumeBankRecord } from '@/types/recruitment';

type DialogResumeBankFileProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: ResumeBankRecord | null;
};

export default function DialogResumeBankFile({
  open,
  setOpen,
  record
}: DialogResumeBankFileProps) {
  const { toast } = useToast();
  const title = record
    ? `Resume · ${record.candidateName}`
    : 'Resume';

  return (
    <CustomDialog open={open} setOpen={setOpen} title={title}>
      <div className="space-y-4 py-4">
        {record ? (
          <>
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/20 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{record.resumeFileName}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {record.candidateName} · {record.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Preview is not available in this UI phase. Use download when
                  documents are wired.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className={buttonStyles.cancel.healthy}
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                className={`${buttonStyles.save} gap-1.5`}
                onClick={() =>
                  toast({
                    title: 'Download',
                    description: `Download for ${record.resumeFileName} will be wired when document storage is available.`
                  })
                }
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No resume selected.</p>
        )}
      </div>
    </CustomDialog>
  );
}
