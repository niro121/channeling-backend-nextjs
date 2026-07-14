'use client';

import { Button } from '@archmage/ui';
import { SaveIcon, XIcon } from 'lucide-react';

type CustomFormSubmitBtnsProps = {
  loading?: boolean;
  onCancel?: () => void;
  onSave?: () => void;
  onSaveAndClose?: () => void;
  showSave?: boolean;
};

export function CustomFormSubmitBtns({
  loading = false,
  onCancel,
  onSave,
  onSaveAndClose,
  showSave = true
}: CustomFormSubmitBtnsProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-red-500 hover:text-white hover:bg-red-500 transition-colors"
        onClick={onCancel}
        disabled={loading}
      >
        <div className="flex items-center gap-2">
          <XIcon className="w-4 h-4" />
          Cancel
        </div>
      </Button>
      {showSave ? (
        <>
          <Button type="button" variant="default" onClick={onSave} disabled={loading}>
            <div className="flex items-center gap-2">
              <SaveIcon className="w-4 h-4" />
              Save
            </div>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveAndClose}
            disabled={loading}
          >
            <div className="flex items-center gap-2">
              <SaveIcon className="w-4 h-4" />
              Save and Close
            </div>
          </Button>
        </>
      ) : null}
    </>
  );
}
