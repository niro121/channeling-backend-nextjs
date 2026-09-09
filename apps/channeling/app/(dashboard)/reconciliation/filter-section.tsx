"use client"

import { DateRangePicker } from "@/components/common/date-range-picker"
import { FilterWrapper } from "../filter-wrapper"
import { Combobox } from "@/components/common/combobox"

export type ReconciliationUserOption = { id: string; name: string }

interface ReconciliationFilterSectionProps {
  userOptions: ReconciliationUserOption[]
  dateFrom?: string
  dateTo?: string
  fromUserId?: string
  toUserId?: string
}

export default function ReconciliationFilterSection({
  userOptions,
  dateFrom,
  dateTo,
  fromUserId,
  toUserId,
}: ReconciliationFilterSectionProps) {
  const fromOptions = [
    { id: "__all__", name: "All handed over by" },
    ...userOptions.map((u) => ({ id: u.id, name: u.name })),
  ]
  const toOptions = [
    { id: "__all__", name: "All handed over to" },
    ...userOptions.map((u) => ({ id: u.id, name: u.name })),
  ]
  return (
    <FilterWrapper
      initialValues={{
        dateFrom: dateFrom ?? "",
        dateTo: dateTo ?? "",
        fromUserId: fromUserId ?? "__all__",
        toUserId: toUserId ?? "__all__",
      }}
      buttonLabel="Apply"
    >
      {({ values, setValue }) => (
        <>
          <DateRangePicker
            from={values.dateFrom}
            to={values.dateTo}
            onChange={({ from, to }) => {
              setValue("dateFrom", from)
              setValue("dateTo", to)
            }}
          />
          <Combobox
            label="Handed over by"
            options={fromOptions}
            value={values.fromUserId ?? "__all__"}
            defaultValue="__all__"
            onChange={(v) => setValue("fromUserId", v)}
          />
          <Combobox
            label="Handed over to"
            options={toOptions}
            value={values.toUserId ?? "__all__"}
            defaultValue="__all__"
            onChange={(v) => setValue("toUserId", v)}
          />
        </>
      )}
    </FilterWrapper>
  )
}
