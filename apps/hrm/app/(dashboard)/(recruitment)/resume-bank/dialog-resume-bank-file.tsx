'use client';

import { useState } from 'react';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { Button, CustomDialog, useToast } from '@archmage/ui';
import { getS3DownloadUrlAction } from '@/app/actions/s3-actions/s3-storage.actions';
import { buttonStyles } from '@/lib/utils/common-styles';
import type { ResumeBankRecord } from '@/types/recruitment';

type DialogResumeBankFileProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: ResumeBankRecord | null;
};

function isImageName(fileName: string): boolean {
  return /\.(jpe?g|png|webp|gif|bmp)$/i.test(fileName);
}

function isPdfName(fileName: string): boolean {
  return /\.pdf$/i.test(fileName);
}

export default function DialogResumeBankFile({
  open,
  setOpen,
  record
}: DialogResumeBankFileProps) {
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
        description: 'No stored resume file key for this profile.'
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
                  {record.candidateName} · {record.email}
                </p>
                {!fileKey ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No file has been uploaded for this profile yet.
                  </p>
                ) : null}
              </div>
            </div>

            {previewUrl && isImageName(fileName) ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL
              <img
                src={previewUrl}
                alt={fileName}
                className="mx-auto max-h-[60vh] w-auto max-w-full rounded-md border border-border object-contain"
              />
            ) : null}

            {previewUrl && isPdfName(fileName) ? (
              <iframe
                title={fileName}
                src={previewUrl}
                className="h-[60vh] w-full rounded-md border border-border"
              />
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
                className={`${buttonStyles.cancel.healthy} gap-1.5`}
                disabled={!fileKey || loading}
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
                disabled={!fileKey || loading}
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
