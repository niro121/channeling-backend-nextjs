"use client"

import { useState, useEffect, useMemo } from "react"
import type { LucideIcon } from "lucide-react"
import {
  getAreasForChannelBooking,
  getBookingsBySession,
  getDiscountsForBooking,
  saveBookingAction,
} from "@/app/actions/channel-booking"
import type { ChannelBookingAreaOption } from "@/services/channel-booking"
import type { DiscountForBookingOption } from "@/services/channel-booking/get-discounts-for-booking.service"
import { useChannelBooking } from "../../context/channel-booking-context"
import { useToast } from "@/components/hooks/use-toast"
import { computeTotalDiscountClient } from "@/lib/channel-booking-discount"
import { getPaymentMethodAndType } from "@/types/save-booking"
import {
  Banknote,
  CalendarCheck,
  Check,
  ChevronsUpDown,
  CreditCard,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  User,
  Users,
  X,
} from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { PaymentMethodIconKey } from "@/types/channel-booking"
import { PAYMENT_METHODS, SEX_OPTIONS } from "@/types/channel-booking"
import { getSexForTitle, TITLE_OPTIONS } from "@/types/title"

const iconClass = "h-3.5 w-3.5 shrink-0 text-muted-foreground"

/** Map spec payment_method (0–4) to Prisma DiscountMethod enum value for client-side filter */
const PAYMENT_METHOD_TO_ENUM: Record<number, string> = {
  0: "POS",
  1: "ON_CALL",
  2: "AGENT",
  3: "STAFF",
  4: "API",
}
/** Map spec payment_type (0–4) to Prisma PaymentType enum value for client-side filter */
const PAYMENT_TYPE_TO_ENUM: Record<number, string> = {
  0: "CASH",
  1: "CREDIT_CARD",
  2: "SLIP",
  3: "CHEQUE",
  4: "CASH",
}

const PAYMENT_ICON_MAP: Record<PaymentMethodIconKey, LucideIcon> = {
  Banknote,
  Phone,
  User,
  Users,
  CreditCard,
  Receipt,
}

/**
 * New Booking Details tab: payment, discount, patient fields, remarks, Book Now.
 */
export function NewBookingDetailsTab() {
  const { selectedSession, selectedDoctor, selectedSpecialityId, reservationDetails, setBookings } = useChannelBooking()
  const { toast } = useToast()
  const [paymentMethodId, setPaymentMethodId] = useState<string>("0")
  const [discountSchemeId, setDiscountSchemeId] = useState<string>("")
  const [foreigner, setForeigner] = useState(false)
  const [titleId, setTitleId] = useState<string>("")
  const [patientName, setPatientName] = useState("")
  const [sexId, setSexId] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [remarks, setRemarks] = useState("")
  const [areaId, setAreaId] = useState<string>("")
  const [areaOpen, setAreaOpen] = useState(false)
  const [areas, setAreas] = useState<ChannelBookingAreaOption[]>([])
  const [areasLoading, setAreasLoading] = useState(true)
  const [allDiscounts, setAllDiscounts] = useState<DiscountForBookingOption[]>([])
  const [allAutoDiscounts, setAllAutoDiscounts] = useState<DiscountForBookingOption[]>([])
  const [discountsLoading, setDiscountsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  /** Snapshot of which fields were invalid when user last clicked Book Now (validation only on action). */
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({})
  const bookAmount =
    foreigner
      ? (reservationDetails?.amountForeign ?? 0)
      : (reservationDetails?.amountLocal ?? 0)
  const hasSession = !!selectedSession
  const selectedArea = areas.find((a) => a.id === areaId)

  const phoneDigits = phoneNumber.replace(/\D/g, "")
  const isPhoneValid = phoneNumber.trim() !== "" && phoneDigits.length === 10

  const nameError = !!invalidFields.name
  const titleError = !!invalidFields.title
  const sexError = !!invalidFields.sex
  const phoneError = !!invalidFields.phone
  const areaError = !!invalidFields.area
  const errorClass = "border-red-500 focus-visible:ring-red-500"

  const { payment_method, payment_type } = getPaymentMethodAndType(
    Number(paymentMethodId)
  )
  const methodStr = PAYMENT_METHOD_TO_ENUM[payment_method]
  const typeStr = PAYMENT_TYPE_TO_ENUM[payment_type]
  const filterByBookingType = useMemo(() => {
    const methods = methodStr != null
    const types = typeStr != null
    return (d: DiscountForBookingOption) => {
      const okMethod = !methods || (d.discountMethod as string[]).includes(methodStr!)
      const okType = !types || (d.paymentType as string[]).includes(typeStr!)
      return okMethod && okType
    }
  }, [methodStr, typeStr])

  const discounts = useMemo(
    () => allDiscounts.filter(filterByBookingType),
    [allDiscounts, filterByBookingType]
  )

  const filteredAutoDiscounts = useMemo(
    () => allAutoDiscounts.filter(filterByBookingType),
    [allAutoDiscounts, filterByBookingType]
  )
  const firstAutoDiscount = filteredAutoDiscounts[0] ?? null
  const manualDiscount = discountSchemeId
    ? discounts.find((d) => d.id === discountSchemeId)
    : null
  const discountsToApply = useMemo(() => {
    const list: DiscountForBookingOption[] = []
    if (firstAutoDiscount) list.push(firstAutoDiscount)
    if (manualDiscount) list.push(manualDiscount)
    return list
  }, [firstAutoDiscount, manualDiscount])
  const computedDiscountAmount = useMemo(
    () =>
      selectedSession?.fees != null
        ? computeTotalDiscountClient(
            selectedSession.fees,
            foreigner,
            discountsToApply
          )
        : 0,
    [selectedSession?.fees, foreigner, discountsToApply]
  )

  useEffect(() => {
    let cancelled = false
    setAreasLoading(true)
    void getAreasForChannelBooking().then((res) => {
      if (cancelled) return
      if (res.success && res.data) setAreas(res.data)
    }).finally(() => {
      if (!cancelled) setAreasLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // Load all manual discounts once; filter is done client-side by booking type
  useEffect(() => {
    let cancelled = false
    setDiscountsLoading(true)
    void getDiscountsForBooking()
      .then((res) => {
        if (cancelled) return
        const data = res.success && res.data ? res.data : { manual: [], auto: [] }
        setAllDiscounts(data.manual)
        setAllAutoDiscounts(data.auto)
      })
      .finally(() => {
        if (!cancelled) setDiscountsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Reset reservation form whenever session, doctor, or specialty changes
  useEffect(() => {
    setPaymentMethodId("0")
    setDiscountSchemeId("")
    setForeigner(false)
    setTitleId("")
    setPatientName("")
    setSexId("")
    setPhoneNumber("")
    setRemarks("")
    setAreaId("")
    setAreaOpen(false)
    setInvalidFields({})
  }, [selectedSession?.id, selectedDoctor?.id, selectedSpecialityId])

  const fieldClass = "h-8 text-xs"
  const smallSelectClass = "h-8 text-xs w-24 shrink-0"

  async function handleBookNow() {
    if (!selectedSession || !selectedDoctor) return
    const missingPatient =
      !patientName.trim() || !titleId || !sexId || !isPhoneValid
    if (missingPatient || !selectedArea) {
      setInvalidFields({
        name: !patientName.trim(),
        title: !titleId,
        sex: !sexId,
        phone: !isPhoneValid,
        area: !selectedArea,
      })
      if (missingPatient) {
        const msg = !isPhoneValid && phoneNumber.trim()
          ? "Phone must be 10 digits."
          : "Please fill Patient Name, Title, Sex, Phone."
        toast({
          title: "Required fields",
          description: msg,
          variant: "destructive",
        })
      }
      if (!selectedArea) {
        toast({
          title: "Area required",
          description: "Please select an area.",
          variant: "destructive",
        })
      }
      return
    }
    setInvalidFields({})
    const { payment_method, payment_type } = getPaymentMethodAndType(
      Number(paymentMethodId)
    )
    setSaving(true)
    try {
      const result = await saveBookingAction({
        name: patientName.trim(),
        title: titleId,
        sex: sexId,
        phone: phoneNumber.trim(),
        area: { id: selectedArea.id, name: selectedArea.name },
        remarks: remarks.trim(),
        foriegner: foreigner,
        payment_method,
        payment_type,
        session: { id: selectedSession.id },
        doctor: {
          id: selectedDoctor.id,
          title: selectedDoctor.title,
          name: selectedDoctor.name,
        },
        amount: bookAmount,
        discount: computedDiscountAmount,
        auto_discount_type: firstAutoDiscount?.id ?? undefined,
        discount_type: discountSchemeId ? discountSchemeId : undefined,
      })
      if (result.success) {
        setInvalidFields({})
        setPaymentMethodId("0")
        setDiscountSchemeId("")
        setForeigner(false)
        setTitleId("")
        setPatientName("")
        setSexId("")
        setPhoneNumber("")
        setRemarks("")
        setAreaId("")
        setAreaOpen(false)
        toast({
          title: "Booking saved",
          description: "The booking was created successfully.",
        })
        getBookingsBySession(selectedSession.id).then((res) => {
          if (res.success && res.data) setBookings(res.data)
        })
      } else {
        toast({
          title: "Error",
          description: result.message ?? result.errorCode ?? "Failed to save booking.",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save booking.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Row 1: Payment | Discount Scheme (booking method) */}
      <div className="grid grid-cols-2 gap-x-3">
        <Select
          value={paymentMethodId}
          onValueChange={(value) => {
            setPaymentMethodId(value)
            setDiscountSchemeId("")
          }}
        >
          <SelectTrigger className={fieldClass}>
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <SelectValue placeholder="Payment" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => {
              const Icon = PAYMENT_ICON_MAP[m.icon]
              return (
                <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                  <span className="flex items-center gap-2">
                    <Icon className={iconClass} />
                    {m.name}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {discountsLoading ? (
          <div className={`${fieldClass} flex items-center gap-2 w-full rounded-md border border-input bg-muted/30 text-muted-foreground text-xs px-3`}>
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-green-800" />
            Loading…
          </div>
        ) : (
          <div className="relative flex w-full" key={`discount-scheme-${paymentMethodId}`}>
            <Select
              value={discountSchemeId || undefined}
              onValueChange={setDiscountSchemeId}
            >
              <SelectTrigger
                className={`${fieldClass} pr-8 ${!discountSchemeId ? "text-placeholder" : ""}`}
              >
                <SelectValue placeholder="Select Discount Scheme" />
              </SelectTrigger>
              <SelectContent>
                {discounts.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {discountSchemeId && (
              <button
                type="button"
                aria-label="Remove discount scheme"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDiscountSchemeId("")
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Foreigner only */}
      <div className="flex items-center gap-1.5">
        <Checkbox
          id="foreigner"
          checked={foreigner}
          onCheckedChange={(v) => setForeigner(v === true)}
        />
        <span className="text-xs cursor-pointer" onClick={() => setForeigner(!foreigner)}>
          Foreigner
        </span>
      </div>

      {/* Row 3: Title (small) | Patient Name (rest) */}
      <div className="flex gap-2 items-stretch">
        <div className="space-y-0.5">
          <Select
            value={titleId || undefined}
            onValueChange={(value) => {
              setTitleId(value)
              const sexForTitle = getSexForTitle(value)
              if (sexForTitle) {
                const sexOption = SEX_OPTIONS.find(
                  (s) => s.name.toLowerCase() === sexForTitle.toLowerCase()
                )
                if (sexOption) setSexId(sexOption.id)
              }
            }}
          >
            <SelectTrigger
              className={`${smallSelectClass} ${titleError ? errorClass : ""} ${!titleId ? "text-placeholder" : ""}`}
            >
              <SelectValue placeholder="Title" />
            </SelectTrigger>
            <SelectContent>
              {TITLE_OPTIONS.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-0 space-y-0.5">
          <div className="relative flex-1 min-w-0">
            <User className={`${iconClass} absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${nameError ? "text-red-500" : ""}`} />
            <Input
              className={`${fieldClass} min-w-0 w-full pl-8 ${nameError ? errorClass : ""}`}
              placeholder="PATIENT NAME"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Row 4: Sex (small) | Phone (rest) */}
      <div className="flex gap-2 items-stretch">
        <div className="space-y-0.5">
          <Select value={sexId || undefined} onValueChange={setSexId}>
            <SelectTrigger
              className={`${smallSelectClass} ${sexError ? errorClass : ""} ${!sexId ? "text-placeholder" : ""}`}
            >
              <SelectValue placeholder="Sex" />
            </SelectTrigger>
            <SelectContent>
              {SEX_OPTIONS.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-0 space-y-0.5">
          <div className="relative flex-1 min-w-0">
            <Phone className={`${iconClass} absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${phoneError ? "text-red-500" : ""}`} />
            <Input
              className={`${fieldClass} min-w-0 w-full pl-8 ${phoneError ? errorClass : ""}`}
              placeholder="Phone Number (07XXXXXXXX)"
              value={phoneNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                setPhoneNumber(digits)
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 5: Remarks | Area */}
      <div className="grid grid-cols-2 gap-x-3">
        <div className="relative">
          <MessageSquare className={`${iconClass} absolute left-2.5 top-3 pointer-events-none`} />
          <Textarea
            className={`min-h-[52px] resize-y ${fieldClass} pl-8`}
            placeholder="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
        <div className="relative flex flex-col gap-0.5">
          <div className="relative flex h-8 items-center">
            <span className={`absolute left-0 flex h-8 w-8 items-center justify-center pointer-events-none z-10 ${areaError ? "text-red-500" : ""}`}>
              <MapPin className={iconClass} />
            </span>
            {areasLoading ? (
              <div className={`${fieldClass} pl-8 flex items-center gap-2 w-full rounded-md border border-input bg-muted/30 text-muted-foreground text-xs`}>
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-green-800" />
                Loading…
              </div>
            ) : (
              <Popover open={areaOpen} onOpenChange={setAreaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={areaOpen}
                    className={cn(
                      fieldClass,
                      "pl-8 w-full justify-between font-normal",
                      areaError && errorClass,
                      !selectedArea && "text-placeholder"
                    )}
                  >
                    {selectedArea?.name ?? "Select Area"}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search area..." className="h-8 text-xs" />
                    <CommandList className="max-h-[200px]">
                      <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">No area found.</CommandEmpty>
                      <CommandGroup>
                        {areas.map((area) => (
                          <CommandItem
                            key={area.id}
                            value={area.name ?? ""}
                            className="text-xs"
                            onSelect={() => {
                              setAreaId(area.id)
                              setAreaOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3.5 w-3.5",
                                areaId === area.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {area.name ?? ""}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-medium text-red-600">
            Discount : {computedDiscountAmount.toFixed(2)}
          </span>
          {firstAutoDiscount && (
            <span className="text-muted-foreground">
              Auto: {firstAutoDiscount.name}
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={
            !hasSession ||
            saving ||
            !patientName.trim() ||
            !titleId ||
            !sexId ||
            !isPhoneValid ||
            !selectedArea
          }
          onClick={handleBookNow}
          className="h-8 bg-green-700 hover:bg-green-800 text-white text-xs shrink-0 gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? (
            <>
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving…
            </>
          ) : (
            <>
              <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
              Book Now ( Rs.{bookAmount.toFixed(2)} )
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
