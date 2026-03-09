"use client";

import { FilterWrapper } from "../filter-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReferenceSelect } from "@/components/common/reference-select";
import { getReceiptMethodLabel } from "@/services/receipt-manager/receipt-method-labels";
import type { ReferenceSelectOption } from "@/types/reference";

const RECEIPT_METHOD_OPTIONS = [
  { value: "__all__", label: "All methods" },
  { value: "0", label: getReceiptMethodLabel(0) },
  { value: "1", label: getReceiptMethodLabel(1) },
  { value: "2", label: getReceiptMethodLabel(2) },
  { value: "3", label: getReceiptMethodLabel(3) },
  { value: "4", label: getReceiptMethodLabel(4) },
  { value: "5", label: getReceiptMethodLabel(5) },
  { value: "6", label: getReceiptMethodLabel(6) },
  { value: "7", label: getReceiptMethodLabel(7) },
  { value: "8", label: getReceiptMethodLabel(8) },
  { value: "9", label: getReceiptMethodLabel(9) },
];

interface ReceiptManagerFilterSectionProps {
  method?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  locations: ReferenceSelectOption[];
}

export default function ReceiptManagerFilterSection({
  method,
  locationId,
  dateFrom,
  dateTo,
  locations,
}: ReceiptManagerFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        method: method ?? "__all__",
        locationId: locationId ?? "__all__",
        dateFrom: dateFrom ?? "",
        dateTo: dateTo ?? "",
      }}
    >
      {({ values, setValue }) => (
        <>
          <Select
            value={values.method ?? "__all__"}
            onValueChange={(v) => setValue("method", v)}
          >
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Receipt method" />
            </SelectTrigger>
            <SelectContent>
              {RECEIPT_METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ReferenceSelect
            options={locations}
            value={values.locationId ?? "__all__"}
            onChange={(v) => setValue("locationId", v)}
            placeholder="Location"
            label="Location"
            allOptionValue="__all__"
            allOptionLabel="All locations"
            className="w-[180px]"
          />
          <input
            type="date"
            value={values.dateFrom ?? ""}
            onChange={(e) => setValue("dateFrom", e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="From"
          />
          <input
            type="date"
            value={values.dateTo ?? ""}
            onChange={(e) => setValue("dateTo", e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="To"
          />
        </>
      )}
    </FilterWrapper>
  );
}
