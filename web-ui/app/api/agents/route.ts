import { NextResponse } from "next/server";
import { getMCPClient } from "@/lib/mcp-client";

export async function GET() {
  try {
    const mcpClient = getMCPClient();
    const agents = await mcpClient.listAgents();

    return NextResponse.json({
      success: true,
      agents,
      count: agents.length,
    });
  } catch (error) {
    console.error("Failed to list agents:", error);
    return NextResponse.json(
      {
        error: "Failed to list agents",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
