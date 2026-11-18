"use client";

import { FilterWrapper } from "../filter-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/common/combobox";

const TYPE_OPTIONS = [
  { value: "__all__", label: "All types" },
  { value: "CASH", label: "Cash" },
  { value: "PAYABLE", label: "Payable" },
  { value: "RECEIVABLE", label: "Receivable" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
];

export type AccountingUserOption = { id: string; name: string };

interface AccountingFilterSectionProps {
  type?: string;
  userId?: string;
  userOptions: AccountingUserOption[];
}

export function AccountingFilterSection({
  type,
  userId,
  userOptions,
}: AccountingFilterSectionProps) {
  const linkedUserOptions = [
    { id: "__all__", name: "All users" },
    { id: "__none__", name: "Unlinked" },
    ...userOptions.map((u) => ({ id: u.id, name: u.name })),
  ];

  return (
    <FilterWrapper
      initialValues={{
        type: type ?? "__all__",
        userId: userId ?? "__all__",
      }}
      buttonLabel="Apply"
    >
      {({ values, setValue }) => (
        <>
          <Select
            value={values.type ?? "__all__"}
            onValueChange={(v) => setValue("type", v)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Combobox
            label="Linked user"
            options={linkedUserOptions}
            value={values.userId ?? "__all__"}
            defaultValue="__all__"
            onChange={(v) => setValue("userId", v)}
            triggerClassName="h-9 w-[220px]"
          />
        </>
      )}
    </FilterWrapper>
  );
}
