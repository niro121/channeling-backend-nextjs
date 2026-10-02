import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/account/profile
 * Returns the current user's profile (name, email, username, phone, userType, location, booking locations).
 * Uses session to identify the user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userLocation: { select: { id: true, name: true } },
        bookingLocations: { select: { locationId: true, location: { select: { id: true, name: true } } } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return only profile fields (no password, no 2FA secrets)
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username ?? null,
      phone: user.phone ?? null,
      userType: user.userType,
      userLocationId: user.userLocationId ?? null,
      userLocation: user.userLocation
        ? { id: user.userLocation.id, name: user.userLocation.name }
        : null,
      bookingLocations:
        user.bookingLocations?.map((b: { locationId: string; location?: { id: string; name: string } }) => ({
          locationId: b.locationId,
          location: b.location ? { id: b.location.id, name: b.location.name } : null,
        })) ?? [],
    };

    return NextResponse.json(profile);
  } catch (e) {
    console.error("account/profile error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
