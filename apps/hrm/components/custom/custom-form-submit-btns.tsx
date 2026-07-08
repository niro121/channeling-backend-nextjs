import { Button } from '@archmage/ui';
import { SaveIcon, XIcon } from 'lucide-react';

export function CustomFormSubmitBtns() {
  return (
    <>
      <Button
        variant="outline"
        className="text-red-500 hover:text-white hover:bg-red-500 transition-colors"
      >
        <div className="flex items-center gap-2">
          <XIcon className="w-4 h-4" />
          Cancel
        </div>
      </Button>
      <Button variant="default">
        <div className="flex items-center gap-2">
          <SaveIcon className="w-4 h-4" />
          Save
        </div>
      </Button>
      <Button variant="outline">
        <div className="flex items-center gap-2">
          <SaveIcon className="w-4 h-4" />
          Save and Close
        </div>
      </Button>
    </>
  );
}
