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

const ALL_VALUE = "__all__";

const PAYMENT_METHOD_OPTIONS = [
  { value: ALL_VALUE, label: "All Payment Methods" },
  { value: String(RECEIPT_PAYMENT_METHOD.CASH), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.CASH] },
  { value: String(RECEIPT_PAYMENT_METHOD.CREDIT_CARD), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.CREDIT_CARD] },
  { value: String(RECEIPT_PAYMENT_METHOD.SLIP), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.SLIP] },
  { value: String(RECEIPT_PAYMENT_METHOD.CHECK), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.CHECK] },
  { value: String(RECEIPT_PAYMENT_METHOD.AGENT), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.AGENT] },
  { value: String(RECEIPT_PAYMENT_METHOD.CREDIT), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.CREDIT] },
  { value: String(RECEIPT_PAYMENT_METHOD.E_WALLET), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.E_WALLET] },
];

function doctorsForSpeciality(
  doctors: ReferenceSelectOption[],
  specialityId: string | undefined
): ReferenceSelectOption[] {
  if (!specialityId || specialityId === ALL_VALUE) return doctors;
  return doctors.filter((d) => d.specialityId === specialityId);
}

interface DoctorPaymentFilterSectionProps {
  locationId?: string;
  paymentMethod?: string;
  specialityId?: string;
  doctorId?: string;
  dateFrom?: string;
  dateTo?: string;
  locations: ReferenceSelectOption[];
  specialities: ReferenceSelectOption[];
  doctors: ReferenceSelectOption[];
}

export default function DoctorPaymentFilterSection({
  locationId,
  paymentMethod,
  specialityId,
  doctorId,
  dateFrom,
  dateTo,
  locations,
  specialities,
  doctors,
}: DoctorPaymentFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        locationId: locationId ?? ALL_VALUE,
        paymentMethod: paymentMethod ?? ALL_VALUE,
        specialityId: specialityId ?? ALL_VALUE,
        doctorId: doctorId ?? ALL_VALUE,
        dateFrom: dateFrom ?? "",
        dateTo: dateTo ?? "",
      }}
    >
      {({ values, setValue }) => {
        const filteredDoctors = doctorsForSpeciality(doctors, values.specialityId);
        return (
          <>
            <ReferenceSelect
              options={locations}
              value={values.locationId ?? ALL_VALUE}
              onChange={(v) => setValue("locationId", v)}
              placeholder="Location"
              label="Location"
              allOptionValue={ALL_VALUE}
              allOptionLabel="All locations"
              className="w-[180px]"
            />
            <Select
              value={values.paymentMethod ?? ALL_VALUE}
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
              options={specialities}
              value={values.specialityId ?? ALL_VALUE}
              onChange={(v) => {
                const next = v || ALL_VALUE;
                setValue("specialityId", next);
                const nextDoctors = doctorsForSpeciality(doctors, next);
                if (
                  values.doctorId &&
                  values.doctorId !== ALL_VALUE &&
                  !nextDoctors.some((d) => d.id === values.doctorId)
                ) {
                  setValue("doctorId", ALL_VALUE);
                }
              }}
              placeholder="Speciality"
              label="Speciality"
              allOptionValue={ALL_VALUE}
              allOptionLabel="All specialities"
              className="w-[200px]"
            />
            <ReferenceSelect
              options={filteredDoctors}
              value={values.doctorId ?? ALL_VALUE}
              onChange={(v) => setValue("doctorId", v)}
              placeholder="Doctor"
              label="Doctor"
              allOptionValue={ALL_VALUE}
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
        );
      }}
    </FilterWrapper>
  );
}
