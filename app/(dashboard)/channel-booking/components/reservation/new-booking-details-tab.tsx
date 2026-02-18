"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import type { LucideIcon } from "lucide-react"
import {
  getBookingsBySession,
  saveBookingAction,
  getAgencyBooksByAgencyForChannelBooking,
} from "@/app/actions/channel-booking"
import type { ChannelBookingAreaOption } from "@/services/channel-booking"
import type { ChannelBookingAgencyBookOption } from "@/services/channel-booking/get-agency-books-by-agency.service"
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
  const { initialData, initialDataLoading, selectedSession, selectedDoctor, selectedSpecialityId, reservationDetails, setBookings } = useChannelBooking()
  const { toast } = useToast()
  const appliedDefaultBookingMethod = useRef(false)
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
  const [saving, setSaving] = useState(false)
  // Booking-type–specific fields (Agent=2, Staff=3, Card=4, Slip=5)
  const [agencyId, setAgencyId] = useState<string>("")
  const [agencyBookId, setAgencyBookId] = useState<string>("")
  const [agencyRef, setAgencyRef] = useState("")
  const [staffId, setStaffId] = useState<string>("")
  const [bankId, setBankId] = useState<string>("")
  const [cardLast4, setCardLast4] = useState("")
  const [slipRef, setSlipRef] = useState("")
  const [agencyBooks, setAgencyBooks] = useState<ChannelBookingAgencyBookOption[]>([])
  const [agencyBooksLoading, setAgencyBooksLoading] = useState(false)
  const areas: ChannelBookingAreaOption[] = initialData?.areas ?? []
  const agencies = initialData?.agencies ?? []
  const banks = initialData?.banks ?? []
  const staffOptions = initialData?.staffOptions ?? []
  const allDiscounts = initialData?.discounts?.manual ?? []
  const allAutoDiscounts = initialData?.discounts?.auto ?? []
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
  const agencyError = !!invalidFields.agency
  const agencyRefError = !!invalidFields.agency_ref
  const staffError = !!invalidFields.staff
  const bankError = !!invalidFields.bank
  const cardError = !!invalidFields.card
  const slipRefError = !!invalidFields.slip_ref
  const errorClass = "border-red-500 focus-visible:ring-red-500"

  const isAgent = paymentMethodId === "2"
  const isStaff = paymentMethodId === "3"
  const isCard = paymentMethodId === "4"
  const isSlip = paymentMethodId === "5"
  const selectedAgency = agencies.find((a) => a.id === agencyId)
  const selectedBank = banks.find((b) => b.id === bankId)
  const selectedStaff = staffOptions.find((s) => s.id === staffId)

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

  // Apply user's default preferred booking method once when initial data is loaded
  useEffect(() => {
    if (initialDataLoading || appliedDefaultBookingMethod.current) return
    const defaultId = initialData?.defaultBookingMethod
    if (defaultId != null && defaultId >= 0 && defaultId <= 5) {
      setPaymentMethodId(String(defaultId))
      appliedDefaultBookingMethod.current = true
    }
  }, [initialDataLoading, initialData?.defaultBookingMethod])

  // Reset reservation form whenever session, doctor, or specialty changes
  useEffect(() => {
    const defaultId = initialData?.defaultBookingMethod
    setPaymentMethodId(
      defaultId != null && defaultId >= 0 && defaultId <= 5
        ? String(defaultId)
        : "0"
    )
    setDiscountSchemeId("")
    setForeigner(false)
    setTitleId("")
    setPatientName("")
    setSexId("")
    setPhoneNumber("")
    setRemarks("")
    setAreaId("")
    setAreaOpen(false)
    setAgencyId("")
    setAgencyBookId("")
    setAgencyRef("")
    setStaffId("")
    setBankId("")
    setCardLast4("")
    setSlipRef("")
    setAgencyBooks([])
    setInvalidFields({})
  }, [selectedSession?.id, selectedDoctor?.id, selectedSpecialityId])

  // Reset booking-type–specific fields when payment method changes
  useEffect(() => {
    setAgencyId("")
    setAgencyBookId("")
    setAgencyRef("")
    setStaffId("")
    setBankId("")
    setCardLast4("")
    setSlipRef("")
    setAgencyBooks([])
  }, [paymentMethodId])

  // Fetch agency books when Agency is selected (Agent = id 2)
  const fetchAgencyBooks = useCallback(async (agencyId: string) => {
    if (!agencyId) {
      setAgencyBooks([])
      return
    }
    setAgencyBooksLoading(true)
    try {
      const res = await getAgencyBooksByAgencyForChannelBooking(agencyId)
      if (res.success && res.data) setAgencyBooks(res.data)
      else setAgencyBooks([])
    } finally {
      setAgencyBooksLoading(false)
    }
  }, [])

  useEffect(() => {
    if (paymentMethodId !== "2") return
    if (agencyId) fetchAgencyBooks(agencyId)
    else setAgencyBooks([])
  }, [paymentMethodId, agencyId, fetchAgencyBooks])

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
    const typeErrors: Record<string, boolean> = {}
    if (isAgent) {
      if (!agencyId || !selectedAgency) typeErrors.agency = true
      if (!agencyRef.trim()) typeErrors.agency_ref = true
    }
    if (isStaff && !staffId) typeErrors.staff = true
    if (isCard) {
      const digits = cardLast4.replace(/\D/g, "")
      if (digits.length !== 4) typeErrors.card = true
      if (!bankId || !selectedBank) typeErrors.bank = true
    }
    if (isSlip) {
      if (!slipRef.trim()) typeErrors.slip_ref = true
      if (!bankId || !selectedBank) typeErrors.bank = true
    }
    if (Object.keys(typeErrors).length > 0) {
      setInvalidFields(typeErrors)
      toast({
        title: "Booking type required",
        description: isAgent
          ? "Please select Agency and enter REF NO."
          : isStaff
            ? "Please select Staff Member."
            : isCard
              ? "Please enter Last 4 Digits and select Bank."
              : "Please enter Bank Reference and select Bank.",
        variant: "destructive",
      })
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
        agency: isAgent && selectedAgency ? { id: selectedAgency.id } : undefined,
        agency_ref: isAgent ? agencyRef.trim().toUpperCase() : undefined,
        staff: isStaff && selectedStaff ? { id: selectedStaff.id } : undefined,
        bank: (isCard || isSlip) && selectedBank ? { id: selectedBank.id, name: selectedBank.name } : undefined,
        card: isCard ? cardLast4.replace(/\D/g, "").slice(-4) : undefined,
        slip_ref: isSlip ? slipRef.trim() : undefined,
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
        setAgencyId("")
        setAgencyBookId("")
        setAgencyRef("")
        setStaffId("")
        setBankId("")
        setCardLast4("")
        setSlipRef("")
        setAgencyBooks([])
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
        {initialDataLoading ? (
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

      {/* Row 2: Booking-type–specific fields (Agent / Staff / Card / Slip) */}
      {isAgent && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <div className="space-y-0.5">
            <Select
              value={agencyId || undefined}
              onValueChange={(v) => {
                setAgencyId(v)
                setAgencyBookId("")
                setAgencyRef("")
              }}
            >
              <SelectTrigger
                className={`${fieldClass} ${agencyError ? errorClass : ""} ${!agencyId ? "text-placeholder" : ""}`}
              >
                <SelectValue placeholder="Select Agency" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Select
              value={agencyBookId || undefined}
              onValueChange={setAgencyBookId}
              disabled={!agencyId || agencyBooksLoading}
            >
              <SelectTrigger
                className={`${fieldClass} ${!agencyId ? "text-placeholder" : ""}`}
              >
                <SelectValue placeholder={agencyBooksLoading ? "Loading…" : "Select a Book"} />
              </SelectTrigger>
              <SelectContent>
                {agencyBooks.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.bookNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-0.5">
            <Input
              className={`${fieldClass} ${agencyRefError ? errorClass : ""}`}
              placeholder="REF NO."
              value={agencyRef}
              onChange={(e) => setAgencyRef(e.target.value)}
            />
          </div>
        </div>
      )}
      {isStaff && (
        <div className="space-y-0.5">
          <Select
            value={staffId || undefined}
            onValueChange={setStaffId}
          >
            <SelectTrigger
              className={`${fieldClass} ${staffError ? errorClass : ""} ${!staffId ? "text-placeholder" : ""}`}
            >
              <SelectValue placeholder="Select Staff Member" />
            </SelectTrigger>
            <SelectContent>
              {staffOptions.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name} {s.code ? `(${s.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {isCard && (
        <div className="grid grid-cols-2 gap-x-3">
          <div className="space-y-0.5">
            <Input
              className={`${fieldClass} ${cardError ? errorClass : ""}`}
              placeholder="Last 4 Digits"
              value={cardLast4}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 4)
                setCardLast4(digits)
              }}
              maxLength={4}
            />
          </div>
          <div className="space-y-0.5">
            <Select
              value={bankId || undefined}
              onValueChange={setBankId}
            >
              <SelectTrigger
                className={`${fieldClass} ${bankError ? errorClass : ""} ${!bankId ? "text-placeholder" : ""}`}
              >
                <SelectValue placeholder="Select Bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {isSlip && (
        <div className="grid grid-cols-2 gap-x-3">
          <div className="space-y-0.5">
            <Input
              className={`${fieldClass} ${slipRefError ? errorClass : ""}`}
              placeholder="Bank Reference"
              value={slipRef}
              onChange={(e) => setSlipRef(e.target.value)}
            />
          </div>
          <div className="space-y-0.5">
            <Select
              value={bankId || undefined}
              onValueChange={setBankId}
            >
              <SelectTrigger
                className={`${fieldClass} ${bankError ? errorClass : ""} ${!bankId ? "text-placeholder" : ""}`}
              >
                <SelectValue placeholder="Select Bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Row 3: Foreigner only */}
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
            {initialDataLoading ? (
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
            !selectedArea ||
            (isAgent && (!agencyId || !agencyRef.trim())) ||
            (isStaff && !staffId) ||
            (isCard && (cardLast4.replace(/\D/g, "").length !== 4 || !bankId)) ||
            (isSlip && (!slipRef.trim() || !bankId))
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
