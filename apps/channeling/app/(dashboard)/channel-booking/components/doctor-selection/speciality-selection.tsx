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

type SpecialityOption = {
  id: string
  name: string
}

export type SpecialitySelectionProps = {
  value: string | null
  onChange: (specialityId: string | null) => void
  placeholder?: string
  className?: string
}

export function SpecialitySelection({
  value,
  onChange,
  placeholder = "Select speciality",
  className,
}: SpecialitySelectionProps) {
  const [open, setOpen] = useState(false)
  const [specialities, setSpecialities] = useState<SpecialityOption[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState("")

  // Fetch specialities with search
  const fetchSpecialities = useCallback(async (keyword: string = "") => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (keyword.trim()) {
        params.set("keyword", keyword.trim())
      }
      // Fetch all specialities (no pagination for dropdown)
      params.set("page", "0")
      params.set("limit", "1000") // Large limit to get all

      const response = await fetch(`/api/speciality?${params.toString()}`)
      const result = await response.json()

      if (result.success && result.data) {
        const options: SpecialityOption[] = result.data.map((item: any) => ({
          id: item.id,
          name: item.name,
        }))
        setSpecialities(options)
      } else {
        setSpecialities([])
      }
    } catch (error) {
      console.error("Failed to fetch specialities:", error)
      setSpecialities([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchSpecialities("")
  }, [fetchSpecialities])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSpecialities(searchKeyword)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchKeyword, fetchSpecialities])

  const selectedSpeciality = specialities.find((s) => s.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedSpeciality?.name || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search specialities..."
            value={searchKeyword}
            onValueChange={setSearchKeyword}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {loading ? "Loading..." : "No specialities found."}
            </CommandEmpty>
            <CommandGroup>
              {specialities.map((speciality) => (
                <CommandItem
                  key={speciality.id}
                  value={speciality.name}
                  onSelect={() => {
                    onChange(speciality.id === value ? null : speciality.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === speciality.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {speciality.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
