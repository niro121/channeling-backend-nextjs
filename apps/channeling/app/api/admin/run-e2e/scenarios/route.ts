import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userTypes } from "@/lib/roles";
import prisma from "@/lib/prisma";

function scenarioToJson(s: {
  id: string;
  name: string;
  paymentMethods: string | null;
  bookingExtras: string | null;
  createdAt: Date;
  updatedAt: Date;
  steps?: { id: string; order: number; type: string; config: string }[];
}) {
  const steps = (s.steps ?? [])
    .sort((a, b) => a.order - b.order)
    .map((st) => ({
      id: st.id,
      order: st.order,
      type: st.type,
      config: JSON.parse(st.config) as Record<string, unknown>,
    }));
  const hasSteps = steps.length > 0;
  return {
    id: s.id,
    name: s.name,
    paymentMethods: hasSteps ? undefined : (s.paymentMethods ? (JSON.parse(s.paymentMethods) as string[]) : ["CASH"]),
    bookingExtras: hasSteps ? undefined : (s.bookingExtras ? (JSON.parse(s.bookingExtras) as Record<string, string>) : {}),
    steps: hasSteps ? steps : undefined,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userType = (session.user as { userType?: number }).userType;
    if (userType !== userTypes.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const list = await prisma.e2EScenario.findMany({
      orderBy: { updatedAt: "desc" },
      include: { steps: true },
    });

    const scenarios = list.map((s) => scenarioToJson(s));
    return NextResponse.json(scenarios);
  } catch (e) {
    console.error("GET /api/admin/run-e2e/scenarios error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list scenarios" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userType = (session.user as { userType?: number }).userType;
    if (userType !== userTypes.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const stepsInput = Array.isArray(body.steps) ? body.steps : [];
    const hasSteps = stepsInput.length > 0;

    if (hasSteps) {
      const created = await prisma.e2EScenario.create({
        data: {
          name,
          steps: {
            create: stepsInput.map((st: { type?: string; config?: Record<string, unknown> }, i: number) => ({
              order: i,
              type: typeof st.type === "string" && st.type.trim() ? st.type.trim() : "booking",
              config: JSON.stringify(st.config && typeof st.config === "object" ? st.config : {}),
            })),
          },
        },
        include: { steps: true },
      });
      return NextResponse.json(scenarioToJson(created));
    }

    const paymentMethods = Array.isArray(body.paymentMethods)
      ? body.paymentMethods.filter((m: unknown) => typeof m === "string" && (m as string).trim()).map((m: string) => m.trim())
      : ["CASH"];
    const bookingExtras =
      body.bookingExtras && typeof body.bookingExtras === "object" && !Array.isArray(body.bookingExtras)
        ? body.bookingExtras
        : {};
    const extrasRecord: Record<string, string> = {};
    for (const [k, v] of Object.entries(bookingExtras)) {
      if (typeof v === "string" && v.trim()) extrasRecord[k] = v.trim();
    }

    const created = await prisma.e2EScenario.create({
      data: {
        name,
        paymentMethods: JSON.stringify(paymentMethods),
        bookingExtras: JSON.stringify(extrasRecord),
      },
      include: { steps: true },
    });
    return NextResponse.json(scenarioToJson(created));
  } catch (e) {
    console.error("POST /api/admin/run-e2e/scenarios error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create scenario" },
      { status: 500 }
    );
  }
}
