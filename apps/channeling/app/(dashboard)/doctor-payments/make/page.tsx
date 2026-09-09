import React from "react";
import { checkRouteAccess, checkPermission } from "@/lib/server-permissions";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getReferenceData } from "@/app/actions/reference/get-reference-data.action";
import { MakeDoctorPaymentClient } from "./make-doctor-payment-client";
import { fetchServerSession } from "@/lib/session";
import { BackButton } from "@/components/common/back-button";
import { RECEIPT_PAYMENT_METHOD } from "@/types/receipt";

type MakeDoctorPaymentPageProps = {
  searchParams?: Promise<{ doctorId?: string; dateFrom?: string; dateTo?: string }>;
};

const VALID_PAYMENT_METHODS = [
  RECEIPT_PAYMENT_METHOD.CASH,
  RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
  RECEIPT_PAYMENT_METHOD.SLIP,
  RECEIPT_PAYMENT_METHOD.CHECK,
  RECEIPT_PAYMENT_METHOD.AGENT,
  RECEIPT_PAYMENT_METHOD.CREDIT,
  RECEIPT_PAYMENT_METHOD.E_WALLET,
] as const;

function getWhtPercentage(): number {
  const raw = process.env.WHT_PERCENTAGE;
  if (raw == null || raw === "") return 0;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
}

function getDoctorPaymentMethodCodes(): number[] {
  const raw = process.env.DOCTOR_PAYMENT_METHODS;
  if (raw == null || String(raw).trim() === "") {
    return [RECEIPT_PAYMENT_METHOD.CASH];
  }
  const parsed = String(raw)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && VALID_PAYMENT_METHODS.includes(n as (typeof VALID_PAYMENT_METHODS)[number]));
  return parsed.length > 0 ? parsed : [RECEIPT_PAYMENT_METHOD.CASH];
}

export default async function MakeDoctorPaymentPage({ searchParams }: MakeDoctorPaymentPageProps) {
  const params = await searchParams;
  const initialDoctorId = params?.doctorId ?? null;
  const initialDateFrom = params?.dateFrom?.trim() || null;
  const initialDateTo = params?.dateTo?.trim() || null;
  const canView = await checkRouteAccess("/doctor-payments");
  if (!canView) redirect("/unauthorized-access");
  const canAdd = await checkPermission("doctor-payments", "add");
  if (!canAdd) redirect("/unauthorized-access");

  const [session, refRes] = await Promise.all([
    fetchServerSession(),
    getReferenceData({ locations: true, doctors: true, staff: true }),
  ]);
  const userId = session?.user?.id ?? null;
  let userLocationId: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userLocationId: true },
    });
    userLocationId = user?.userLocationId ?? null;
  }

  const locations = refRes.success && refRes.locations ? refRes.locations : [];
  const doctors = refRes.success && refRes.doctors ? refRes.doctors : [];
  const staff = refRes.success && refRes.staff ? refRes.staff : [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Make Doctor Payment</h2>
        <BackButton href="/doctor-payments" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <MakeDoctorPaymentClient
          locations={locations}
          doctors={doctors}
          staff={staff}
          userId={userId}
          locationId={userLocationId}
          initialDoctorId={initialDoctorId}
          initialDateFrom={initialDateFrom}
          initialDateTo={initialDateTo}
          whtPercentage={getWhtPercentage()}
          doctorPaymentMethodCodes={getDoctorPaymentMethodCodes()}
        />
      </div>
    </div>
  );
}
