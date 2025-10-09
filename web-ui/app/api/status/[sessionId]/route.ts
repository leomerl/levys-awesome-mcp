import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

interface Task {
  id: string;
  designated_agent: string;
  dependencies: string[];
  description: string;
  files_to_modify: string[];
}

interface PlanDocument {
  task_description: string;
  synopsis: string;
  created_at: string;
  git_commit_hash: string | null;
  session_id?: string;
  tasks: Task[];
}

interface TaskProgress {
  task_id: string;
  state: "pending" | "in_progress" | "completed" | "failed";
  agent_session_id: string;
  started_at?: string;
  completed_at?: string;
  files_modified?: string[];
  summary?: string;
  failure_reason?: string;
  self_heal_attempts?: number;
  self_heal_history?: any[];
}

interface ProgressDocument {
  session_id: string;
  git_commit_hash: string | null;
  created_at: string;
  last_updated: string;
  tasks: Record<string, TaskProgress>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Look for plan and progress files in the parent project
    const projectRoot = path.resolve(process.cwd(), "..");
    const planProgressDir = path.join(projectRoot, "plan_and_progress", sessionId);

    const planPath = path.join(planProgressDir, "plan.json");
    const progressPath = path.join(planProgressDir, "progress.json");

    // Check if plan exists
    const planExists = existsSync(planPath);
    const progressExists = existsSync(progressPath);

    if (!planExists) {
      return NextResponse.json({
        status: "creating_plan",
        message: "Creating plan...",
        hasProgress: false,
      });
    }

    // Read plan file
    const planContent = await readFile(planPath, "utf-8");
    const plan: PlanDocument = JSON.parse(planContent);

    // If no progress file yet, return plan with all tasks pending
    if (!progressExists) {
      return NextResponse.json({
        status: "plan_created",
        plan: {
          taskDescription: plan.task_description,
          synopsis: plan.synopsis,
          totalTasks: plan.tasks.length,
          tasks: plan.tasks,
        },
        progress: {
          completed: 0,
          inProgress: 0,
          pending: plan.tasks.length,
          failed: 0,
          tasks: {},
        },
        hasProgress: false,
      });
    }

    // Read progress file
    const progressContent = await readFile(progressPath, "utf-8");
    const progress: ProgressDocument = JSON.parse(progressContent);

    // Calculate statistics
    const taskStates = Object.values(progress.tasks);
    const completed = taskStates.filter((t) => t.state === "completed").length;
    const inProgress = taskStates.filter((t) => t.state === "in_progress").length;
    const failed = taskStates.filter((t) => t.state === "failed").length;
    const pending = taskStates.filter((t) => t.state === "pending").length;

    return NextResponse.json({
      status: "in_progress",
      plan: {
        taskDescription: plan.task_description,
        synopsis: plan.synopsis,
        totalTasks: plan.tasks.length,
        tasks: plan.tasks,
      },
      progress: {
        completed,
        inProgress,
        pending,
        failed,
        tasks: progress.tasks,
        lastUpdated: progress.last_updated,
      },
      hasProgress: true,
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
