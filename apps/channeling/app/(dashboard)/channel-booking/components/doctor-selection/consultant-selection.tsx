"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Doctor } from "@/types/doctor"

export type ConsultantSelectionProps = {
  value: string | null
  onChange: (doctor: Doctor | null) => void
  specialityId?: string | null
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ConsultantSelection({
  value,
  onChange,
  specialityId,
  placeholder = "Select consultant",
  className,
  disabled,
}: ConsultantSelectionProps) {
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState("")

  // Fetch doctors with search and speciality filter
  const fetchDoctors = useCallback(
    async (keyword: string = "") => {
      if (disabled) return

      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (keyword.trim()) {
          params.set("keyword", keyword.trim())
        }
        if (specialityId) {
          params.set("specialityId", specialityId)
        }
        // Fetch all doctors (no pagination for dropdown)
        params.set("page", "0")
        params.set("limit", "1000") // Large limit to get all

        const response = await fetch(`/api/doctor?${params.toString()}`)
        const result = await response.json()

        if (result.success && result.data) {
          setDoctors(result.data)
        } else {
          setDoctors([])
        }
      } catch (error) {
        console.error("Failed to fetch doctors:", error)
        setDoctors([])
      } finally {
        setLoading(false)
      }
    },
    [specialityId, disabled]
  )

  // Fetch when speciality changes or on mount
  useEffect(() => {
    fetchDoctors("")
  }, [fetchDoctors])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors(searchKeyword)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchKeyword, fetchDoctors])

  const selectedDoctor = doctors.find((d) => d.id === value)
  const displayName = selectedDoctor
    ? [selectedDoctor.title, selectedDoctor.name].filter(Boolean).join(" ")
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          {displayName}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search consultants..."
            value={searchKeyword}
            onValueChange={setSearchKeyword}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {loading ? "Loading..." : "No consultants found."}
            </CommandEmpty>
            <CommandGroup>
              {doctors.map((doctor) => {
                const doctorName = [doctor.title, doctor.name]
                  .filter(Boolean)
                  .join(" ")
                return (
                  <CommandItem
                    key={doctor.id}
                    value={doctorName}
                    onSelect={() => {
                      onChange(doctor.id === value ? null : doctor)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === doctor.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {doctorName}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
