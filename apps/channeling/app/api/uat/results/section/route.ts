import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testerName, feature } = body as { testerName?: string; feature?: string }

    if (!testerName || !feature) {
      return NextResponse.json(
        { error: "testerName and feature are required" },
        { status: 400 }
      )
    }

    await prisma.uatSectionComplete.upsert({
      where: {
        testerName_feature: { testerName, feature },
      },
      create: { testerName, feature },
      update: { completedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("UAT section complete POST error:", err)
    return NextResponse.json(
      { error: "Failed to save section complete" },
      { status: 500 }
    )
  }
}
