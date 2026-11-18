import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '../icons';

type CustomContentAlertDialogProps = {
  open: boolean;
  title: string;
  description: string;
  handleVisibilityChange: (value: boolean) => void;
  handleContinue: () => void;
  loading: boolean;
  children?: React.ReactNode;
  continueLabel?: string;
};

export function CustomContentAlertDialog({
  open,
  title,
  description,
  handleVisibilityChange,
  handleContinue,
  loading,
  children,
  continueLabel = 'Continue'
}: CustomContentAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={handleVisibilityChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div>{children}</div>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => handleVisibilityChange(false)}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={(event) => {
              // AlertDialogAction closes the dialog unless the click is cancelled.
              // Callers close it themselves after async work succeeds.
              event.preventDefault();
              handleContinue();
            }}
            disabled={loading}
            className="cursor-pointer"
          >
            {continueLabel} {loading && <Spinner />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
