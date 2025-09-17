Agent Detection (AgentLoader can detect all agents in agents/ dir)
Session mkanagement (can resume by session id and memory is retained after resume)
streaming utility (all conversation output is saved to a .log file. if agent was resumed, both invocations are shown)
plan and progress (task completion is {verb} using plan and progress files)
agent invocation (agents are orchestrated via invoke agent)
summary enforcement (after each invocation the invoke agent enforces summary creation via resume invocation)
user defined backend and frontend directories
strict write permissions (agent can only write to specific folders)