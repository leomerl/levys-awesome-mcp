import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

type OrchestrationType = "sparc" | "simple";

interface OrchestrationRequest {
  type: OrchestrationType;
  task: string;
}

function generateSessionId(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: OrchestrationRequest = await request.json();
    const { type, task } = body;

    if (!task || !task.trim()) {
      return NextResponse.json(
        { error: "Task description is required" },
        { status: 400 }
      );
    }

    const agentName = type === "sparc" ? "sparc-orchestrator" : "orchestrator-agent";
    const sessionId = generateSessionId();

    // Path to the CLI wrapper script
    const projectRoot = path.resolve(process.cwd(), "..");
    const cliScript = path.join(projectRoot, "scripts", "invoke-agent-cli.js");

    // Spawn the agent via the CLI wrapper
    const agentProcess = spawn(
      "node",
      [cliScript, agentName, task],
      {
        cwd: projectRoot,
        detached: true,
        stdio: "ignore",
        env: {
          ...process.env,
          SESSION_ID: sessionId,
        },
      }
    );

    // Detach the process so it runs independently
    agentProcess.unref();

    return NextResponse.json({
      success: true,
      message: `Orchestration started with ${agentName}`,
      sessionId,
      agentName,
    });
  } catch (error) {
    console.error("Orchestration error:", error);
    return NextResponse.json(
      {
        error: "Failed to start orchestration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
