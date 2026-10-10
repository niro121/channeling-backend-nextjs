import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export type UatResultsByTester = Record<
  string,
  {
    results: Record<string, { status: string; comment: string | null }>
    sectionComplete: Record<string, boolean>
  }
>

export async function GET() {
  try {
    const [caseResults, sectionCompletes] = await Promise.all([
      prisma.uatCaseResult.findMany(),
      prisma.uatSectionComplete.findMany(),
    ])

    const byTester: UatResultsByTester = {}

    for (const row of caseResults) {
      if (!byTester[row.testerName]) {
        byTester[row.testerName] = { results: {}, sectionComplete: {} }
      }
      byTester[row.testerName].results[row.testCaseId] = {
        status: row.status,
        comment: row.comment,
      }
    }

    for (const row of sectionCompletes) {
      if (!byTester[row.testerName]) {
        byTester[row.testerName] = { results: {}, sectionComplete: {} }
      }
      byTester[row.testerName].sectionComplete[row.feature] = true
    }

    return NextResponse.json({ byTester }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    })
  } catch (err) {
    console.error("UAT results GET error:", err)
    return NextResponse.json(
      { error: "Failed to load UAT results" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testerName, testCaseId, status, comment } = body as {
      testerName?: string
      testCaseId?: string
      status?: string
      comment?: string | null
    }

    if (!testerName || !testCaseId) {
      return NextResponse.json(
        { error: "testerName and testCaseId are required" },
        { status: 400 }
      )
    }

    if (status === "" || status == null) {
      await prisma.uatCaseResult.deleteMany({
        where: { testerName, testCaseId },
      })
      return NextResponse.json({ success: true })
    }

    await prisma.uatCaseResult.upsert({
      where: {
        testerName_testCaseId: { testerName, testCaseId },
      },
      create: {
        testerName,
        testCaseId,
        status: status === "pass" || status === "fail" ? status : "pass",
        comment: comment ?? null,
      },
      update: {
        status: status === "pass" || status === "fail" ? status : "pass",
        comment: comment ?? null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("UAT results POST error:", err)
    return NextResponse.json(
      { error: "Failed to save UAT result" },
      { status: 500 }
    )
  }
}
