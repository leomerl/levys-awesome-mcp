---
description: Create a new TypeScript SDK agent with optimized prompts and proper tool assignments
argument-hint: [agent-name] [agent-purpose]
---

Invoke the agent-creator agent using the invoke_agent mcp tool to create a new TypeScript SDK agent based on the requirements provided.

IMPORTANT: The agent-creator will:
1. Analyze the requirements to determine the agent's purpose and responsibilities
2. Assign appropriate tools based on the agent type (development, analysis, orchestration)
3. Generate a comprehensive, detailed system prompt with all necessary constraints
4. Create the agent following the established AgentConfig structure
5. Update the documentation in docs/agent-tools-mapping.md

The agent-creator will ensure the new agent:
- Uses proper TypeScript types (no 'any' types)
- Contains no emojis in code or documentation
- Implements actual behavior (no TODOs or mocks)
- Has appropriate tool access based on its role
- Includes update_progress only for development/testing agents (not orchestrators/planners)

analyze if the agent is related to any of the workflows in the docs/ dir

Pass the following requirements to the agent-creator:
$ARGUMENTS