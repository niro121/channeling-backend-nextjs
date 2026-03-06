"use client"

import { FilterWrapper } from "../filter-wrapper"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReferenceSelect } from "@/components/common/reference-select"
import { RECEIPT_METHOD, RECEIPT_METHOD_NAMES } from "@/types/receipt"
import type { ReferenceSelectOption } from "@/types/reference"

const METHOD_OPTIONS = [
  { value: "__all__", label: "All types" },
  { value: String(RECEIPT_METHOD.DEBIT_NOTE), label: RECEIPT_METHOD_NAMES[RECEIPT_METHOD.DEBIT_NOTE] },
  { value: String(RECEIPT_METHOD.CREDIT_NOTE), label: RECEIPT_METHOD_NAMES[RECEIPT_METHOD.CREDIT_NOTE] },
  { value: String(RECEIPT_METHOD.AGENCY_DEPOSIT), label: RECEIPT_METHOD_NAMES[RECEIPT_METHOD.AGENCY_DEPOSIT] },
  { value: String(RECEIPT_METHOD.AGENCY_WITHDRAW), label: RECEIPT_METHOD_NAMES[RECEIPT_METHOD.AGENCY_WITHDRAW] },
  { value: String(RECEIPT_METHOD.BRANCH_INCOME), label: RECEIPT_METHOD_NAMES[RECEIPT_METHOD.BRANCH_INCOME] },
  { value: String(RECEIPT_METHOD.BRANCH_EXPENSE), label: RECEIPT_METHOD_NAMES[RECEIPT_METHOD.BRANCH_EXPENSE] },
]

interface LedgerFilterSectionProps {
  branchId?: string
  agencyId?: string
  method?: string
  locations: ReferenceSelectOption[]
  agencies: ReferenceSelectOption[]
}

export default function LedgerFilterSection({
  branchId,
  agencyId,
  method,
  locations,
  agencies,
}: LedgerFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        branchId: branchId ?? "__all__",
        agencyId: agencyId ?? "__all__",
        method: method ?? "__all__",
      }}
    >
      {({ values, setValue }) => (
        <>
          <ReferenceSelect
            options={locations}
            value={values.branchId ?? "__all__"}
            onChange={(v) => setValue("branchId", v)}
            placeholder="Branch"
            label="Branch"
            allOptionValue="__all__"
            allOptionLabel="All branches"
            className="w-[180px]"
          />
          <ReferenceSelect
            options={agencies}
            value={values.agencyId ?? "__all__"}
            onChange={(v) => setValue("agencyId", v)}
            placeholder="Agency"
            label="Agency"
            allOptionValue="__all__"
            allOptionLabel="All agencies"
            className="w-[200px]"
          />
          <Select
            value={values.method ?? "__all__"}
            onValueChange={(v) => setValue("method", v)}
          >
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </FilterWrapper>
  )
}
