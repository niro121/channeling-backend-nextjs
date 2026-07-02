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
import { PAYMENT_METHOD_NAMES, RECEIPT_PAYMENT_METHOD } from "@/types/receipt";
import type { ReferenceSelectOption } from "@/types/reference";

const PAYMENT_METHOD_OPTIONS = [
  { value: "__all__", label: "All Payment Methods" },
  { value: String(RECEIPT_PAYMENT_METHOD.CASH), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.CASH] },
  { value: String(RECEIPT_PAYMENT_METHOD.CREDIT_CARD), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.CREDIT_CARD] },
  { value: String(RECEIPT_PAYMENT_METHOD.SLIP), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.SLIP] },
  { value: String(RECEIPT_PAYMENT_METHOD.CHECK), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.CHECK] },
  { value: String(RECEIPT_PAYMENT_METHOD.AGENT), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.AGENT] },
  { value: String(RECEIPT_PAYMENT_METHOD.CREDIT), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.CREDIT] },
  { value: String(RECEIPT_PAYMENT_METHOD.E_WALLET), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.E_WALLET] },
];

interface DoctorPaymentFilterSectionProps {
  locationId?: string;
  paymentMethod?: string;
  doctorId?: string;
  dateFrom?: string;
  dateTo?: string;
  locations: ReferenceSelectOption[];
  doctors: ReferenceSelectOption[];
}

export default function DoctorPaymentFilterSection({
  locationId,
  paymentMethod,
  doctorId,
  dateFrom,
  dateTo,
  locations,
  doctors,
}: DoctorPaymentFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        locationId: locationId ?? "__all__",
        paymentMethod: paymentMethod ?? "__all__",
        doctorId: doctorId ?? "__all__",
        dateFrom: dateFrom ?? "",
        dateTo: dateTo ?? "",
      }}
    >
      {({ values, setValue }) => (
        <>
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
          <Select
            value={values.paymentMethod ?? "__all__"}
            onValueChange={(v) => setValue("paymentMethod", v)}
          >
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Payment method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ReferenceSelect
            options={doctors}
            value={values.doctorId ?? "__all__"}
            onChange={(v) => setValue("doctorId", v)}
            placeholder="Doctor"
            label="Doctor"
            allOptionValue="__all__"
            allOptionLabel="All doctors"
            className="w-[200px]"
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
