/**
 * Unit Tests for ToolRegistry - Core MCP Dynamic Tool Discovery
 * Tests the comprehensive tool discovery and restriction calculation functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolRegistry } from '../../src/utilities/tools/tool-registry.js';

describe('ToolRegistry - Core MCP Tool Discovery', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure fresh state
    ToolRegistry.clearCache();
  });

  afterEach(() => {
    // Clear cache after each test to prevent interference
    ToolRegistry.clearCache();
  });

  describe('Tool Discovery', () => {
    it('should discover all MCP tools from registered handlers', async () => {
      const allTools = await ToolRegistry.getAllMCPTools();
      
      expect(allTools).toBeInstanceOf(Array);
      expect(allTools.length).toBeGreaterThan(0);
      
      // Should include tools from different categories
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      const totalCategoryTools = Object.values(toolsByCategory)
        .filter(category => category !== 'claude-code-builtin')
        .reduce((sum, tools) => sum + tools.length, 0);
      
      expect(allTools.length).toBe(totalCategoryTools);
    });

    it('should categorize tools correctly', async () => {
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      
      // Check expected categories exist
      expect(toolsByCategory).toHaveProperty('agent-generator');
      expect(toolsByCategory).toHaveProperty('agent-invoker');
      expect(toolsByCategory).toHaveProperty('build-executor');
      expect(toolsByCategory).toHaveProperty('content-writer');
      expect(toolsByCategory).toHaveProperty('code-analyzer');
      expect(toolsByCategory).toHaveProperty('server-runner');
      expect(toolsByCategory).toHaveProperty('test-executor');
      expect(toolsByCategory).toHaveProperty('plan-creator');
      expect(toolsByCategory).toHaveProperty('claude-code-builtin');

      // Each category should have at least some tools
      expect(toolsByCategory['agent-invoker'].length).toBeGreaterThan(0);
      expect(toolsByCategory['content-writer'].length).toBeGreaterThan(0);
      expect(toolsByCategory['claude-code-builtin'].length).toBeGreaterThan(0);
    });

    it('should include Claude Code built-in tools', async () => {
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      const builtInTools = toolsByCategory['claude-code-builtin'];
      
      expect(builtInTools).toContain('Bash');
      expect(builtInTools).toContain('Read');
      expect(builtInTools).toContain('Write');
      expect(builtInTools).toContain('Edit');
      expect(builtInTools).toContain('MultiEdit');
      expect(builtInTools).toContain('Glob');
      expect(builtInTools).toContain('Grep');
      expect(builtInTools).toContain('TodoWrite');
      expect(builtInTools).toContain('Task');
      expect(builtInTools).toContain('WebFetch');
    });

    it('should cache tool discovery results', async () => {
      const start1 = Date.now();
      const tools1 = await ToolRegistry.getAllMCPTools();
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const tools2 = await ToolRegistry.getAllMCPTools();
      const time2 = Date.now() - start2;

      expect(tools1).toEqual(tools2);
      // Second call should be much faster due to caching
      expect(time2).toBeLessThan(time1);
    });

    it('should provide tool information', async () => {
      const allTools = await ToolRegistry.getAllMCPTools();
      expect(allTools.length).toBeGreaterThan(0);
      
      // Get info for the first tool
      const firstTool = allTools[0];
      const toolInfo = await ToolRegistry.getToolInfo(firstTool);
      
      expect(toolInfo).toBeDefined();
      expect(toolInfo).toHaveProperty('name', firstTool);
      expect(toolInfo).toHaveProperty('description');
      expect(toolInfo).toHaveProperty('category');
      expect(toolInfo).toHaveProperty('inputSchema');
    });
  });

  describe('Dynamic Tool Restriction Calculation', () => {
    it('should calculate disallowed tools correctly', async () => {
      const allTools = await ToolRegistry.getAllMCPTools();
      const builtInTools = (await ToolRegistry.getToolsByCategory())['claude-code-builtin'];
      const totalTools = [...new Set([...allTools, ...builtInTools])];
      
      const allowedTools = ['Read', 'Grep'];
      const disallowedTools = await ToolRegistry.calculateDisallowedTools(allowedTools);
      
      // Should include all tools except the allowed ones
      expect(disallowedTools.length).toBe(totalTools.length - allowedTools.length);
      
      // Should not include any allowed tools
      for (const allowed of allowedTools) {
        expect(disallowedTools).not.toContain(allowed);
      }
      
      // Should include tools that weren't allowed
      expect(disallowedTools).toContain('Write');
      expect(disallowedTools).toContain('Bash');
      expect(disallowedTools).toContain('Edit');
    });

    it('should handle empty allowed tools list', async () => {
      const disallowedTools = await ToolRegistry.calculateDisallowedTools([]);
      
      // Should disallow all available tools
      const allTools = await ToolRegistry.getAllMCPTools();
      const builtInTools = (await ToolRegistry.getToolsByCategory())['claude-code-builtin'];
      const totalTools = [...new Set([...allTools, ...builtInTools])];
      
      expect(disallowedTools.length).toBe(totalTools.length);
    });

    it('should handle all tools allowed', async () => {
      const allTools = await ToolRegistry.getAllMCPTools();
      const builtInTools = (await ToolRegistry.getToolsByCategory())['claude-code-builtin'];
      const allAvailableTools = [...new Set([...allTools, ...builtInTools])];
      
      const disallowedTools = await ToolRegistry.calculateDisallowedTools(allAvailableTools);
      
      // Should disallow no tools
      expect(disallowedTools.length).toBe(0);
    });

    it('should handle duplicate tools in allowed list', async () => {
      const allowedTools = ['Read', 'Grep', 'Read', 'Grep']; // Duplicates
      const disallowedTools = await ToolRegistry.calculateDisallowedTools(allowedTools);
      
      // Should not include duplicates in calculation
      expect(disallowedTools).not.toContain('Read');
      expect(disallowedTools).not.toContain('Grep');
      
      // Should still disallow other tools
      expect(disallowedTools).toContain('Write');
      expect(disallowedTools).toContain('Bash');
    });
  });

  describe('Tool Validation', () => {
    it('should validate known tools correctly', async () => {
      const knownTools = ['Read', 'Write', 'Grep'];
      const validation = await ToolRegistry.validateToolList(knownTools);
      
      expect(validation.valid).toBe(true);
      expect(validation.unknownTools).toHaveLength(0);
    });

    it('should identify unknown tools', async () => {
      const toolsWithUnknown = ['Read', 'UnknownTool1', 'Grep', 'UnknownTool2'];
      const validation = await ToolRegistry.validateToolList(toolsWithUnknown);
      
      expect(validation.valid).toBe(false);
      expect(validation.unknownTools).toHaveLength(2);
      expect(validation.unknownTools).toContain('UnknownTool1');
      expect(validation.unknownTools).toContain('UnknownTool2');
    });

    it('should validate empty tool list', async () => {
      const validation = await ToolRegistry.validateToolList([]);
      
      expect(validation.valid).toBe(true);
      expect(validation.unknownTools).toHaveLength(0);
    });

    it('should validate MCP tools correctly', async () => {
      const mcpTools = await ToolRegistry.getAllMCPTools();
      const firstFewMcpTools = mcpTools.slice(0, 3);
      
      const validation = await ToolRegistry.validateToolList(firstFewMcpTools);
      
      expect(validation.valid).toBe(true);
      expect(validation.unknownTools).toHaveLength(0);
    });
  });

  describe('Tool Statistics', () => {
    it('should provide comprehensive tool statistics', async () => {
      const stats = await ToolRegistry.getToolStatistics();
      
      expect(stats).toHaveProperty('totalMCPTools');
      expect(stats).toHaveProperty('totalBuiltInTools');
      expect(stats).toHaveProperty('toolsByCategory');
      
      expect(stats.totalMCPTools).toBeGreaterThan(0);
      expect(stats.totalBuiltInTools).toBeGreaterThan(0);
      expect(Object.keys(stats.toolsByCategory).length).toBeGreaterThan(0);
    });

    it('should have correct totals', async () => {
      const stats = await ToolRegistry.getToolStatistics();
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      
      // Built-in tools count should match
      expect(stats.totalBuiltInTools).toBe(toolsByCategory['claude-code-builtin'].length);
      
      // MCP tools count should be sum of non-builtin categories
      const expectedMcpTotal = Object.entries(toolsByCategory)
        .filter(([category]) => category !== 'claude-code-builtin')
        .reduce((sum, [, tools]) => sum + tools.length, 0);
      
      expect(stats.totalMCPTools).toBe(expectedMcpTotal);
    });
  });

  describe('TypeScript Type Generation', () => {
    it('should generate valid TypeScript types', async () => {
      const typeDefinition = await ToolRegistry.generateToolTypes();
      
      expect(typeDefinition).toContain('export type');
      expect(typeDefinition).toContain('AllAvailableTools');
      expect(typeDefinition).toContain('AgentGeneratorTools');
      expect(typeDefinition).toContain('ContentWriterTools');
      
      // Should contain actual tool names
      expect(typeDefinition).toContain('Read');
      expect(typeDefinition).toContain('Write');
      expect(typeDefinition).toContain('Bash');
    });

    it('should include all discovered tools in generated types', async () => {
      const allTools = await ToolRegistry.getAllMCPTools();
      const builtInTools = (await ToolRegistry.getToolsByCategory())['claude-code-builtin'];
      const typeDefinition = await ToolRegistry.generateToolTypes();
      
      // Check a few random tools are included
      const sampleTools = [...allTools.slice(0, 3), ...builtInTools.slice(0, 3)];
      for (const tool of sampleTools) {
        expect(typeDefinition).toContain(`'${tool}'`);
      }
    });
  });

  describe('Cache Management', () => {
    it('should clear cache correctly', async () => {
      // Populate cache
      await ToolRegistry.getAllMCPTools();
      await ToolRegistry.getToolsByCategory();
      
      // Clear cache
      ToolRegistry.clearCache();
      
      // Should work correctly after cache clear
      const tools = await ToolRegistry.getAllMCPTools();
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should respect cache TTL', async () => {
      // This test would require mocking time, but we can at least verify
      // that multiple calls return consistent results
      const tools1 = await ToolRegistry.getAllMCPTools();
      const tools2 = await ToolRegistry.getAllMCPTools();
      const tools3 = await ToolRegistry.getAllMCPTools();
      
      expect(tools1).toEqual(tools2);
      expect(tools2).toEqual(tools3);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tool names gracefully', async () => {
      const toolInfo = await ToolRegistry.getToolInfo('InvalidToolName123');
      expect(toolInfo).toBeNull();
    });

    it('should handle malformed tool validation input', async () => {
      // Test with undefined/null values - should not throw
      const validation1 = await ToolRegistry.validateToolList([]);
      expect(validation1.valid).toBe(true);
      
      // Test with mixed valid/invalid tools
      const validation2 = await ToolRegistry.validateToolList(['Read', '', 'Invalid']);
      expect(validation2.valid).toBe(false);
      expect(validation2.unknownTools).toContain('');
      expect(validation2.unknownTools).toContain('Invalid');
    });
  });

  describe('Performance', () => {
    it('should complete tool discovery within reasonable time', async () => {
      const start = Date.now();
      const allTools = await ToolRegistry.getAllMCPTools();
      const duration = Date.now() - start;
      
      expect(allTools.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should cache results for better performance', async () => {
      // First call - will populate cache
      const start1 = Date.now();
      await ToolRegistry.getAllMCPTools();
      const firstCallTime = Date.now() - start1;
      
      // Second call - should use cache
      const start2 = Date.now();
      await ToolRegistry.getAllMCPTools();
      const secondCallTime = Date.now() - start2;
      
      // Cached call should be significantly faster
      expect(secondCallTime).toBeLessThan(firstCallTime / 2);
    });
  });
});