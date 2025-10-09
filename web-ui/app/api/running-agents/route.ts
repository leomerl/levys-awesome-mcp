import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

interface RunningAgent {
  sessionId: string;
  agentName: string;
  startTime: Date;
  duration: number;
}

export async function GET() {
  try {
    const projectRoot = path.resolve(process.cwd(), "..");
    const outputStreamsDir = path.join(projectRoot, "output_streams");

    if (!existsSync(outputStreamsDir)) {
      return NextResponse.json({
        runningAgents: [],
        count: 0,
      });
    }

    // Read all session directories
    const sessions = await readdir(outputStreamsDir);
    const runningAgents: RunningAgent[] = [];

    // Check each session for stream.log files
    for (const sessionId of sessions) {
      const sessionDir = path.join(outputStreamsDir, sessionId);

      try {
        const sessionStat = await stat(sessionDir);

        // Skip if not a directory
        if (!sessionStat.isDirectory()) continue;

        // Check for stream.log file
        const streamLogPath = path.join(sessionDir, "stream.log");

        if (existsSync(streamLogPath)) {
          const streamStat = await stat(streamLogPath);
          const now = new Date();
          const fileAge = now.getTime() - streamStat.mtime.getTime();

          // Consider active if modified in last 30 seconds
          if (fileAge < 30000) {
            // Try to determine agent name from multiple sources
            let agentName = "Unknown Agent";

            // 1. Try to read session-metadata.json (for orchestrators started from web UI)
            const metadataPath = path.join(sessionDir, "session-metadata.json");
            if (existsSync(metadataPath)) {
              try {
                const { readFile } = await import("fs/promises");
                const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));
                agentName = metadata.agentName || metadata.agent || agentName;
              } catch {
                // Ignore metadata read errors
              }
            }

            // 2. Try to extract from stream.log if metadata doesn't exist
            if (agentName === "Unknown Agent") {
              try {
                const { readFile } = await import("fs/promises");
                const streamContent = await readFile(streamLogPath, "utf-8");

                // Look for agent name patterns in the first 2000 characters
                const head = streamContent.slice(0, 2000);

                // Pattern 1: Agent: agent-name (most common format)
                const agentLineMatch = head.match(/^Agent:\s+(.+)$/m);
                if (agentLineMatch) {
                  agentName = agentLineMatch[1].trim();
                }

                // Pattern 2: Loaded agent 'agent-name'
                if (agentName === "Unknown Agent") {
                  const loadedMatch = head.match(/Loaded agent ['"]([^'"]+)['"]/);
                  if (loadedMatch) {
                    agentName = loadedMatch[1];
                  }
                }

                // Pattern 3: Invoking agent: agent-name
                if (agentName === "Unknown Agent") {
                  const invokingMatch = head.match(/Invoking agent:\s+([^\s\n]+)/);
                  if (invokingMatch) {
                    agentName = invokingMatch[1];
                  }
                }

                // Pattern 4: Agent 'agent-name' starting
                if (agentName === "Unknown Agent") {
                  const startingMatch = head.match(/Agent ['"]([^'"]+)['"] starting/);
                  if (startingMatch) {
                    agentName = startingMatch[1];
                  }
                }
              } catch {
                // Ignore read errors
              }
            }

            runningAgents.push({
              sessionId,
              agentName,
              startTime: streamStat.birthtime,
              duration: now.getTime() - streamStat.birthtime.getTime(),
            });
          }
        }
      } catch (err) {
        // Skip sessions with errors
        continue;
      }
    }

    // Sort by start time (most recent first)
    runningAgents.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    return NextResponse.json({
      runningAgents,
      count: runningAgents.length,
    });
  } catch (error) {
    console.error("Error fetching running agents:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch running agents",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
