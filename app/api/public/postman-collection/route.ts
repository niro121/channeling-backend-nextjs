import { NextRequest, NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * GET /api/public/postman-collection
 * Returns the Postman collection with baseUrl set to the request origin (dynamic Next URL).
 */
export async function GET(request: NextRequest) {
  try {
    const origin = new URL(request.url).origin
    const path = join(process.cwd(), "public", "assets", "public-api.postman_collection.json")
    const raw = readFileSync(path, "utf-8")
    const collection = JSON.parse(raw) as {
      variable?: Array<{ key: string; value: string }>
      [key: string]: unknown
    }
    if (Array.isArray(collection.variable)) {
      const baseUrlVar = collection.variable.find((v) => v.key === "baseUrl")
      if (baseUrlVar) baseUrlVar.value = origin
    }
    const body = JSON.stringify(collection)
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="channeling-public-api.postman_collection.json"`,
      },
    })
  } catch (e) {
    console.error("[postman-collection]", e)
    return NextResponse.json(
      { error: "Failed to generate Postman collection" },
      { status: 500 }
    )
  }
}
