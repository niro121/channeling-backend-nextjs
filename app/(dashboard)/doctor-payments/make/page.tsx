import React from "react";
import { checkRouteAccess, checkPermission } from "@/lib/server-permissions";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getReferenceData } from "@/app/actions/reference/get-reference-data.action";
import { MakeDoctorPaymentClient } from "./make-doctor-payment-client";
import { fetchServerSession } from "@/lib/session";
import { BackButton } from "@/components/common/back-button";

type MakeDoctorPaymentPageProps = {
  searchParams?: Promise<{ doctorId?: string }>;
};

export default async function MakeDoctorPaymentPage({ searchParams }: MakeDoctorPaymentPageProps) {
  const params = await searchParams;
  const initialDoctorId = params?.doctorId ?? null;
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
        />
      </div>
    </div>
  );
}
