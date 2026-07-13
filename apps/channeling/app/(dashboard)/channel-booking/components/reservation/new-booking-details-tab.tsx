"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import type { LucideIcon } from "lucide-react"
import {
  getBookingsBySession,
  saveBookingAction,
  getAgencyBooksByAgencyForChannelBooking,
  validateVoucherAction,
} from "@/app/actions/channel-booking"
import type { ChannelBookingAreaOption } from "@/services/channel-booking"
import type { ChannelBookingAgencyBookOption } from "@/services/channel-booking/reference/get-agency-books-by-agency.service"
import type { DiscountForBookingOption } from "@/services/channel-booking/reference/get-discounts-for-booking.service"
import { useChannelBooking, type ChannelBookingRecord } from "../../context/channel-booking-context"
import { usePermissions } from "@/components/hooks/use-permissions"
import { useToast } from "@/components/hooks/use-toast"
import {
  computeDiscountDivisionClient,
  formatCategoryDiscountLabel,
  getDiscountCapExceededMessage,
} from "@/lib/channel-booking-discount"
import { formatLKR } from "@/lib/format-money"
import {
  getPaymentMethodAndType,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"
import {
  Banknote,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronsUpDown,
  CreditCard,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  Search,
  User,
  UserCircle,
  Users,
  Wallet,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { PaymentMethodIconKey } from "@/types/channel-booking"
import { PAYMENT_METHODS, SEX_OPTIONS } from "@/types/channel-booking"
import { getSexForTitle, TITLE_OPTIONS } from "@/types/title"
import type { HmisPatientSearchResult } from "@/types/hmis-patient"
import { HmisPatientSearchDialog } from "./hmis-patient-search-dialog"

const iconClass = "h-3.5 w-3.5 shrink-0 text-muted-foreground"

/** Map spec payment_method (0–4) to Prisma DiscountMethod enum value for client-side filter */
const PAYMENT_METHOD_TO_ENUM: Record<number, string> = {
  0: "POS",
  1: "ON_CALL",
  2: "AGENT",
  3: "STAFF",
  4: "API",
}
/** Map spec payment_type (0–6) to Prisma PaymentType enum value for client-side filter */
const PAYMENT_TYPE_TO_ENUM: Record<number, string> = {
  0: "CASH",
  1: "CREDIT_CARD",
  2: "SLIP",
  3: "CHEQUE",
  4: "CASH",
  5: "CASH",
  6: "CASH",
  7: "CASH",
}

const PAYMENT_ICON_MAP: Record<PaymentMethodIconKey, LucideIcon> = {
  Banknote,
  Phone,
  User,
  Users,
  CreditCard,
  Receipt,
  UserCircle,
  Wallet,
}

type MixedLine = {
  payment_method: number
  amount: string
  bank_id: string
  card: string
  slip_ref: string
  slip_date: string
  ewallet_ref: string
}

const DEFAULT_MIXED_LINES: MixedLine[] = [
  { payment_method: 0, amount: "", bank_id: "", card: "", slip_ref: "", slip_date: "", ewallet_ref: "" },
  { payment_method: 1, amount: "", bank_id: "", card: "", slip_ref: "", slip_date: "", ewallet_ref: "" },
]

/**
 * New Booking Details tab: payment, discount, patient fields, remarks, Book Now.
 */
export function NewBookingDetailsTab() {
  const {
    initialData,
    initialDataLoading,
    selectedSession,
    selectedDoctor,
    selectedSpecialityId,
    reservationDetails,
    setBookings,
    setSelectedBooking,
    setActiveInformationTab,
    setSelectedAgencyId,
    referredDoctorId,
    referredAgencyId,
    referredStaffId,
    setReferredDoctorId,
    setReferredAgencyId,
    setReferredStaffId,
  } = useChannelBooking()
  const { toast } = useToast()
  const { has } = usePermissions()
  const canForcedBooking = has("channel-booking-forced-booking", "view")
  const appliedDefaultBookingMethod = useRef(false)
  const [paymentMethodId, setPaymentMethodId] = useState<string>("0")
  const [discountSchemeId, setDiscountSchemeId] = useState<string>("")
  const [voucherCode, setVoucherCode] = useState("")
  const [voucherValid, setVoucherValid] = useState<boolean | null>(null)
  const [voucherValidationMessage, setVoucherValidationMessage] = useState<string>("")
  const [voucherValidating, setVoucherValidating] = useState(false)
  /** Incremented on successful save so discount Select remounts and shows placeholder. */
  const [formResetKey, setFormResetKey] = useState(0)
  const [foreigner, setForeigner] = useState(false)
  const [titleId, setTitleId] = useState<string>("")
  const [patientName, setPatientName] = useState("")
  const [sexId, setSexId] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [hmisPatientId, setHmisPatientId] = useState<string | null>(null)
  const [hmisMrn, setHmisMrn] = useState<string | null>(null)
  const [hmisSearchOpen, setHmisSearchOpen] = useState(false)
  const [remarks, setRemarks] = useState("")
  const [areaId, setAreaId] = useState<string>("")
  const [areaOpen, setAreaOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mixedDialogOpen, setMixedDialogOpen] = useState(false)
  const [mixedLines, setMixedLines] = useState<MixedLine[]>(DEFAULT_MIXED_LINES)
  const [forcedApptInput, setForcedApptInput] = useState("")
  const [forceApptAck, setForceApptAck] = useState(false)
  const [forcedBookingExpanded, setForcedBookingExpanded] = useState(false)
  function resetMixedDialog() {
    setMixedDialogOpen(false)
    setMixedLines(DEFAULT_MIXED_LINES)
  }

  // Booking-type–specific fields (Agent=2, Staff=3, Card=4, Slip=5, Credit Customer=6, E-wallet=7)
  const [agencyId, setAgencyId] = useState<string>("")
  const [agencyBookId, setAgencyBookId] = useState<string>("")
  const [agencyRef, setAgencyRef] = useState("")
  const [creditCustomerId, setCreditCustomerId] = useState<string>("")
  const [staffId, setStaffId] = useState<string>("")
  const [bankId, setBankId] = useState<string>("")
  const [cardLast4, setCardLast4] = useState("")
  const [slipRef, setSlipRef] = useState("")
  const [slipDate, setSlipDate] = useState("")
  const [ewalletRef, setEwalletRef] = useState("")
  const [agencyBooks, setAgencyBooks] = useState<ChannelBookingAgencyBookOption[]>([])
  const [agencyBooksLoading, setAgencyBooksLoading] = useState(false)
  const areas: ChannelBookingAreaOption[] = initialData?.areas ?? []
  const agencies = initialData?.agencies ?? []
  const creditCustomers = initialData?.creditCustomers ?? []
  const banks = initialData?.banks ?? []
  const staffOptions = initialData?.staffOptions ?? []
  const allDiscounts = initialData?.discounts?.manual ?? []
  const allAutoDiscounts = initialData?.discounts?.auto ?? []
  /** Snapshot of which fields were invalid when user last clicked Book Now (validation only on action). */
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({})
  const baseAmount =
    foreigner
      ? (reservationDetails?.amountForeign ?? 0)
      : (reservationDetails?.amountLocal ?? 0)
  const hasSession = !!selectedSession
  const hasBlockedAppointmentNumbers =
    (selectedSession?.blockedAppointmentNumbers?.length ?? 0) > 0
  const selectedArea = areas.find((a) => a.id === areaId)

  const phoneDigits = phoneNumber.replace(/\D/g, "")
  const isPhoneValid = phoneNumber.trim() !== "" && phoneDigits.length === 10

  const nameError = !!invalidFields.name
  const titleError = !!invalidFields.title
  const sexError = !!invalidFields.sex
  const phoneError = !!invalidFields.phone
  const areaError = !!invalidFields.area
  const agencyError = !!invalidFields.agency
  const agencyBookError = !!invalidFields.agency_book
  const agencyRefError = !!invalidFields.agency_ref
  const creditCustomerError = !!invalidFields.credit_customer
  const staffError = !!invalidFields.staff
  const bankError = !!invalidFields.bank
  const cardError = !!invalidFields.card
  const slipRefError = !!invalidFields.slip_ref
  const slipDateError = !!invalidFields.slip_date
  const ewalletRefError = !!invalidFields.ewallet_ref
  const voucherError = !!invalidFields.voucher_code
  const errorClass = "border-red-500 focus-visible:ring-red-500"

  const isAgent = paymentMethodId === "2"
  const isStaff = paymentMethodId === "3"
  const isCard = paymentMethodId === "4"
  const isSlip = paymentMethodId === "5"
  const isCreditCustomer = paymentMethodId === "6"
  const isEWallet = paymentMethodId === "7"
  const isMixed = paymentMethodId === "8"
  const selectedAgency = agencies.find((a) => a.id === agencyId)
  const selectedAgencyBook = agencyBooks.find((b) => b.id === agencyBookId)
  const selectedCreditCustomer = creditCustomers.find((c) => c.id === creditCustomerId)
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
  const isVoucherScheme = manualDiscount?.isVoucher === 1
  const discountsToApply = useMemo(() => {
    const list: DiscountForBookingOption[] = []
    if (firstAutoDiscount) list.push(firstAutoDiscount)
    if (manualDiscount) list.push(manualDiscount)
    return list
  }, [firstAutoDiscount, manualDiscount])
  const discountDivision = useMemo(
    () =>
      selectedSession?.fees != null
        ? computeDiscountDivisionClient(
            selectedSession.fees,
            foreigner,
            discountsToApply
          )
        : {
            total: 0,
            hospitalFeeDiscount: 0,
            professionalFeeDiscount: 0,
            otherDiscount: 0,
          },
    [selectedSession?.fees, foreigner, discountsToApply]
  )
  const computedDiscountAmount = discountDivision.total
  const discountCapExceededMessage = useMemo(
    () =>
      selectedSession?.fees != null
        ? getDiscountCapExceededMessage(
            selectedSession.fees,
            foreigner,
            discountsToApply
          )
        : null,
    [selectedSession?.fees, foreigner, discountsToApply]
  )
  /** Amount to pay (base − discount). Sent to server and shown on Book button. */
  const amountToPay = baseAmount - computedDiscountAmount

  // Apply user's default preferred booking method once when initial data is loaded
  useEffect(() => {
    if (initialDataLoading || appliedDefaultBookingMethod.current) return
    const defaultId = initialData?.defaultBookingMethod
    if (defaultId != null && defaultId >= 0 && defaultId <= 8) {
      setPaymentMethodId(String(defaultId))
      appliedDefaultBookingMethod.current = true
    }
  }, [initialDataLoading, initialData?.defaultBookingMethod])

  // Reset reservation form whenever session, doctor, specialty, or reservation details change (including when reservation is cleared)
  useEffect(() => {
    const defaultId = initialData?.defaultBookingMethod
    setPaymentMethodId(
      defaultId != null && defaultId >= 0 && defaultId <= 8
        ? String(defaultId)
        : "0"
    )
    setDiscountSchemeId("")
    setVoucherCode("")
    setVoucherValid(null)
    setVoucherValidationMessage("")
    setForeigner(false)
    setTitleId("")
    setPatientName("")
    setSexId("")
    setPhoneNumber("")
    setHmisPatientId(null)
    setHmisMrn(null)
    setRemarks("")
    setAreaId("")
    setAreaOpen(false)
    setAgencyId("")
    setAgencyBookId("")
    setAgencyRef("")
    setCreditCustomerId("")
    setStaffId("")
    setBankId("")
    setCardLast4("")
    setSlipRef("")
    setSlipDate("")
    setEwalletRef("")
    resetMixedDialog()
    setAgencyBooks([])
    setSelectedAgencyId(null)
    setReferredDoctorId(null)
    setReferredAgencyId(null)
    setReferredStaffId(null)
    setForcedApptInput("")
    setForceApptAck(false)
    setForcedBookingExpanded(false)
    setInvalidFields({})
  }, [selectedSession?.id, selectedDoctor?.id, selectedSpecialityId, reservationDetails, setSelectedAgencyId, setReferredDoctorId, setReferredAgencyId, setReferredStaffId])

  // Reset booking-type–specific fields when payment method changes
  useEffect(() => {
    setAgencyId("")
    setAgencyBookId("")
    setAgencyRef("")
    setCreditCustomerId("")
    setStaffId("")
    setBankId("")
    setCardLast4("")
    setSlipRef("")
    setSlipDate("")
    setEwalletRef("")
    resetMixedDialog()
    setAgencyBooks([])
    setSelectedAgencyId(null)
  }, [paymentMethodId, setSelectedAgencyId])

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

  useEffect(() => {
    if (!hasBlockedAppointmentNumbers) {
      setForceApptAck(false)
      setForcedApptInput("")
      setForcedBookingExpanded(false)
    }
  }, [hasBlockedAppointmentNumbers])

  const fieldClass = "h-8 text-xs"
  const smallSelectClass = "h-8 text-xs w-24 shrink-0"

  function applyHmisPatient(patient: HmisPatientSearchResult) {
    if (patient.title) setTitleId(patient.title)
    setPatientName(patient.name)
    if (patient.sex) {
      const sexOption = SEX_OPTIONS.find((s) => s.id === patient.sex)
      if (sexOption) setSexId(sexOption.id)
    } else if (patient.title) {
      const sexForTitle = getSexForTitle(patient.title)
      if (sexForTitle) {
        const sexOption = SEX_OPTIONS.find(
          (s) => s.name.toLowerCase() === sexForTitle.toLowerCase()
        )
        if (sexOption) setSexId(sexOption.id)
      }
    }
    if (patient.phone) setPhoneNumber(patient.phone)
    setHmisPatientId(patient.id)
    setHmisMrn(patient.mrn)
    setInvalidFields((prev) => {
      const next = { ...prev }
      delete next.name
      delete next.title
      delete next.sex
      delete next.phone
      return next
    })
  }

  async function submitBooking(mixedPaymentLines?: Array<{ payment_method: number; amount: number }>) {
    if (!selectedSession || !selectedDoctor || !selectedArea) return
    if (discountCapExceededMessage) {
      toast({
        title: "Discount error",
        description: discountCapExceededMessage,
        variant: "destructive",
      })
      return
    }
    const { payment_method, payment_type } = getPaymentMethodAndType(Number(paymentMethodId))
    setSaving(true)
    try {
      const forcedTrim = forcedApptInput.trim()
      const parsedForced =
        forcedTrim !== "" ? parseInt(forcedTrim, 10) : NaN
      const forcedAppointmentPayload =
        forcedTrim !== "" && Number.isFinite(parsedForced)
          ? {
              forcedAppointmentNo: parsedForced,
              forceAppointmentNo:
                hasBlockedAppointmentNumbers && forceApptAck && canForcedBooking,
            }
          : {}

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
        amount: amountToPay,
        discount: computedDiscountAmount,
        auto_discount_type: firstAutoDiscount?.id ?? undefined,
        discount_type: discountSchemeId ? discountSchemeId : undefined,
        voucher_code: isVoucherScheme ? voucherCode.trim().toUpperCase() : undefined,
        agency: isAgent && selectedAgency ? { id: selectedAgency.id } : undefined,
        agency_book_id: isAgent && selectedAgencyBook ? selectedAgencyBook.id : undefined,
        agency_leaf: isAgent
          ? agencyRef.replace(/\D/g, "").slice(0, 2).padStart(2, "0")
          : undefined,
        agency_ref: isAgent
          ? (selectedAgencyBook?.bookNumber ?? "") + agencyRef.replace(/\D/g, "").slice(0, 2).padStart(2, "0")
          : undefined,
        credit_customer: isCreditCustomer && selectedCreditCustomer ? { id: selectedCreditCustomer.id } : undefined,
        staff: isStaff && selectedStaff ? { id: selectedStaff.id } : undefined,
        bank: (isCard || isSlip) && selectedBank ? { id: selectedBank.id, name: selectedBank.name } : undefined,
        card: isCard ? cardLast4.replace(/\D/g, "").slice(-4) : undefined,
        slip_ref: isSlip ? slipRef.trim() : undefined,
        slip_date: isSlip ? slipDate.trim() : undefined,
        ewallet_ref: isEWallet ? ewalletRef.trim() : undefined,
        payment_lines: mixedPaymentLines,
        referred_doctor: referredDoctorId ? { id: referredDoctorId } : undefined,
        referred_agency: referredAgencyId ? { id: referredAgencyId } : undefined,
        referred_staff: referredStaffId ? { id: referredStaffId } : undefined,
        hmisPatientId: hmisPatientId ?? undefined,
        hmisMrn: hmisMrn ?? undefined,
        ...forcedAppointmentPayload,
      })
      if (result.success) {
        setInvalidFields({})
        setPaymentMethodId("0")
        setDiscountSchemeId("")
        setVoucherCode("")
        setVoucherValid(null)
        setVoucherValidationMessage("")
        setFormResetKey((k) => k + 1)
        setForeigner(false)
        setTitleId("")
        setPatientName("")
        setSexId("")
        setPhoneNumber("")
        setHmisPatientId(null)
        setHmisMrn(null)
        setRemarks("")
        setAreaId("")
        setAreaOpen(false)
        setAgencyId("")
        setAgencyBookId("")
        setAgencyRef("")
        setCreditCustomerId("")
        setStaffId("")
        setBankId("")
        setCardLast4("")
        setSlipRef("")
        setSlipDate("")
        resetMixedDialog()
        setAgencyBooks([])
        setSelectedAgencyId(null)
        setReferredDoctorId(null)
        setReferredAgencyId(null)
        setReferredStaffId(null)
        setForcedApptInput("")
        setForceApptAck(false)
        setForcedBookingExpanded(false)
        toast({
          title: "Booking saved",
          description: "The booking was created successfully.",
        })
        const newBooking = result.data as ChannelBookingRecord | undefined
        getBookingsBySession(selectedSession.id).then((res) => {
          if (res.success && res.data) {
            setBookings(res.data)
            if (newBooking?.id) {
              const selected = res.data.find((b) => b.id === newBooking.id) ?? newBooking
              setSelectedBooking(selected)
              setActiveInformationTab("booking")
            }
          }
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

  async function handleBookNow() {
    if (!selectedSession || !selectedDoctor) return
    const missingPatient = !patientName.trim() || !titleId || !sexId || !isPhoneValid
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
      if (!agencyBookId || !selectedAgencyBook) typeErrors.agency_book = true
      if (!agencyRef.trim()) typeErrors.agency_ref = true
    }
    if (isCreditCustomer && (!creditCustomerId || !selectedCreditCustomer)) typeErrors.credit_customer = true
    if (isStaff && !staffId) typeErrors.staff = true
    if (isCard) {
      const digits = cardLast4.replace(/\D/g, "")
      if (digits.length !== 4) typeErrors.card = true
      if (!bankId || !selectedBank) typeErrors.bank = true
    }
    if (isSlip) {
      if (!slipRef.trim()) typeErrors.slip_ref = true
      if (!slipDate.trim()) typeErrors.slip_date = true
      if (!bankId || !selectedBank) typeErrors.bank = true
    }
    if (isEWallet && !ewalletRef.trim()) typeErrors.ewallet_ref = true
    if (isVoucherScheme && !voucherCode.trim()) {
      setInvalidFields((prev) => ({ ...prev, voucher_code: true }))
      toast({
        title: "Voucher required",
        description: "Please enter the voucher code for this discount scheme.",
        variant: "destructive",
      })
      return
    }
    if (Object.keys(typeErrors).length > 0) {
      setInvalidFields(typeErrors)
      toast({
        title: "Booking type required",
        description: isAgent
          ? "Please select Agency, select a Book, and enter REF NO. (2 digits)."
          : isCreditCustomer
            ? "Please select Credit Customer."
            : isStaff
              ? "Please select Staff Member."
              : isCard
                ? "Please enter Last 4 Digits and select Bank."
                : isEWallet
                  ? "Please enter E-wallet reference."
                  : "Please enter Bank Reference, Slip Date, and select Bank.",
        variant: "destructive",
      })
      return
    }
    setInvalidFields({})
    if (isMixed) {
      setMixedDialogOpen(true)
      return
    }
    await submitBooking()
  }

  const mixedTotal = mixedLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  const mixedRemaining = amountToPay - mixedTotal

  async function handleMixedPayNow() {
    const lines = mixedLines
      .map((line) => ({
        payment_method: line.payment_method,
        amount: Math.round((Number(line.amount) || 0) * 100) / 100,
        bank: line.bank_id
          ? { id: line.bank_id, name: banks.find((b) => b.id === line.bank_id)?.name }
          : null,
        card: line.card.trim() || undefined,
        slip_ref: line.slip_ref.trim() || undefined,
        slip_date: line.slip_date.trim() || undefined,
        ewallet_ref: line.ewallet_ref.trim() || undefined,
      }))
    if (lines.length < 2) {
      toast({
        title: "Mixed payment lines required",
        description: "Please add at least two payment lines.",
        variant: "destructive",
      })
      return
    }
    const invalidIdx = lines.findIndex((line) => line.amount <= 0)
    if (invalidIdx >= 0) {
      toast({
        title: "Amount required",
        description: `Mixed payment line ${invalidIdx + 1} must be greater than 0.00.`,
        variant: "destructive",
      })
      return
    }
    if (Math.abs(mixedRemaining) > 0.0001) {
      toast({
        title: "Amount mismatch",
        description: "Payment line total must match the full payable amount.",
        variant: "destructive",
      })
      return
    }
    for (const [idx, line] of lines.entries()) {
      if (line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD) {
        if (!line.bank?.id) {
          toast({
            title: "Bank required",
            description: `Please select a bank for mixed payment line ${idx + 1} (Credit Card).`,
            variant: "destructive",
          })
          return
        }
        if (!/^\d{4}$/.test(line.card ?? "")) {
          toast({
            title: "Card reference required",
            description: `Please enter exactly 4 digits for card reference on mixed payment line ${idx + 1}.`,
            variant: "destructive",
          })
          return
        }
      }
      if (line.payment_method === SAVE_PAYMENT_TYPE_SLIP) {
        if (!line.bank?.id) {
          toast({
            title: "Bank required",
            description: `Please select a bank for mixed payment line ${idx + 1} (Slip).`,
            variant: "destructive",
          })
          return
        }
        if (!line.slip_ref?.trim()) {
          toast({
            title: "Slip reference required",
            description: `Please enter slip reference for mixed payment line ${idx + 1}.`,
            variant: "destructive",
          })
          return
        }
        if (!line.slip_date?.trim()) {
          toast({
            title: "Slip date required",
            description: `Please enter slip date for mixed payment line ${idx + 1}.`,
            variant: "destructive",
          })
          return
        }
      }
      if (line.payment_method === SAVE_PAYMENT_TYPE_E_WALLET && !line.ewallet_ref?.trim()) {
        toast({
          title: "E-wallet reference required",
          description: `Please enter e-wallet reference for mixed payment line ${idx + 1}.`,
          variant: "destructive",
        })
        return
      }
    }
    await submitBooking(lines)
  }

  if (hasSession && selectedSession?.status === 0) {
    const reason = selectedSession?.doctorLeaveRemark?.trim() || "this reason"
    const createdAt = selectedSession?.doctorLeaveCreatedAt
      ? new Date(selectedSession.doctorLeaveCreatedAt * 1000)
      : null
    const createdBy = selectedSession?.doctorLeaveCreator?.trim() || null
    return (
      <div className="rounded-md border border-border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 p-4 text-center space-y-1">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">Doctor on leave</p>
        <p className="text-xs text-muted-foreground">Due to {reason}.</p>
        {(createdAt || createdBy) && (
          <p className="text-xs text-muted-foreground pt-1 border-t border-red-200/50 dark:border-red-900/30 mt-2">
            {createdAt && createdBy && `Leave created on ${createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} by ${createdBy}.`}
            {createdAt && !createdBy && `Leave created on ${createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`}
            {!createdAt && createdBy && `Leave created by ${createdBy}.`}
          </p>
        )}
      </div>
    )
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
          <div
            className="relative flex w-full"
            key={`discount-scheme-${paymentMethodId}-${selectedSession?.id ?? ""}-${selectedDoctor?.id ?? ""}-${formResetKey}`}
          >
            <Select
              value={discountSchemeId || undefined}
              onValueChange={(v) => {
                setDiscountSchemeId(v)
                setVoucherCode("")
                setVoucherValid(null)
                setVoucherValidationMessage("")
              }}
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
                  setVoucherCode("")
                  setVoucherValid(null)
                  setVoucherValidationMessage("")
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Voucher code input: shown when selected discount scheme is voucher-based */}
      {isVoucherScheme && (
        <div className="space-y-1 rounded-md border border-border bg-muted/20 p-2">
          <label className="text-xs font-medium text-foreground">
            Voucher code <span className="text-red-500">*</span>
          </label>
          <p className="text-[11px] text-muted-foreground">
            This scheme requires a voucher. Enter your code below.
          </p>
          <div className="flex gap-2 items-center">
            <Input
              className={cn(
                fieldClass,
                "flex-1 min-w-0",
                voucherError && errorClass,
                voucherValid === true && "border-green-600 focus-visible:ring-green-600"
              )}
              placeholder="Enter voucher code"
              value={voucherCode}
              onChange={(e) => {
                setVoucherCode(e.target.value.trim().toUpperCase())
                setVoucherValid(null)
                setVoucherValidationMessage("")
              }}
              onBlur={async () => {
                const code = voucherCode.trim()
                if (!code || !discountSchemeId) {
                  setVoucherValid(null)
                  setVoucherValidationMessage("")
                  return
                }
                setVoucherValidating(true)
                setVoucherValid(null)
                setVoucherValidationMessage("")
                try {
                  const res = await validateVoucherAction(discountSchemeId, code)
                  if (res.success && "valid" in res) {
                    setVoucherValid(res.valid)
                    if (!res.valid && res.message) setVoucherValidationMessage(res.message)
                  }
                } finally {
                  setVoucherValidating(false)
                }
              }}
            />
            {voucherValidating && (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            )}
            {voucherValid === true && !voucherValidating && (
              <Check className="h-4 w-4 shrink-0 text-green-600" />
            )}
          </div>
          {voucherValid === false && voucherCode.trim() && (
            <p className="text-xs text-red-600">
              {voucherValidationMessage || "Invalid or inactive voucher code."}
            </p>
          )}
        </div>
      )}

      {/* Row 2: Booking-type–specific fields (Agent / Staff / Card / Slip) */}
      {isAgent && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <div className="space-y-0.5">
            <Select
              value={agencyId || undefined}
              onValueChange={(v) => {
                setAgencyId(v ?? "")
                setAgencyBookId("")
                setAgencyRef("")
                setSelectedAgencyId(v ?? null)
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
                    {a.code ? `${a.name} (${a.code})` : a.name}
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
                className={`${fieldClass} ${agencyBookError ? errorClass : ""} ${!agencyBookId ? "text-placeholder" : ""}`}
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
              placeholder="REF NO. (01–99)"
              value={agencyRef}
              maxLength={2}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 2)
                setAgencyRef(digits)
              }}
              onBlur={() => {
                setAgencyRef((prev) => (prev.length === 1 ? "0" + prev : prev))
              }}
            />
          </div>
        </div>
      )}
      {isCreditCustomer && (
        <div className="space-y-0.5">
          <Select
            value={creditCustomerId || undefined}
            onValueChange={setCreditCustomerId}
          >
            <SelectTrigger
              className={`${fieldClass} ${creditCustomerError ? errorClass : ""} ${!creditCustomerId ? "text-placeholder" : ""}`}
            >
              <SelectValue placeholder="Select Credit Customer" />
            </SelectTrigger>
            <SelectContent>
              {creditCustomers.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.code ? `${c.name} (${c.code})` : c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="grid grid-cols-3 gap-x-3">
          <div className="space-y-0.5">
            <p className="text-[10px] leading-tight text-muted-foreground">Bank reference *</p>
            <Input
              className={`${fieldClass} ${slipRefError ? errorClass : ""}`}
              placeholder="Bank Reference"
              value={slipRef}
              onChange={(e) => setSlipRef(e.target.value)}
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] leading-tight text-muted-foreground">Slip date *</p>
            <Input
              type="date"
              className={`${fieldClass} text-foreground ${slipDateError ? errorClass : ""} ${!slipDate ? "text-muted-foreground" : ""}`}
              value={slipDate}
              onChange={(e) => setSlipDate(e.target.value)}
              aria-label="Slip date"
              required
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] leading-tight text-muted-foreground">Bank *</p>
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
      {isEWallet && (
        <div className="space-y-0.5">
          <Input
            className={`${fieldClass} ${ewalletRefError ? errorClass : ""}`}
            placeholder="E-wallet reference *"
            value={ewalletRef}
            onChange={(e) => setEwalletRef(e.target.value)}
            required
          />
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

      {/* HMIS link badge (above title/name row) */}
      {hmisPatientId && (
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-medium text-red-600 dark:text-red-400">
            HMIS #{hmisPatientId}
            {hmisMrn ? ` · MRN ${hmisMrn}` : ""}
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-destructive"
            title="Remove HMIS link"
            onClick={() => {
              setHmisPatientId(null)
              setHmisMrn(null)
            }}
          >
            <X className="h-3 w-3" />
            Remove
          </button>
        </div>
      )}

      {/* Row 3: Title (small) | Patient Name (rest) | Search HMIS */}
      <div className="flex gap-2 items-stretch">
        <div
          className="space-y-0.5"
          key={`title-${formResetKey}-${selectedSession?.id ?? ""}-${selectedDoctor?.id ?? ""}`}
        >
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
              onChange={(e) => {
                setPatientName(e.target.value.toUpperCase())
                if (hmisPatientId) {
                  setHmisPatientId(null)
                  setHmisMrn(null)
                }
              }}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1 px-2 text-xs"
          title="Search HMIS patient"
          onClick={() => setHmisSearchOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search Patient</span>
        </Button>
      </div>
      <HmisPatientSearchDialog
        open={hmisSearchOpen}
        onOpenChange={setHmisSearchOpen}
        onSelect={applyHmisPatient}
      />

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

      {hasSession && selectedSession && hasBlockedAppointmentNumbers && (
        <div className="pt-2 border-t border-border/50 text-xs">
          <button
            type="button"
            onClick={() => setForcedBookingExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-md py-1.5 text-left hover:bg-muted/50"
            aria-expanded={forcedBookingExpanded}
          >
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium text-foreground">Forced appointment (optional)</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {canForcedBooking
                  ? "Expand to add a booking to a blocked number."
                  : "Your role needs the Forced bookings permission to book into blocked slots."}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                forcedBookingExpanded && "rotate-180"
              )}
              aria-hidden
            />
          </button>
          {forcedBookingExpanded && (
            <div className="flex flex-wrap items-end gap-3 pt-2">
              {canForcedBooking && (
                <label className="flex items-center gap-2 cursor-pointer max-w-[14rem] leading-tight">
                  <Checkbox
                    checked={forceApptAck}
                    onCheckedChange={(c) => {
                      const checked = c === true
                      setForceApptAck(checked)
                      if (!checked) setForcedApptInput("")
                    }}
                    disabled={saving}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span className="text-muted-foreground">
                    Confirm forced booking (blocked number).
                  </span>
                </label>
              )}
              <div className="flex flex-col gap-0.5 min-w-[8rem]">
                <span className="text-muted-foreground">Appointment #</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  className={cn(fieldClass, "w-28")}
                  placeholder={`${selectedSession.startingPatientNumber}–${selectedSession.maxPatientNumber}`}
                  value={forcedApptInput}
                  onChange={(e) => setForcedApptInput(e.target.value)}
                  disabled={saving || !canForcedBooking || !forceApptAck}
                  min={selectedSession.startingPatientNumber}
                  max={selectedSession.maxPatientNumber}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex flex-col gap-0.5 text-xs min-w-0">
          {discountDivision.hospitalFeeDiscount > 0 && (
            <span className="font-medium text-red-600">
              {formatCategoryDiscountLabel(
                "hospital",
                discountDivision.hospitalFeeDiscount,
                formatLKR
              )}
            </span>
          )}
          {discountDivision.professionalFeeDiscount > 0 && (
            <span className="font-medium text-red-600">
              {formatCategoryDiscountLabel(
                "doctor",
                discountDivision.professionalFeeDiscount,
                formatLKR
              )}
            </span>
          )}
          {firstAutoDiscount && (
            <span className="text-muted-foreground">
              Auto: {firstAutoDiscount.name}
            </span>
          )}
          {discountCapExceededMessage && (
            <span className="text-destructive font-medium">{discountCapExceededMessage}</span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={
            !hasSession ||
            saving ||
            !!discountCapExceededMessage ||
            !patientName.trim() ||
            !titleId ||
            !sexId ||
            !isPhoneValid ||
            !selectedArea ||
            (isVoucherScheme && !voucherCode.trim()) ||
            (isAgent && (!agencyId || !agencyBookId || !agencyRef.trim())) ||
            (isStaff && !staffId) ||
            (isCard && (cardLast4.replace(/\D/g, "").length !== 4 || !bankId)) ||
            (isSlip && (!slipRef.trim() || !slipDate.trim() || !bankId)) ||
            (isEWallet && !ewalletRef.trim())
          }
          onClick={handleBookNow}
          className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 text-xs shrink-0 gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? (
            <>
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving…
            </>
          ) : (
            <>
              <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
              Book Now ( Rs.{formatLKR(amountToPay)} )
            </>
          )}
        </Button>
      </div>

      <Dialog
        open={mixedDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetMixedDialog()
            return
          }
          setMixedDialogOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mixed Payment Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {mixedLines.map((line, idx) => (
              <div key={`mixed-line-${idx}`} className="relative space-y-2 rounded-md border border-border/50 p-2 pr-12">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Payment Method</p>
                      <Select
                        value={String(line.payment_method)}
                        onValueChange={(v) =>
                          setMixedLines((prev) =>
                            prev.map((row, rowIdx) =>
                              rowIdx === idx
                                ? { ...row, payment_method: Number(v), card: "", slip_ref: "", slip_date: "", ewallet_ref: "" }
                                : row
                            )
                          )
                        }
                      >
                        <SelectTrigger className={fieldClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0" className="text-xs">Cash</SelectItem>
                          <SelectItem value="1" className="text-xs">Credit Card</SelectItem>
                          <SelectItem value="2" className="text-xs">Slip</SelectItem>
                          <SelectItem value="6" className="text-xs">E-Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-foreground text-right">Amount</p>
                      <Input
                        className={`${fieldClass} font-semibold bg-amber-50/60 border-amber-300 focus-visible:ring-amber-500 text-right tabular-nums`}
                        type="text"
                        inputMode="decimal"
                        value={line.amount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d.]/g, "")
                          if (/^\d*(\.\d{0,2})?$/.test(value)) {
                            setMixedLines((prev) =>
                              prev.map((row, rowIdx) =>
                                rowIdx === idx ? { ...row, amount: value } : row
                              )
                            )
                          }
                        }}
                        onFocus={() =>
                          setMixedLines((prev) =>
                            prev.map((row, rowIdx) => {
                              if (rowIdx !== idx) return row
                              if (/^\d+$/.test(row.amount)) {
                                return { ...row, amount: Number(row.amount).toFixed(2) }
                              }
                              return row
                            })
                          )
                        }
                        onBlur={() =>
                          setMixedLines((prev) =>
                            prev.map((row, rowIdx) => {
                              if (rowIdx !== idx) return row
                              const num = Number(row.amount)
                              if (!Number.isFinite(num)) return { ...row, amount: "" }
                              return { ...row, amount: num.toFixed(2) }
                            })
                          )
                        }
                      />
                    </div>
                </div>
                {(line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD ||
                  line.payment_method === SAVE_PAYMENT_TYPE_SLIP) && (
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Bank</p>
                      <Select
                        value={line.bank_id || undefined}
                        onValueChange={(v) =>
                          setMixedLines((prev) =>
                            prev.map((row, rowIdx) =>
                              rowIdx === idx ? { ...row, bank_id: v } : row
                            )
                          )
                        }
                      >
                        <SelectTrigger className={fieldClass}>
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
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground text-right">
                        {line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD
                          ? "Card Ref / Last 4"
                          : "Slip Reference"}
                      </p>
                      {line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD ? (
                        <Input
                          className={fieldClass}
                          placeholder="Card reference / last 4"
                          value={line.card}
                          inputMode="numeric"
                          maxLength={4}
                          onChange={(e) =>
                            setMixedLines((prev) =>
                              prev.map((row, rowIdx) =>
                                rowIdx === idx
                                  ? { ...row, card: e.target.value.replace(/\D/g, "").slice(0, 4) }
                                  : row
                              )
                            )
                          }
                        />
                      ) : (
                        <Input
                          className={fieldClass}
                          placeholder="Slip reference"
                          value={line.slip_ref}
                          onChange={(e) =>
                            setMixedLines((prev) =>
                              prev.map((row, rowIdx) =>
                                rowIdx === idx ? { ...row, slip_ref: e.target.value } : row
                              )
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                )}
                {line.payment_method === SAVE_PAYMENT_TYPE_SLIP && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      Slip date <span className="text-destructive">*</span>
                    </p>
                    <Input
                      type="date"
                      className={`${fieldClass} text-foreground ${!line.slip_date ? "text-muted-foreground" : ""}`}
                      value={line.slip_date}
                      onChange={(e) =>
                        setMixedLines((prev) =>
                          prev.map((row, rowIdx) =>
                            rowIdx === idx ? { ...row, slip_date: e.target.value } : row
                          )
                        )
                      }
                      required
                    />
                  </div>
                )}
                {line.payment_method === SAVE_PAYMENT_TYPE_E_WALLET && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      E-wallet reference <span className="text-destructive">*</span>
                    </p>
                    <Input
                      className={fieldClass}
                      placeholder="E-wallet reference"
                      required
                      value={line.ewallet_ref}
                      onChange={(e) =>
                        setMixedLines((prev) =>
                          prev.map((row, rowIdx) =>
                            rowIdx === idx ? { ...row, ewallet_ref: e.target.value } : row
                          )
                        )
                      }
                    />
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 h-8 w-8 shrink-0"
                  disabled={mixedLines.length <= 2}
                  onClick={() =>
                    setMixedLines((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                setMixedLines((prev) => [
                  ...prev,
                  { payment_method: 0, amount: "", bank_id: "", card: "", slip_ref: "", slip_date: "", ewallet_ref: "" },
                ])
              }
            >
              Add payment line
            </Button>
            <div className="rounded-md border border-border/60 p-2 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payable</span>
                <span>{formatLKR(amountToPay)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Entered</span>
                <span>{formatLKR(mixedTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className={Math.abs(mixedRemaining) < 0.0001 ? "text-green-600" : "text-red-600"}>
                  {formatLKR(mixedRemaining)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetMixedDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleMixedPayNow}
              disabled={saving || Math.abs(mixedRemaining) > 0.0001}
            >
              Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
