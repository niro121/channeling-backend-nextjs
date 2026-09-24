import type { ReactNode } from 'react';
import { BackButton } from '@archmage/ui';

type CommonManagerHeaderProps = {
  title: string;
  description: string;
  backwordButton?: boolean;
  /** Optional actions rendered on the right (e.g. Filter, Apply Leave). */
  actions?: ReactNode;
};

export function CommonManagerHeader({
  title,
  description,
  backwordButton,
  actions
}: CommonManagerHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-base text-gray-500">{description}</p>
      </div>

      {(backwordButton || actions) && (
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {actions}
          {backwordButton ? <BackButton /> : null}
        </div>
      )}
    </div>
  );
}
