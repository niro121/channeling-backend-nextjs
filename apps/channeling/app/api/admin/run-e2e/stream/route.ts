import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userTypes } from "@/lib/roles";
import prisma from "@/lib/prisma";
import { spawn } from "child_process";

const E2E_RUN_ENABLED = process.env.E2E_RUN_FROM_APP === "true" || process.env.E2E_RUN_FROM_APP === "1";

type StepConfig = {
  paymentMethods?: string[];
  bookingExtras?: Record<string, string>;
  patientName?: string;
  doctorSearch?: string;
  doctorSelect?: string;
  sessionIndex?: number;
  sessionButtonText?: string;
  appointmentNo?: string;
};
type StepToRun = { type: string; config: StepConfig };

/** Run the full scenario in one Playwright run (one browser): login once, then run all steps in order. */
function runScenario(
  stepsToRun: StepToRun[],
  projectRoot: string,
  push: (text: string) => void
): Promise<number> {
  return new Promise((resolve) => {
    const runEnv: NodeJS.ProcessEnv = {
      ...process.env,
      CI: "1",
      ...(process.env.E2E_USER_EMAIL && { E2E_USER_EMAIL: process.env.E2E_USER_EMAIL }),
      ...(process.env.E2E_USER_PASSWORD && { E2E_USER_PASSWORD: process.env.E2E_USER_PASSWORD }),
      E2E_STEPS: JSON.stringify(stepsToRun),
    };
    const args = ["playwright", "test", "channel-booking-scenario", "--reporter=line"];
    const child = spawn("npx", args, {
      cwd: projectRoot,
      env: runEnv,
      shell: true,
    });
    child.stdout?.on("data", (data) => push(data.toString()));
    child.stderr?.on("data", (data) => push(data.toString()));
    child.on("close", (code, signal) => resolve(signal ? 1 : code ?? 1));
  });
}

export async function POST(request: Request) {
  if (!E2E_RUN_ENABLED) {
    return NextResponse.json(
      { error: "E2E test runner is disabled. Set E2E_RUN_FROM_APP=true to enable." },
      { status: 403 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userType = (session.user as { userType?: number }).userType;
  if (userType !== userTypes.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let scenarioId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    scenarioId = typeof body.scenarioId === "string" ? body.scenarioId.trim() || null : null;
  } catch {
    //
  }
  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  const scenario = await prisma.e2EScenario.findUnique({
    where: { id: scenarioId },
    include: { steps: true },
  });
  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const stepsOrdered = scenario.steps.sort((a, b) => a.order - b.order);
  const stepsToRun: StepToRun[] =
    stepsOrdered.length > 0
      ? stepsOrdered.map((st) => ({
          type: st.type,
          config: JSON.parse(st.config) as StepToRun["config"],
        }))
      : [
          {
            type: "booking",
            config: {
              paymentMethods: scenario.paymentMethods ? (JSON.parse(scenario.paymentMethods) as string[]) : ["CASH"],
              bookingExtras: scenario.bookingExtras ? (JSON.parse(scenario.bookingExtras) as Record<string, string>) : {},
            },
          },
        ];

  const projectRoot = process.cwd();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const push = (text: string) => controller.enqueue(encoder.encode(text));
      let overallExit = 0;
      try {
        push(`Running scenario: ${scenario.name}\n`);
        push(`${stepsToRun.length} step(s) in one run (login once, no restart).\n\n`);

        overallExit = await runScenario(stepsToRun, projectRoot, push);

        push(`\n--- Scenario ${overallExit === 0 ? "passed" : "failed"} (exit ${overallExit}) ---\n`);
      } catch (e) {
        push(`\nError: ${e instanceof Error ? e.message : String(e)}\n`);
        overallExit = 1;
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Transfer-Encoding": "chunked",
    },
  });
}
