"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useChannelBooking } from "../context/channel-booking-context"
import { cn } from "@/lib/utils"

type SpecialityOption = {
  id: string
  name: string
}

type DoctorOption = {
  id: string
  name: string
  title?: string | null
  code?: string | null
}

export function DoctorSelection() {
  const {
    selectedSpecialityId,
    selectedDoctor,
    setSelectedSpecialityId,
    onDoctorSelect,
  } = useChannelBooking()

  const [allSpecialities, setAllSpecialities] = useState<SpecialityOption[]>([])
  const [allDoctors, setAllDoctors] = useState<DoctorOption[]>([])
  const [specialitySearch, setSpecialitySearch] = useState("")
  const [consultantSearch, setConsultantSearch] = useState("")
  const [loadingSpecialities, setLoadingSpecialities] = useState(false)
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  // Fetch all specialities
  useEffect(() => {
    setLoadingSpecialities(true)
    fetch("/api/speciality?page=0&limit=1000")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setAllSpecialities(
            result.data.map((item: any) => ({
              id: item.id,
              name: item.name,
            }))
          )
        }
      })
      .catch((error) => {
        console.error("Failed to fetch specialities:", error)
      })
      .finally(() => {
        setLoadingSpecialities(false)
      })
  }, [])

  // Fetch all doctors (independent of speciality)
  useEffect(() => {
    setLoadingDoctors(true)
    fetch("/api/doctor?page=0&limit=1000")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setAllDoctors(
            result.data.map((item: any) => ({
              id: item.id,
              name: item.name,
              title: item.title,
              code: item.code,
            }))
          )
        }
      })
      .catch((error) => {
        console.error("Failed to fetch doctors:", error)
      })
      .finally(() => {
        setLoadingDoctors(false)
      })
  }, [])

  // Filter specialities based on search
  const filteredSpecialities = allSpecialities.filter((speciality) =>
    speciality.name.toLowerCase().includes(specialitySearch.toLowerCase())
  )

  // Filter doctors based on search
  const filteredDoctors = allDoctors.filter((doctor) => {
    const doctorName = [doctor.title, doctor.name].filter(Boolean).join(" ")
    return doctorName.toLowerCase().includes(consultantSearch.toLowerCase())
  })

  const handleSpecialityClick = (specialityId: string) => {
    setSelectedSpecialityId(specialityId === selectedSpecialityId ? null : specialityId)
  }

  const handleDoctorClick = (doctor: DoctorOption) => {
    const fullDoctor = {
      id: doctor.id,
      name: doctor.name,
      title: doctor.title,
      code: doctor.code,
    } as any
    onDoctorSelect(doctor.id === selectedDoctor?.id ? null : fullDoctor)
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Specialities Card */}
      <Card className="flex flex-col min-h-[320px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Specialities</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
          <div className="mb-3">
            <Input
              placeholder="Search specialities..."
              value={specialitySearch}
              onChange={(e) => setSpecialitySearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 rounded-md border border-border bg-muted/20 min-h-[200px] overflow-auto">
            {loadingSpecialities ? (
              <div className="p-2 text-sm text-muted-foreground">Loading...</div>
            ) : filteredSpecialities.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                {specialitySearch ? "No specialities found." : "No specialities available."}
              </div>
            ) : (
              <div className="p-1">
                {filteredSpecialities.map((speciality) => (
                  <div
                    key={speciality.id}
                    onClick={() => handleSpecialityClick(speciality.id)}
                    className={cn(
                      "p-2 text-sm cursor-pointer rounded-md hover:bg-muted/50 transition-colors",
                      selectedSpecialityId === speciality.id &&
                        "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    {speciality.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Consultant Card */}
      <Card className="flex flex-col min-h-[320px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Consultant</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
          <div className="mb-3">
            <Input
              placeholder="Search consultants..."
              value={consultantSearch}
              onChange={(e) => setConsultantSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 rounded-md border border-border bg-muted/20 min-h-[200px] overflow-auto">
            {loadingDoctors ? (
              <div className="p-2 text-sm text-muted-foreground">Loading...</div>
            ) : filteredDoctors.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                {consultantSearch ? "No consultants found." : "No consultants available."}
              </div>
            ) : (
              <div className="p-1">
                {filteredDoctors.map((doctor) => {
                  const doctorName = [doctor.title, doctor.name]
                    .filter(Boolean)
                    .join(" ")
                  return (
                    <div
                      key={doctor.id}
                      onClick={() => handleDoctorClick(doctor)}
                      className={cn(
                        "p-2 text-sm cursor-pointer rounded-md hover:bg-muted/50 transition-colors",
                        selectedDoctor?.id === doctor.id &&
                          "bg-primary/10 text-primary font-medium"
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
