"use client";

import { useEffect, useState } from "react";

type TabType = "plan" | "summaries" | "running";

interface Task {
  id: string;
  designated_agent: string;
  dependencies: string[];
  description: string;
  files_to_modify: string[];
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
}

interface StatusData {
  status: "creating_plan" | "plan_created" | "in_progress";
  plan?: {
    taskDescription: string;
    synopsis: string;
    totalTasks: number;
    tasks: Task[];
  };
  progress?: {
    completed: number;
    inProgress: number;
    pending: number;
    failed: number;
    tasks: Record<string, TaskProgress>;
    lastUpdated?: string;
  };
  hasProgress: boolean;
  message?: string;
}

interface ProgressPanelProps {
  sessionId: string | null;
}

interface RunningAgent {
  sessionId: string;
  agentName: string;
  startTime: string;
  duration: number;
}

export default function ProgressPanel({ sessionId }: ProgressPanelProps) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("plan");
  const [summaries, setSummaries] = useState<any[]>([]);
  const [runningAgents, setRunningAgents] = useState<RunningAgent[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setStatus(null);
      return;
    }

    const fetchStatus = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/status/${sessionId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to fetch status");
          return;
        }

        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    const fetchSummaries = async () => {
      try {
        const response = await fetch(`/api/summaries/${sessionId}`);
        const data = await response.json();

        if (response.ok) {
          setSummaries(data.summaries || []);
        }
      } catch (err) {
        console.error("Failed to fetch summaries:", err);
      }
    };

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

    fetchStatus();
    fetchSummaries();
    fetchRunningAgents();

    // Poll every 2 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchSummaries();
      fetchRunningAgents();
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 p-8 text-center">
        <div>
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>Start an orchestration to see progress</p>
        </div>
      </div>
    );
  }

  if (loading && !status) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500 p-8 text-center">
        <div>
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-semibold mb-2">Error loading status</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  if (status.status === "creating_plan") {
    return (
      <div className="h-full flex flex-col">
        {/* Header with status indicator */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Orchestration Progress
            </h2>
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Active
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Creating Plan...
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analyzing requirements and generating execution plan
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { plan, progress } = status;

  if (!plan || !progress) {
    return null;
  }

  const completionPercentage = plan.totalTasks > 0
    ? Math.round((progress.completed / plan.totalTasks) * 100)
    : 0;

  const getStateColor = (state: string) => {
    switch (state) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-300 dark:bg-gray-600";
    }
  };

  const getStateText = (state: string) => {
    switch (state) {
      case "completed":
        return "✓";
      case "in_progress":
        return "⋯";
      case "failed":
        return "✗";
      default:
        return "";
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Orchestration Progress
          </h2>
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              progress.inProgress > 0 || progress.pending > 0
                ? "bg-green-500 animate-pulse"
                : "bg-gray-400 dark:bg-gray-600"
            }`} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {progress.inProgress > 0 || progress.pending > 0 ? "Active" : "Complete"}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {plan.synopsis}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab("plan")}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === "plan"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Plan ({plan.totalTasks})
          </button>
          <button
            onClick={() => setActiveTab("summaries")}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === "summaries"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Summaries ({summaries.length})
          </button>
          <button
            onClick={() => setActiveTab("running")}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === "running"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Running ({runningAgents.length})
          </button>
        </div>
      </div>

      {/* Progress Summary */}
      {activeTab === "plan" && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {progress.completed} / {plan.totalTasks}
              </span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                Completed
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {progress.completed}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                In Progress
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {progress.inProgress}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Pending
              </div>
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {progress.pending}
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                Failed
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {progress.failed}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      {activeTab === "plan" && (
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
            Tasks
          </h3>
          <div className="space-y-3">
            {plan.tasks.map((task) => {
              const taskProgress = progress.tasks[task.id];
              const state = taskProgress?.state || "pending";

              return (
                <div
                  key={task.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full ${getStateColor(
                        state
                      )} flex items-center justify-center text-white font-bold text-sm`}
                    >
                      {getStateText(state)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          {task.id}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                          {task.designated_agent}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white mb-2">
                        {task.description}
                      </p>
                      {taskProgress?.summary && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                          {taskProgress.summary}
                        </p>
                      )}
                      {taskProgress?.failure_reason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          ✗ {taskProgress.failure_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summaries Tab Content */}
      {activeTab === "summaries" && (
        <div className="flex-1 overflow-y-auto p-6">
          {summaries.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>No summaries available yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map((summary, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {summary.agentName.split("-").map((word: string) =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(" ")}
                    </h4>
                    {summary.status && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          summary.status === "success" || summary.status === "completed"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : summary.status === "failed"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        {summary.status}
                      </span>
                    )}
                  </div>

                  {/* Summary Content */}
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {summary.summary && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {summary.summary}
                      </p>
                    )}

                    {summary.filesModified && summary.filesModified.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Files Modified:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {summary.filesModified.map((file: string, i: number) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-mono"
                            >
                              {file.split("/").pop()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {summary.timestamp && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {new Date(summary.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Running Agents Tab Content */}
      {activeTab === "running" && (
        <div className="flex-1 overflow-y-auto p-6">
          {runningAgents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600"
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
              <p>No agents currently running</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Active Agents
                </span>
              </div>
              {runningAgents.map((agent, index) => (
                <div
                  key={index}
                  className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {agent.agentName}
                    </h4>
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-mono">
                      {Math.floor(agent.duration / 1000)}s
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Session ID:</span>
                      <span className="font-mono text-gray-700 dark:text-gray-300">
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
      )}
    </div>
  );
}
