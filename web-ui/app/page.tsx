"use client";

import { useState, useEffect } from "react";
import ProgressPanel from "@/components/ProgressPanel";

type OrchestrationType = "sparc" | "simple";

interface RunningAgent {
  sessionId: string;
  agentName: string;
  startTime: string;
  duration: number;
}

export default function Home() {
  const [orchestrationType, setOrchestrationType] = useState<OrchestrationType>("simple");
  const [taskDescription, setTaskDescription] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [runningAgents, setRunningAgents] = useState<RunningAgent[]>([]);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem("currentSessionId");
    if (savedSessionId) {
      setCurrentSessionId(savedSessionId);
    }
  }, []);

  // Poll for running agents
  useEffect(() => {
    const fetchRunningAgents = async () => {
      try {
        const response = await fetch("/api/running-agents");
        const data = await response.json();
        if (response.ok) {
          setRunningAgents(data.runningAgents || []);
        }
      } catch (err) {
        console.error("Failed to fetch running agents:", err);
      }
    };

    fetchRunningAgents();
    const interval = setInterval(fetchRunningAgents, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);

    try {
      const response = await fetch("/api/orchestrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: orchestrationType,
          task: taskDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Orchestration started:", data);
        setCurrentSessionId(data.sessionId);
        // Save to localStorage so it persists across refreshes
        localStorage.setItem("currentSessionId", data.sessionId);
      } else {
        console.error("Orchestration failed:", data.error);
        alert(`Failed to start orchestration: ${data.error}`);
      }
    } catch (error) {
      console.error("Error starting orchestration:", error);
      alert("An error occurred while starting orchestration");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            MCP Orchestration
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Coordinate complex AI workflows with ease
          </p>
        </div>

        <div className="max-w-6xl mx-auto flex gap-6">
          {/* Main Card */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Orchestration Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    Orchestration Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setOrchestrationType("simple")}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        orchestrationType === "simple"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Simple Orchestration
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Planning → Development → Review → Build → Lint → Test
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrchestrationType("sparc")}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        orchestrationType === "sparc"
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          SPARC Workflow
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Specification → Pseudocode → Architecture → Refinement → Completion
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Task Description */}
                <div>
                  <label
                    htmlFor="task"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3"
                  >
                    Task Description
                  </label>
                  <textarea
                    id="task"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Describe the task you want to orchestrate..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isRunning || !taskDescription.trim()}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
                    isRunning || !taskDescription.trim()
                      ? "bg-gray-400 cursor-not-allowed"
                      : orchestrationType === "sparc"
                      ? "bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
                      : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                  }`}
                >
                  {isRunning ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Running Orchestration...
                    </span>
                  ) : (
                    `Start ${orchestrationType === "sparc" ? "SPARC" : "Simple"} Orchestration`
                  )}
                </button>
              </form>

              {/* Info Section */}
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Workflow Details
                </h4>
                {orchestrationType === "simple" ? (
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Planning phase with planner-agent</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Task-by-task development execution</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Automated review and feedback loops</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Build, lint, and test validation</span>
                    </li>
                  </ul>
                ) : (
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Phase 0: Research & Discovery</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Phase 1: Specification Creation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Phase 2: Pseudocode & High-level Design</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Phase 3: Detailed Architecture</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Phase 4: TDD Implementation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Phase 5: Final Integration & Deployment</span>
                    </li>
                  </ul>
                )}
              </div>

              {/* Active Sessions Section */}
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  {runningAgents.length > 0 ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                  )}
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Active Sessions ({runningAgents.length})
                  </h4>
                </div>

                {runningAgents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <p className="text-sm">No active orchestrations</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {runningAgents.map((agent, index) => (
                      <div
                        key={index}
                        className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                        onClick={() => {
                          setCurrentSessionId(agent.sessionId);
                          localStorage.setItem("currentSessionId", agent.sessionId);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-semibold text-green-900 dark:text-green-100">
                            {agent.agentName}
                          </h5>
                          <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-mono">
                            {Math.floor(agent.duration / 1000)}s
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Session ID:</span>
                            <span className="font-mono text-gray-700 dark:text-gray-300 truncate ml-2">
                              {agent.sessionId}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Started:</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {new Date(agent.startTime).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>

          {/* Progress Panel Box */}
          {currentSessionId && (
            <div className="w-96 flex-shrink-0">
              <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[80vh]">
                <ProgressPanel sessionId={currentSessionId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
