import { NextResponse } from "next/server"
import { getDoctorAppUserId } from "@/lib/doctor-app-auth"
import { updateDoctorAppProfileForUser } from "@/services/doctor-app/update-doctor-profile.service"

/**
 * PATCH /api/doctor-app/profile
 * Update allowed doctor profile fields for logged-in doctor user.
 */
export async function PATCH(request: Request) {
  try {
    const userId = await getDoctorAppUserId(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null
    if (!body) {
      return NextResponse.json(
        { error: "invalid_request", message: "Invalid JSON body" },
        { status: 400 }
      )
    }

    const result = await updateDoctorAppProfileForUser(userId, {
      phone: typeof body.phone === "string" || body.phone == null ? (body.phone as string | null) : undefined,
      mobile: typeof body.mobile === "string" ? body.mobile : "",
      addressLine1:
        typeof body.addressLine1 === "string" || body.addressLine1 == null
          ? (body.addressLine1 as string | null)
          : undefined,
      addressLine2:
        typeof body.addressLine2 === "string" || body.addressLine2 == null
          ? (body.addressLine2 as string | null)
          : undefined,
      city: typeof body.city === "string" || body.city == null ? (body.city as string | null) : undefined,
      registrationNumber:
        typeof body.registrationNumber === "string" || body.registrationNumber == null
          ? (body.registrationNumber as string | null)
          : undefined,
      qualification: typeof body.qualification === "string" ? body.qualification : "",
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.message ? { message: result.message } : {}),
          ...(result.issues ? { issues: result.issues } : {}),
        },
        { status: result.status }
      )
    }

    return NextResponse.json({ doctor: result.doctor })
  } catch (e) {
    console.error("doctor-app profile update error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
