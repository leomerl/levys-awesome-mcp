#!/usr/bin/env npx tsx

import { query } from "@anthropic-ai/claude-code";
import { AgentConfig } from '../src/types/agent-config.js';

/**
 * Base class for agents that can be invoked both via MCP and CLI
 */
export abstract class BaseAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Get the agent configuration for MCP invocation
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Run the agent with a prompt (used by both MCP and CLI)
   */
  async *run(prompt: string): AsyncGenerator<{ type: string; text?: string }, void, unknown> {
    const generator = query({
      prompt,
      options: this.config.options
    });

    for await (const message of generator) {
      yield message;
    }
  }

  /**
   * CLI execution handler
   */
  async runCLI(prompt?: string): Promise<void> {
    const cliPrompt = prompt || process.argv[2];

    if (!cliPrompt) {
      console.error(`Usage: npx tsx agents/${this.config.name}.ts "your prompt here"`);
      process.exit(1);
    }

    console.log(`Running ${this.config.description}...`);
    console.log(`Prompt: ${cliPrompt}\n`);

    try {
      for await (const message of this.run(cliPrompt)) {
        if (message.type === "text" && message.text) {
          console.log(message.text);
        }
      }
    } catch (error) {
      console.error(`Failed to execute ${this.config.name}:`, error);
      process.exit(1);
    }
  }

  /**
   * Check if the script is being run directly (not imported)
   */
  static isDirectExecution(): boolean {
    // Check if this is the main module being executed
    const mainModule = process.argv[1];
    return mainModule !== undefined &&
           (mainModule.endsWith('.ts') || mainModule.endsWith('.js')) &&
           !mainModule.includes('node_modules');
  }
}

/**
 * Factory function to create an agent that works with both MCP and CLI
 */
export function createAgent<T extends BaseAgent>(
  AgentClass: new (config: AgentConfig) => T,
  config: AgentConfig
): T {
  const agent = new AgentClass(config);

  // If running directly from CLI, execute the agent
  if (BaseAgent.isDirectExecution()) {
    agent.runCLI().catch(console.error);
  }

  return agent;
}

export default BaseAgent;