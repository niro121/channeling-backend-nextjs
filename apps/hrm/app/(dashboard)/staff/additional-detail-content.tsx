'use client';

import { format } from 'date-fns';
import { Input, Label } from '@archmage/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import type { StaffWithAuthUsers } from '@/types/staff';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full bg-muted/40'
};

function formatAuditDateTime(date?: Date | string | null) {
  if (!date) return '—';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return format(parsed, 'MMMM do yyyy, h.mm a');
}

type ReadOnlyFieldProps = {
  id: string;
  label: string;
  value: string;
};

function ReadOnlyField({ id, label, value }: ReadOnlyFieldProps) {
  return (
    <div className={fieldStyleClasses.parentDiv}>
      <Label htmlFor={id} className={fieldStyleClasses.labelClassName}>
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        value={value}
        readOnly
        disabled
        className={`p-2 border rounded focus-visible:ring-offset-0! ${fieldStyleClasses.inputClassName}`}
      />
    </div>
  );
}

type AdditionalDetailContentProps = {
  staff: StaffWithAuthUsers;
};

export default function AdditionalDetailContent({
  staff
}: AdditionalDetailContentProps) {
  const createdByEmail = staff.createdUser?.email ?? '—';
  const updatedByEmail = staff.updatedUser?.email ?? '—';

  return (
    <Accordion
      multiple
      defaultValue={['audit-information']}
      className="space-y-4"
    >
      <AccordionItem value="audit-information" className="rounded-lg border px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="space-y-1 text-left">
            <p className="text-xl font-semibold">Audit Information</p>
            <p className="text-sm font-normal text-muted-foreground">
              Read-only system tracking populated from the database.
            </p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="border-t-2 pt-2">
          <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
            <ReadOnlyField
              id="auditStaffId"
              label="Staff ID"
              value={`Code: ${staff.code || '—'} - ID: ${staff.id}`}
            />
            <ReadOnlyField
              id="auditCreatedBy"
              label="Created By"
              value={createdByEmail}
            />
            <ReadOnlyField
              id="auditCreatedAt"
              label="Created Date & Time"
              value={formatAuditDateTime(staff.createdAt)}
            />
            <ReadOnlyField
              id="auditUpdatedBy"
              label="Last Updated By"
              value={updatedByEmail}
            />
            <ReadOnlyField
              id="auditUpdatedAt"
              label="Last Updated Date & Time"
              value={formatAuditDateTime(staff.updatedAt)}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
