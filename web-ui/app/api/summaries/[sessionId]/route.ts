import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

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

    // Look for summary files in the parent project
    const projectRoot = path.resolve(process.cwd(), "..");
    const reportsDir = path.join(projectRoot, "reports", sessionId);

    if (!existsSync(reportsDir)) {
      return NextResponse.json({
        summaries: [],
        count: 0,
      });
    }

    // Read all JSON files in the reports directory
    const files = await readdir(reportsDir);
    const summaryFiles = files.filter((file) => file.endsWith("-summary.json"));

    const summaries = await Promise.all(
      summaryFiles.map(async (file) => {
        const filePath = path.join(reportsDir, file);
        const content = await readFile(filePath, "utf-8");
        const data = JSON.parse(content);

        // Extract agent name from filename (e.g., "planner-agent-summary.json" -> "planner-agent")
        const agentName = file.replace("-summary.json", "");

        return {
          agentName,
          fileName: file,
          ...data,
        };
      })
    );

    // Sort summaries by timestamp if available
    summaries.sort((a, b) => {
      const timeA = a.timestamp || a.created_at || 0;
      const timeB = b.timestamp || b.created_at || 0;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });

    return NextResponse.json({
      summaries,
      count: summaries.length,
    });
  } catch (error) {
    console.error("Error fetching summaries:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch summaries",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
