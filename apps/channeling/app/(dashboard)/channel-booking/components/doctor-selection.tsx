"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useChannelBooking } from "../context/channel-booking-context"
import type { ChannelBookingDoctorOption, ChannelBookingSpecialityOption } from "@/services/channel-booking"
import { cn } from "@/lib/utils"

export function DoctorSelection() {
  const {
    initialData,
    initialDataLoading,
    selectedSpecialityId,
    selectedDoctor,
    setSelectedSpecialityId,
    onDoctorSelect,
  } = useChannelBooking()

  const allSpecialities: ChannelBookingSpecialityOption[] = initialData?.specialities ?? []
  const allDoctors: ChannelBookingDoctorOption[] = initialData?.doctors ?? []
  const [specialitySearch, setSpecialitySearch] = useState("")
  const [consultantSearch, setConsultantSearch] = useState("")

  // Memoize filtered specialities to avoid recalculating on every render
  const filteredSpecialities = useMemo(
    () =>
      allSpecialities.filter((speciality) =>
        speciality.name.toLowerCase().includes(specialitySearch.toLowerCase())
      ),
    [allSpecialities, specialitySearch]
  )

  // Memoize filtered doctors: when searching consultant, ignore specialty and filter from full list
  const filteredDoctors = useMemo(
    () =>
      allDoctors.filter((doctor) => {
        const doctorName = [doctor.title, doctor.name].filter(Boolean).join(" ")
        const matchesSearch = doctorName
          .toLowerCase()
          .includes(consultantSearch.toLowerCase())
        // When user is searching, show all doctors matching the search (drop specialty filter)
        if (consultantSearch.trim()) {
          return matchesSearch
        }
        // When not searching, filter by selected specialty only
        if (selectedSpecialityId && doctor.specialityId !== selectedSpecialityId) {
          return false
        }
        return true
      }),
    [allDoctors, consultantSearch, selectedSpecialityId]
  )

  const handleSpecialityClick = (specialityId: string) => {
    const newSpecialityId = specialityId === selectedSpecialityId ? null : specialityId
    setSelectedSpecialityId(newSpecialityId)
    
    // If deselecting speciality or selecting a different one, clear doctor if it doesn't match
    if (selectedDoctor && selectedDoctor.specialityId !== newSpecialityId) {
      onDoctorSelect(null)
    }
  }

  const handleDoctorClick = (doctor: ChannelBookingDoctorOption) => {
    const isDeselecting = doctor.id === selectedDoctor?.id
    
    if (isDeselecting) {
      onDoctorSelect(null)
    } else {
      // Select the doctor and auto-select their speciality
      onDoctorSelect(doctor)
      if (doctor.specialityId && doctor.specialityId !== selectedSpecialityId) {
        setSelectedSpecialityId(doctor.specialityId)
      }
    }
  }

  const listHeight = "h-[160px]"

  return (
    <div className="grid grid-cols-2 gap-2 min-h-0">
      {/* Specialities – single border, smaller text */}
      <Card className="flex flex-col min-h-0 border border-border">
        <CardContent className="flex flex-col min-h-0 p-0 overflow-hidden rounded-[inherit]">
          <Input
            placeholder="Specialty"
            value={specialitySearch}
            onChange={(e) => setSpecialitySearch(e.target.value)}
            className="h-7 text-xs rounded-none border-0 border-b border-border bg-muted/10 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div
            className={cn(
              "flex-1 bg-muted/10 overflow-y-auto shrink-0 scrollbar-thinner",
              listHeight
            )}
          >
            {initialDataLoading ? (
              <div className="p-2 text-xs text-muted-foreground">Loading...</div>
            ) : filteredSpecialities.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground">
                {specialitySearch ? "No specialities found." : "No specialities available."}
              </div>
            ) : (
              <div className="py-0.5 divide-y divide-border">
                {filteredSpecialities.map((speciality) => {
                  if (!speciality.id) return null
                  return (
                    <div
                      key={speciality.id}
                      onClick={() => handleSpecialityClick(speciality.id)}
                      className={cn(
                        "px-2 py-1.5 text-xs cursor-pointer transition-colors duration-150",
                        "hover:bg-primary hover:text-primary-foreground",
                        selectedSpecialityId === speciality.id &&
                          "bg-primary text-primary-foreground font-medium"
                      )}
                    >
                      {speciality.name}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Consultant – single border, smaller text */}
      <Card className="flex flex-col min-h-0 border border-border">
        <CardContent className="flex flex-col min-h-0 p-0 overflow-hidden rounded-[inherit]">
          <Input
            placeholder="Consultant"
            value={consultantSearch}
            onChange={(e) => {
              const value = e.target.value
              setConsultantSearch(value)
              if (value.trim()) setSelectedSpecialityId(null)
            }}
            className="h-7 text-xs rounded-none border-0 border-b border-border bg-muted/10 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div
            className={cn(
              "flex-1 bg-muted/10 overflow-y-auto shrink-0 scrollbar-thinner",
              listHeight
            )}
          >
            {initialDataLoading ? (
              <div className="p-2 text-xs text-muted-foreground">Loading...</div>
            ) : filteredDoctors.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground">
                {consultantSearch ? "No consultants found." : "No consultants available."}
              </div>
            ) : (
              <div className="py-0.5 divide-y divide-border">
                {filteredDoctors.map((doctor) => {
                  const doctorName = [doctor.title, doctor.name]
                    .filter(Boolean)
                    .join(" ")
                  return (
                    <div
                      key={doctor.id}
                      onClick={() => handleDoctorClick(doctor)}
                      className={cn(
                        "px-2 py-1.5 text-xs cursor-pointer transition-colors duration-150",
                        "hover:bg-primary hover:text-primary-foreground",
                        selectedDoctor?.id === doctor.id &&
                          "bg-primary text-primary-foreground font-medium"
                      )}
                    >
                      {doctorName}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
