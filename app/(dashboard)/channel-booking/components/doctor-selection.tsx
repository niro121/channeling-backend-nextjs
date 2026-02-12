"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useChannelBooking } from "../context/channel-booking-context"
import { getAllSpecialityOptions } from "@/app/actions/doctor.actions"
import { getAllDoctors } from "@/app/actions/doctor.actions"
import { cn } from "@/lib/utils"
import type { Speciality } from "@/types/speciality"
import type { Doctor } from "@/types/doctor"

export function DoctorSelection() {
  const {
    selectedSpecialityId,
    selectedDoctor,
    setSelectedSpecialityId,
    onDoctorSelect,
  } = useChannelBooking()

  const [allSpecialities, setAllSpecialities] = useState<Speciality[]>([])
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([])
  const [specialitySearch, setSpecialitySearch] = useState("")
  const [consultantSearch, setConsultantSearch] = useState("")
  const [loading, setLoading] = useState(true)

  // Fetch both specialities and doctors in parallel using a single useEffect
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch both in parallel
        const [specialitiesResult, doctorsResult] = await Promise.all([
          getAllSpecialityOptions(),
          getAllDoctors({ page: "0", limit: "1000" }),
        ])

        if (cancelled) return

        if (specialitiesResult.success && specialitiesResult.data) {
          setAllSpecialities(specialitiesResult.data)
        }

        if (doctorsResult.success && doctorsResult.data) {
          setAllDoctors(doctorsResult.data)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [])

  // Memoize filtered specialities to avoid recalculating on every render
  const filteredSpecialities = useMemo(
    () =>
      allSpecialities.filter((speciality) =>
        speciality.name.toLowerCase().includes(specialitySearch.toLowerCase())
      ),
    [allSpecialities, specialitySearch]
  )

  // Memoize filtered doctors to avoid recalculating on every render
  // Filter by both search term and selected speciality
  const filteredDoctors = useMemo(
    () =>
      allDoctors.filter((doctor) => {
        // Filter by speciality if one is selected
        if (selectedSpecialityId && doctor.specialityId !== selectedSpecialityId) {
          return false
        }
        // Filter by search term
        const doctorName = [doctor.title, doctor.name].filter(Boolean).join(" ")
        return doctorName.toLowerCase().includes(consultantSearch.toLowerCase())
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

  const handleDoctorClick = (doctor: Doctor) => {
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
            {loading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading...</div>
            ) : filteredSpecialities.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                {specialitySearch ? "No specialities found." : "No specialities available."}
              </div>
            ) : (
              <div className="p-1">
                {filteredSpecialities.map((speciality) => {
                  if (!speciality.id) return null
                  return (
                    <div
                      key={speciality.id}
                      onClick={() => handleSpecialityClick(speciality.id!)}
                      className={cn(
                        "p-2 text-sm cursor-pointer rounded-md hover:bg-muted/50 transition-colors",
                        selectedSpecialityId === speciality.id &&
                          "bg-primary/10 text-primary font-medium"
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
            {loading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading...</div>
            ) : filteredDoctors.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                {consultantSearch ? "No consultants found." : "No consultants available."}
              </div>
            ) : (
              <div className="p-1">
                {filteredDoctors.map((doctor) => {
                  if (!doctor.id) return null
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
