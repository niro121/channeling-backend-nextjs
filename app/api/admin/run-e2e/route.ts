import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userTypes } from "@/lib/roles";
import { spawn } from "child_process";

const E2E_RUN_ENABLED = process.env.E2E_RUN_FROM_APP === "true" || process.env.E2E_RUN_FROM_APP === "1";

export async function POST() {
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

    const projectRoot = process.cwd();
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const child = spawn("npx", ["playwright", "test", "--reporter=line"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        CI: "1",
        ...(process.env.E2E_USER_EMAIL && { E2E_USER_EMAIL: process.env.E2E_USER_EMAIL }),
        ...(process.env.E2E_USER_PASSWORD && { E2E_USER_PASSWORD: process.env.E2E_USER_PASSWORD }),
      },
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
