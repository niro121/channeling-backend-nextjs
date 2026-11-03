'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent
} from 'react';
import {
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Upload
} from 'lucide-react';
import {
  Button,
  CustomDialog,
  Label,
  cn,
  useToast
} from '@archmage/ui';
import { getS3DownloadUrlAction } from '@/app/actions/s3-actions/s3-storage.actions';
import { buttonStyles } from '@/lib/utils/common-styles';

const DEFAULT_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif';
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

export type CustomFileUploadValue = {
  /** Existing S3 object key (already stored). */
  fileKey: string | null;
  /** Display name for the current / pending file. */
  fileName: string;
  /**
   * Local file selected in the UI — not uploaded until form save.
   * Pass through `commitPendingUpload` in your submit handler.
   */
  pendingFile: File | null;
};

export type CustomFileUploadStyleClasses = {
  parentDiv?: string;
  labelClassName?: string;
  inputClassName?: string;
};

export type CustomFileUploadProps = {
  id?: string;
  label?: string;
  accept?: string;
  fileKey?: string | null;
  fileName?: string;
  pendingFile?: File | null;
  onChange: (next: CustomFileUploadValue) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  maxBytes?: number;
  /** Opens viewer dialog for image / PDF preview. */
  enablePreview?: boolean;
  styleClasses?: CustomFileUploadStyleClasses;
  className?: string;
};

function isImageFile(fileName: string, mime?: string | null): boolean {
  if (mime?.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(fileName);
}

function isPdfFile(fileName: string, mime?: string | null): boolean {
  if (mime === 'application/pdf') return true;
  return /\.pdf$/i.test(fileName);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Reusable file / image picker with preview.
 * Holds the selected `File` locally; upload to S3 on form save via
 * `commitPendingUpload` from `@/lib/helpers/s3`.
 */
export function CustomFileUpload({
  id,
  label = 'Attachment',
  accept = DEFAULT_ACCEPT,
  fileKey = null,
  fileName = '',
  pendingFile = null,
  onChange,
  required = false,
  disabled = false,
  error,
  hint,
  maxBytes = DEFAULT_MAX_BYTES,
  enablePreview = true,
  styleClasses,
  className
}: CustomFileUploadProps) {
  const generatedId = useId();
  const inputId = id || `file-upload-${generatedId}`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);

  const displayName = pendingFile?.name || fileName || '';
  const hasFile = Boolean(pendingFile || fileKey || displayName);
  const mime = pendingFile?.type || null;
  const showAsImage = displayName
    ? isImageFile(displayName, mime)
    : false;
  const showAsPdf = displayName ? isPdfFile(displayName, mime) : false;

  useEffect(() => {
    if (!pendingFile) {
      setLocalObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setLocalObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const emit = (next: CustomFileUploadValue) => onChange(next);

  const handlePickClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `Choose a file of ${mb} MB or smaller.`
      });
      return;
    }

    emit({
      fileKey: null,
      fileName: file.name,
      pendingFile: file
    });
  };

  const handleClear = () => {
    if (disabled) return;
    emit({ fileKey: null, fileName: '', pendingFile: null });
    setPreviewOpen(false);
    setPreviewUrl(null);
  };

  const handleView = async () => {
    if (!enablePreview || !hasFile) return;

    if (pendingFile && localObjectUrl) {
      setPreviewUrl(localObjectUrl);
      setPreviewOpen(true);
      return;
    }

    if (!fileKey) {
      toast({
        variant: 'destructive',
        title: 'Preview unavailable',
        description: 'This file is not stored yet.'
      });
      return;
    }

    setPreviewLoading(true);
    try {
      const result = await getS3DownloadUrlAction(fileKey);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Preview failed',
          description: result.error
        });
        return;
      }
      setPreviewUrl(result.url);
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const thumbSrc = pendingFile && showAsImage ? localObjectUrl : null;

  return (
    <div
      className={cn(
        styleClasses?.parentDiv ?? 'grid grid-cols-1 gap-1.5 items-start',
        className
      )}
    >
      <Label
        htmlFor={inputId}
        className={
          styleClasses?.labelClassName ??
          'text-sm font-semibold text-foreground'
        }
      >
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>

      <div className={cn('flex flex-col gap-2', styleClasses?.inputClassName)}>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={handleFileChange}
        />

        {!hasFile ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 w-fit gap-2 border-dashed"
            disabled={disabled}
            onClick={handlePickClick}
          >
            <Upload className="h-4 w-4" />
            Choose file
          </Button>
        ) : (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-start gap-3">
              {thumbSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                <img
                  src={thumbSrc}
                  alt={displayName}
                  className="h-14 w-14 shrink-0 rounded-md border border-border object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
                  {showAsImage ? (
                    <ImageIcon className="h-6 w-6" />
                  ) : (
                    <FileText className="h-6 w-6" />
                  )}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pendingFile
                    ? `Ready to upload · ${formatBytes(pendingFile.size)}`
                    : fileKey
                      ? 'Stored in document storage'
                      : 'Selected'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {enablePreview ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${buttonStyles.cancel.healthy} gap-1.5`}
                  disabled={disabled || previewLoading}
                  onClick={() => void handleView()}
                >
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  View
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                disabled={disabled}
                onClick={handlePickClick}
              >
                <Upload className="h-4 w-4" />
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${buttonStyles.delete.warning} gap-1.5`}
                disabled={disabled}
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        )}

        {hint && !error ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <CustomDialog
        open={previewOpen}
        setOpen={setPreviewOpen}
        title={displayName || 'Preview'}
      >
        <div className="space-y-4 py-4">
          {previewUrl && showAsImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed / blob URL
            <img
              src={previewUrl}
              alt={displayName}
              className="mx-auto max-h-[70vh] w-auto max-w-full rounded-md border border-border object-contain"
            />
          ) : null}

          {previewUrl && showAsPdf ? (
            <iframe
              title={displayName}
              src={previewUrl}
              className="h-[70vh] w-full rounded-md border border-border"
            />
          ) : null}

          {previewUrl && !showAsImage && !showAsPdf ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Inline preview is not available for this file type.</p>
              <Button asChild variant="outline" size="sm">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  Open in new tab
                </a>
              </Button>
            </div>
          ) : null}

          <div className="flex justify-end border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              className={buttonStyles.cancel.healthy}
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </CustomDialog>
    </div>
  );
}
