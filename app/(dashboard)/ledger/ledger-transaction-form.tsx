"use client"

import React, { useRef, useState } from "react"
import { Form, Formik, FormikHelpers } from "formik"
import * as Yup from "yup"
import { useToast } from "@/components/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReferenceSelect } from "@/components/common/reference-select"
import type { ReferenceSelectOption } from "@/types/reference"
import { addLedgerTransaction } from "@/app/actions/ledger/add-ledger-transaction.action"
import {
  LEDGER_TRANSACTION_TYPES,
  type LedgerTransactionType,
} from "@/services/ledger/create-ledger-receipt.service"
import { RECEIPT_PAYMENT_METHOD } from "@/types/receipt"

const AGENCY_TYPES_FOR_VALIDATION: string[] = [
  "AGENCY_DEBIT_NOTE",
  "AGENCY_CREDIT_NOTE",
  "AGENCY_DEPOSIT",
  "AGENCY_WITHDRAW",
]

type LedgerFormValues = {
  transactionType: LedgerTransactionType
  branchId: string
  agencyId: string
  amount: string
  remarks: string
  paymentMethod: number
  bankId: string
  cardReference: string
  slipReference: string
}

const validationSchema = Yup.object({
  transactionType: Yup.string()
    .oneOf(LEDGER_TRANSACTION_TYPES as unknown as string[])
    .required("Transaction type is required"),
  branchId: Yup.string().when("transactionType", {
    is: (type: string) => !AGENCY_TYPES_FOR_VALIDATION.includes(type),
    then: (schema) => schema.required("Please select a branch."),
    otherwise: (schema) => schema,
  }),
  agencyId: Yup.string().when("transactionType", {
    is: (type: string) => AGENCY_TYPES_FOR_VALIDATION.includes(type),
    then: (schema) => schema.required("Please select an agency."),
    otherwise: (schema) => schema,
  }),
  amount: Yup.string()
    .required("Amount is required")
    .test("positive", "Enter a valid positive amount.", (val) => {
      if (!val?.trim()) return false
      const n = parseFloat(val)
      return !Number.isNaN(n) && n > 0
    }),
  remarks: Yup.string().required("Remarks are required").trim(),
  paymentMethod: Yup.number().required(),
  bankId: Yup.string().when(["transactionType", "paymentMethod"], {
    is: (transactionType: string, paymentMethod: number) =>
      transactionType === "AGENCY_DEPOSIT" &&
      paymentMethod !== RECEIPT_PAYMENT_METHOD.CASH,
    then: (schema) => schema.required("Please select a bank for Card/Slip."),
    otherwise: (schema) => schema,
  }),
  cardReference: Yup.string().when(["transactionType", "paymentMethod"], {
    is: (transactionType: string, paymentMethod: number) =>
      transactionType === "AGENCY_DEPOSIT" &&
      paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
    then: (schema) =>
      schema.test(
        "last4",
        "Enter last 4 digits of card.",
        (val) => (val?.replace(/\D/g, "") ?? "").length === 4
      ),
    otherwise: (schema) => schema,
  }),
  slipReference: Yup.string().when(["transactionType", "paymentMethod"], {
    is: (transactionType: string, paymentMethod: number) =>
      transactionType === "AGENCY_DEPOSIT" &&
      paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP,
    then: (schema) => schema.required("Enter slip reference."),
    otherwise: (schema) => schema,
  }),
})

const TRANSACTION_TYPE_LABELS: Record<LedgerTransactionType, string> = {
  BRANCH_INCOME: "Branch Income",
  BRANCH_EXPENSE: "Branch Expense",
  AGENCY_DEBIT_NOTE: "Agency Debit Note",
  AGENCY_CREDIT_NOTE: "Agency Credit Note",
  AGENCY_DEPOSIT: "Agency Deposit",
  AGENCY_WITHDRAW: "Agency Withdraw",
}

const AGENCY_TYPES: LedgerTransactionType[] = [
  "AGENCY_DEBIT_NOTE",
  "AGENCY_CREDIT_NOTE",
  "AGENCY_DEPOSIT",
  "AGENCY_WITHDRAW",
]

const PAYMENT_OPTIONS = [
  { value: RECEIPT_PAYMENT_METHOD.CASH, label: "Cash" },
  { value: RECEIPT_PAYMENT_METHOD.CREDIT_CARD, label: "Credit Card" },
  { value: RECEIPT_PAYMENT_METHOD.SLIP, label: "Slip" },
]

/** Restrict to non-negative numbers with at most 2 decimal places. */
function formatAmountInput(value: string): string {
  let v = value.replace(/[^\d.]/g, "")
  const parts = v.split(".")
  if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("")
  if (v.includes(".")) {
    const [intPart, decPart] = v.split(".")
    v = intPart + "." + decPart.slice(0, 2)
  }
  return v
}

/** Format amount for display (always 2 decimal places when valid). */
function formatAmountDisplay(value: string): string {
  if (value === "" || value === undefined) return ""
  const num = parseFloat(value)
  if (Number.isNaN(num) || num < 0) return value
  return num.toFixed(2)
}

type BankOption = { id: string; name: string }

type LedgerTransactionFormProps = {
  locations: ReferenceSelectOption[]
  agencies: ReferenceSelectOption[]
  banks: BankOption[]
  userLocationId?: string | null
  userLocationName?: string | null
  /** Called after a transaction is successfully added (e.g. to close dialog and refresh) */
  onSuccess?: () => void
  /** If provided, called with receiptId when user submitted via "Add transaction and print" (after onSuccess). Use to open print view. */
  onSuccessWithReceiptId?: (receiptId: string) => void | Promise<void>
}

export function LedgerTransactionForm({
  locations,
  agencies,
  banks,
  userLocationId = null,
  userLocationName = null,
  onSuccess,
  onSuccessWithReceiptId,
}: LedgerTransactionFormProps) {
  const { toast } = useToast()
  const [lastReceiptNo, setLastReceiptNo] = useState<string | null>(null)
  const printAfterSubmitRef = useRef(false)

  const initialValues: LedgerFormValues = {
    transactionType: "BRANCH_INCOME",
    branchId: "",
    agencyId: "",
    amount: "",
    remarks: "",
    paymentMethod: RECEIPT_PAYMENT_METHOD.CASH,
    bankId: "",
    cardReference: "",
    slipReference: "",
  }

  async function handleSubmit(
    values: LedgerFormValues,
    { setSubmitting, setValues, setErrors, setTouched }: FormikHelpers<LedgerFormValues>
  ) {
    const isAgencyType = AGENCY_TYPES.includes(values.transactionType)
    const effectiveBranchId = isAgencyType ? (userLocationId ?? "") : values.branchId
    if (isAgencyType && !effectiveBranchId.trim()) {
      toast({
        title: "Validation",
        description: "You must have a branch assigned to record agency transactions.",
        variant: "destructive",
      })
      setSubmitting(false)
      return
    }

    const amountNum = parseFloat(values.amount)
    try {
      const result = await addLedgerTransaction({
        transactionType: values.transactionType,
        branchId: effectiveBranchId,
        agencyId: isAgencyType ? values.agencyId : null,
        amount: amountNum,
        remarks: values.remarks.trim(),
        paymentMethod: values.transactionType === "AGENCY_DEPOSIT" ? values.paymentMethod : undefined,
        bank:
          values.transactionType === "AGENCY_DEPOSIT" &&
          values.paymentMethod !== RECEIPT_PAYMENT_METHOD.CASH &&
          values.bankId
            ? banks.find((b) => b.id === values.bankId)?.name ?? ""
            : undefined,
        bankId:
          values.transactionType === "AGENCY_DEPOSIT" && values.paymentMethod !== RECEIPT_PAYMENT_METHOD.CASH
            ? values.bankId || undefined
            : undefined,
        cardReference:
          values.transactionType === "AGENCY_DEPOSIT" && values.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD
            ? values.cardReference.trim()
            : undefined,
        slipReference:
          values.transactionType === "AGENCY_DEPOSIT" && values.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP
            ? values.slipReference.trim()
            : undefined,
      })

      if (result.success) {
        setLastReceiptNo(result.receiptNoString)
        toast({
          title: "Transaction recorded",
          description: `Receipt ${result.receiptNoString} created.`,
        })
        setValues({
          ...values,
          amount: "",
          remarks: "",
          cardReference: "",
          slipReference: "",
          bankId: "",
        })
        onSuccess?.()
        if (printAfterSubmitRef.current && result.receiptId) {
          printAfterSubmitRef.current = false
          await onSuccessWithReceiptId?.(result.receiptId)
        }
        setSubmitting(false)
        return
      }

      if (result.errorCode === "VALIDATION" && result.issues && Object.keys(result.issues).length > 0) {
        const fieldErrors: Record<string, string> = {}
        for (const [key, messages] of Object.entries(result.issues)) {
          const msg = Array.isArray(messages) && messages.length > 0 ? messages[0] : undefined
          if (msg) fieldErrors[key] = msg
        }
        setErrors(fieldErrors)
        setTouched(
          Object.keys(fieldErrors).reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<string, boolean>)
        )
      }
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
      setSubmitting(false)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {(formik) => {
        const isAgencyType = AGENCY_TYPES.includes(formik.values.transactionType)
        const isAgencyDeposit = formik.values.transactionType === "AGENCY_DEPOSIT"
        const showPaymentDetails = isAgencyDeposit
        const showBank = showPaymentDetails && formik.values.paymentMethod !== RECEIPT_PAYMENT_METHOD.CASH
        const isCard = formik.values.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD
        const isSlip = formik.values.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP

        return (
          <Form className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="transactionType">Transaction type</Label>
              <Select
                value={formik.values.transactionType}
                onValueChange={(v) => formik.setFieldValue("transactionType", v)}
              >
                <SelectTrigger id="transactionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEDGER_TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRANSACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isAgencyType && (
              <div className="space-y-2">
                <Label htmlFor="branchId">Branch</Label>
                <ReferenceSelect
                  options={locations}
                  value={formik.values.branchId}
                  onChange={(v) => formik.setFieldValue("branchId", v)}
                  placeholder="Select branch"
                  label="Branch"
                  required
                  className="w-full"
                />
                {formik.errors.branchId && (
                  <p className="text-sm text-destructive">{formik.errors.branchId}</p>
                )}
              </div>
            )}

            {isAgencyType && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <p className="text-sm text-muted-foreground">
                  {userLocationId
                    ? userLocationName
                      ? `Your branch: ${userLocationName}`
                      : "Your branch will be used"
                    : "You must have a branch assigned to record agency transactions."}
                </p>
              </div>
            )}

            {isAgencyType && (
              <div className="space-y-2">
                <Label htmlFor="agencyId">Agency</Label>
                <ReferenceSelect
                  options={agencies}
                  value={formik.values.agencyId}
                  onChange={(v) => formik.setFieldValue("agencyId", v)}
                  placeholder="Select agency"
                  label="Agency"
                  required
                  className="w-full"
                />
                {formik.errors.agencyId && (
                  <p className="text-sm text-destructive">{formik.errors.agencyId}</p>
                )}
              </div>
            )}

            {showPaymentDetails && (
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select
                  value={String(formik.values.paymentMethod)}
                  onValueChange={(v) => {
                    formik.setFieldValue("paymentMethod", Number(v))
                    formik.setFieldValue("bankId", "")
                    formik.setFieldValue("cardReference", "")
                    formik.setFieldValue("slipReference", "")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showBank && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bankId">Bank</Label>
                  <Select
                    value={formik.values.bankId}
                    onValueChange={(v) => formik.setFieldValue("bankId", v)}
                  >
                    <SelectTrigger id="bankId">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formik.errors.bankId && (
                    <p className="text-sm text-destructive">{formik.errors.bankId}</p>
                  )}
                </div>
                {isCard && (
                  <div className="space-y-2">
                    <Label htmlFor="cardReference">Card (last 4 digits)</Label>
                    <Input
                      id="cardReference"
                      value={formik.values.cardReference}
                      onChange={(e) =>
                        formik.setFieldValue(
                          "cardReference",
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                      placeholder="1234"
                      maxLength={4}
                    />
                    {formik.errors.cardReference && (
                      <p className="text-sm text-destructive">{formik.errors.cardReference}</p>
                    )}
                  </div>
                )}
                {isSlip && (
                  <div className="space-y-2">
                    <Label htmlFor="slipReference">Slip reference</Label>
                    <Input
                      id="slipReference"
                      value={formik.values.slipReference}
                      onChange={(e) => formik.setFieldValue("slipReference", e.target.value)}
                      placeholder="Slip reference"
                    />
                    {formik.errors.slipReference && (
                      <p className="text-sm text-destructive">{formik.errors.slipReference}</p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (LKR)</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                value={formik.values.amount}
                onChange={(e) => formik.setFieldValue("amount", formatAmountInput(e.target.value))}
                onBlur={(e) => {
                  formik.handleBlur(e)
                  const v = formik.values.amount
                  if (v !== "") {
                    const formatted = formatAmountDisplay(v)
                    if (formatted !== v) formik.setFieldValue("amount", formatted)
                  }
                }}
                placeholder="0.00"
              />
              {formik.errors.amount && (
                <p className="text-sm text-destructive">{formik.errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks <span className="text-destructive">*</span></Label>
              <Input
                id="remarks"
                value={formik.values.remarks}
                onChange={(e) => formik.setFieldValue("remarks", e.target.value)}
                onBlur={formik.handleBlur}
                placeholder="Enter remarks"
              />
              {formik.errors.remarks && (
                <p className="text-sm text-destructive">{formik.errors.remarks}</p>
              )}
            </div>

            {lastReceiptNo && (
              <p className="text-sm text-muted-foreground">
                Last receipt: <span className="font-medium text-foreground">{lastReceiptNo}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={formik.isSubmitting}>
                {formik.isSubmitting ? "Saving…" : "Add transaction"}
              </Button>
              {onSuccessWithReceiptId && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={formik.isSubmitting}
                  onClick={() => {
                    printAfterSubmitRef.current = true
                    formik.submitForm()
                  }}
                >
                  {formik.isSubmitting ? "Saving…" : "Add transaction and print"}
                </Button>
              )}
            </div>
          </Form>
        )
      }}
    </Formik>
  )
}
