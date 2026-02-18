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
};

export function CustomContentAlertDialog({
  open,
  title,
  description,
  handleVisibilityChange,
  handleContinue,
  loading,
  children
}: CustomContentAlertDialogProps) {
  return (
    <AlertDialog open={open}>
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
          <AlertDialogAction onClick={handleContinue} disabled={loading} className="cursor-pointer">
            Continue {loading && <Spinner />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
