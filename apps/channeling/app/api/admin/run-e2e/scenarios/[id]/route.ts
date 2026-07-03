import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userTypes } from "@/lib/roles";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userType = (session.user as { userType?: number }).userType;
  if (userType !== userTypes.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

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

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await context.params;
  try {
    const s = await prisma.e2EScenario.findUnique({
      where: { id },
      include: { steps: true },
    });
    if (!s) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }
    return NextResponse.json(scenarioToJson(s));
  } catch (e) {
    console.error("GET /api/admin/run-e2e/scenarios/[id] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get scenario" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await context.params;
  try {
    const existing = await prisma.e2EScenario.findUnique({
      where: { id },
      include: { steps: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : existing.name;
    const stepsInput = Array.isArray(body.steps) ? body.steps : [];
    const hasSteps = stepsInput.length > 0;

    if (hasSteps) {
      await prisma.e2EScenarioStep.deleteMany({ where: { scenarioId: id } });
      await prisma.e2EScenario.update({
        where: { id },
        data: {
          name,
          paymentMethods: null,
          bookingExtras: null,
          steps: {
            create: stepsInput.map((st: { type?: string; config?: Record<string, unknown> }, i: number) => ({
              order: i,
              type: typeof st.type === "string" && st.type.trim() ? st.type.trim() : "booking",
              config: JSON.stringify(st.config && typeof st.config === "object" ? st.config : {}),
            })),
          },
        },
      });
    } else {
      const paymentMethods = Array.isArray(body.paymentMethods)
        ? body.paymentMethods.filter((m: unknown) => typeof m === "string" && (m as string).trim()).map((m: string) => m.trim())
        : (existing.paymentMethods ? (JSON.parse(existing.paymentMethods) as string[]) : ["CASH"]);
      const bookingExtras =
        body.bookingExtras && typeof body.bookingExtras === "object" && !Array.isArray(body.bookingExtras)
          ? body.bookingExtras
          : (existing.bookingExtras ? (JSON.parse(existing.bookingExtras) as Record<string, string>) : {});
      const extrasRecord: Record<string, string> = {};
      for (const [k, v] of Object.entries(bookingExtras)) {
        if (typeof v === "string" && v.trim()) extrasRecord[k] = v.trim();
      }
      await prisma.e2EScenarioStep.deleteMany({ where: { scenarioId: id } });
      await prisma.e2EScenario.update({
        where: { id },
        data: {
          name,
          paymentMethods: JSON.stringify(paymentMethods.length ? paymentMethods : ["CASH"]),
          bookingExtras: JSON.stringify(extrasRecord),
        },
      });
    }

    const updated = await prisma.e2EScenario.findUnique({
      where: { id },
      include: { steps: true },
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(scenarioToJson(updated));
  } catch (e) {
    console.error("PATCH /api/admin/run-e2e/scenarios/[id] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update scenario" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await context.params;
  try {
    await prisma.e2EScenario.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/run-e2e/scenarios/[id] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete scenario" },
      { status: 500 }
    );
  }
}
