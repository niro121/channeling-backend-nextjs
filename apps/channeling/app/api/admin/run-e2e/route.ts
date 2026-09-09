import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userTypes } from "@/lib/roles";
import { spawn } from "child_process";

const E2E_RUN_ENABLED = process.env.E2E_RUN_FROM_APP === "true" || process.env.E2E_RUN_FROM_APP === "1";
const E2E_USER_EMAIL = "developer@archmage.lk";
const E2E_USER_PASSWORD = "Arch321#";

export async function POST(request: Request) {
  try {
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

    let patientName: string | undefined;
    let patientPhone: string | undefined;
    let paymentMethods: string[] | undefined;
    let bookingExtras: Record<string, string> | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      if (body && typeof body === "object") {
        patientName = typeof body.patientName === "string" ? body.patientName.trim() || undefined : undefined;
        patientPhone = typeof body.patientPhone === "string" ? body.patientPhone.trim() || undefined : undefined;
        if (Array.isArray(body.paymentMethods) && body.paymentMethods.length > 0) {
          paymentMethods = body.paymentMethods.filter((m: unknown) => typeof m === "string" && m.trim()).map((m: string) => m.trim());
        }
        if (body.bookingExtras && typeof body.bookingExtras === "object" && !Array.isArray(body.bookingExtras)) {
          const extras: Record<string, string> = {};
          for (const [k, v] of Object.entries(body.bookingExtras)) {
            if (typeof v === "string" && v.trim()) extras[k] = v.trim();
          }
          if (Object.keys(extras).length > 0) bookingExtras = extras;
        }
      }
    } catch {
      // no body or invalid JSON
    }

    const projectRoot = process.cwd();
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const runEnv: NodeJS.ProcessEnv = {
      ...process.env,
      CI: "1",
      E2E_USER_EMAIL,
      E2E_USER_PASSWORD,
      ...(patientName !== undefined && { E2E_PATIENT_NAME: patientName }),
      ...(patientPhone !== undefined && { E2E_PATIENT_PHONE: patientPhone }),
      ...(paymentMethods && paymentMethods.length > 0 && { E2E_PAYMENT_METHODS: paymentMethods.join(",") }),
      ...(bookingExtras && Object.keys(bookingExtras).length > 0 && { E2E_BOOKING_EXTRAS: JSON.stringify(bookingExtras) }),
    };

    const args = ["playwright", "test", "cash-booking-recorded", "--reporter=line"];
    const child = spawn("npx", args, {
      cwd: projectRoot,
      env: runEnv,
      shell: true,
    });

    child.stdout?.on("data", (data) => stdoutChunks.push(data.toString()));
    child.stderr?.on("data", (data) => stderrChunks.push(data.toString()));

    const exitCode = await new Promise<number>((resolve) => {
      child.on("close", (code, signal) => resolve(signal ? 1 : code ?? 1));
    });

    const stdout = stdoutChunks.join("");
    const stderr = stderrChunks.join("");

    return NextResponse.json({
      success: exitCode === 0,
      exitCode,
      stdout,
      stderr,
    });
  } catch (e) {
    console.error("POST /api/admin/run-e2e error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to run E2E tests" },
      { status: 500 }
    );
  }
}
