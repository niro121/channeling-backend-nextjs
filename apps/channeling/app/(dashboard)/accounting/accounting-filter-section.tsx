"use client";

import { FilterWrapper } from "../filter-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_OPTIONS = [
  { value: "__all__", label: "All types" },
  { value: "CASH", label: "Cash" },
  { value: "PAYABLE", label: "Payable" },
  { value: "RECEIVABLE", label: "Receivable" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
];

interface AccountingFilterSectionProps {
  type?: string;
}

export function AccountingFilterSection({ type }: AccountingFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        type: type ?? "__all__",
      }}
      buttonLabel="Apply"
    >
      {({ values, setValue }) => (
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
      )}
    </FilterWrapper>
  );
}
