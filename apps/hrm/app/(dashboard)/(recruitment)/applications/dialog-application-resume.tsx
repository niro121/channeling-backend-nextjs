'use client';

import { useState } from 'react';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { Button, CustomDialog, useToast } from '@archmage/ui';
import { getS3DownloadUrlAction } from '@/app/actions/s3-actions/s3-storage.actions';
import { buttonStyles } from '@/lib/utils/common-styles';
import type { ApplicationRecord } from '@/types/recruitment';

type DialogApplicationResumeProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: ApplicationRecord | null;
};

function isImageName(fileName: string): boolean {
  return /\.(jpe?g|png|webp|gif|bmp)$/i.test(fileName);
}

function isPdfName(fileName: string): boolean {
  return /\.pdf$/i.test(fileName);
}

export default function DialogApplicationResume({
  open,
  setOpen,
  record
}: DialogApplicationResumeProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const title = record ? `Resume · ${record.candidateName}` : 'Resume';
  const fileName = record?.resumeFileName || 'Resume';
  const fileKey = record?.resumeFileKey?.trim() || null;

  const resolveUrl = async (): Promise<string | null> => {
    if (!fileKey) {
      toast({
        variant: 'destructive',
        title: 'File unavailable',
        description: 'No stored resume file key for this application.'
      });
      return null;
    }

    setLoading(true);
    try {
      const result = await getS3DownloadUrlAction(fileKey);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Could not open file',
          description: result.error
        });
        return null;
      }
      return result.url;
    } finally {
      setLoading(false);
    }
  };

  const handleView = async () => {
    const url = await resolveUrl();
    if (url) setPreviewUrl(url);
  };

  const handleDownload = async () => {
    const url = await resolveUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setPreviewUrl(null);
    setOpen(next);
  };

  return (
    <CustomDialog open={open} setOpen={handleOpenChange} title={title}>
      <div className="space-y-4 py-4">
        {record ? (
          <>
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/20 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{fileName}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {record.candidateName} · {record.applicationId}
                </p>
              </div>
            </div>

            {previewUrl ? (
              <div className="overflow-hidden rounded-md border border-border">
                {isPdfName(fileName) ? (
                  <iframe
                    title={fileName}
                    src={previewUrl}
                    className="h-[420px] w-full bg-background"
                  />
                ) : isImageName(fileName) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={fileName}
                    className="max-h-[420px] w-full object-contain bg-muted/20"
                  />
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    Preview is not available for this file type. Use download.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className={buttonStyles.cancel.healthy}
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                disabled={loading || !fileKey}
                onClick={() => void handleView()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                View
              </Button>
              <Button
                type="button"
                className={`${buttonStyles.save} gap-1.5`}
                disabled={loading || !fileKey}
                onClick={() => void handleDownload()}
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
