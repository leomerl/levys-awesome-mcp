/**
 * Unit Tests for ToolRegistry - Core MCP Dynamic Tool Discovery
 * Tests the comprehensive tool discovery and management functionality
 */

import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../../src/utilities/tools/tool-registry.js';

describe('ToolRegistry - Core MCP Tool Discovery', () => {
  // No setup/cleanup needed - no cache mechanism

  describe('Tool Discovery', () => {
    it('should discover all tools from registered categories', async () => {
      // Using the actual method that exists
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      const allCategories = Object.keys(toolsByCategory);

      expect(allCategories.length).toBeGreaterThan(0);

      // Count total tools across categories
      const totalTools = Object.values(toolsByCategory)
        .reduce((sum, tools) => sum + tools.length, 0);

      expect(totalTools).toBeGreaterThan(10); // At least some tools
      expect(totalTools).toBeLessThan(100); // But not an unreasonable amount
    });

    it('should categorize tools correctly', async () => {
      const toolsByCategory = await ToolRegistry.getToolsByCategory();

      // Check expected categories exist (matching actual implementation)
      // NOTE: 'mcp' category was removed - third-party MCP tools are NOT in the built-in registry
      expect(toolsByCategory).toHaveProperty('file-system');
      expect(toolsByCategory).toHaveProperty('execution');
      expect(toolsByCategory).toHaveProperty('search');
      expect(toolsByCategory).toHaveProperty('version-control');
      expect(toolsByCategory).toHaveProperty('development');
      expect(toolsByCategory).toHaveProperty('testing');
      expect(toolsByCategory).toHaveProperty('documentation');
      expect(toolsByCategory).toHaveProperty('deployment');
      expect(toolsByCategory).toHaveProperty('monitoring');
      expect(toolsByCategory).toHaveProperty('database');
      expect(toolsByCategory).toHaveProperty('cloud');
      expect(toolsByCategory).toHaveProperty('communication');

      // Each category should have at least some tools
      expect(toolsByCategory['file-system'].length).toBeGreaterThan(0);
      expect(toolsByCategory['execution'].length).toBeGreaterThan(0);
      expect(toolsByCategory['search'].length).toBeGreaterThan(0);
    });

    it('should include file system tools', async () => {
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      const fileSystemTools = toolsByCategory['file-system'];

      expect(fileSystemTools).toContain('Read');
      expect(fileSystemTools).toContain('Write');
      expect(fileSystemTools).toContain('Edit');
      expect(fileSystemTools).toContain('MultiEdit');
      expect(fileSystemTools).toContain('NotebookEdit');
      expect(fileSystemTools).toContain('Glob');
    });

    it('should include execution tools', async () => {
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      const executionTools = toolsByCategory['execution'];

      expect(executionTools).toContain('Bash');
      expect(executionTools).toContain('BashOutput');
      expect(executionTools).toContain('KillShell');
      expect(executionTools).toContain('Task');
    });

    it('should include search tools', async () => {
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      const searchTools = toolsByCategory['search'];

      expect(searchTools).toContain('Grep');
      expect(searchTools).toContain('WebSearch');
      expect(searchTools).toContain('WebFetch');
    });

    // Cache test removed - no caching mechanism

    it('should provide tool statistics', async () => {
      const stats = await ToolRegistry.getToolStatistics();

      expect(stats.totalTools).toBeGreaterThan(0);
      expect(stats.categoriesCount).toBe(12); // 12 categories (mcp removed)
      expect(stats.categories).toBeInstanceOf(Array);
      expect(stats.categories.length).toBe(12);

      // Each category should have a name and count
      for (const category of stats.categories) {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('count');
        expect(category.count).toBeGreaterThan(0);
      }
    });
  });

  describe('Dynamic Tool Restriction Calculation', () => {
    it('should calculate disallowed tools correctly', async () => {
      const allowedTools = ['Read', 'Write', 'Bash'];
      const disallowedTools = await ToolRegistry.calculateDisallowedTools(allowedTools);

      // Should not include allowed tools
      expect(disallowedTools).not.toContain('Read');
      expect(disallowedTools).not.toContain('Write');
      expect(disallowedTools).not.toContain('Bash');

      // Should include other tools
      expect(disallowedTools).toContain('Edit');
      expect(disallowedTools).toContain('Grep');
      expect(disallowedTools).toContain('WebSearch');
    });

    it('should handle empty allowed tools list', async () => {
      // Should disallow all available tools
      const disallowedTools = await ToolRegistry.calculateDisallowedTools([]);
      const stats = await ToolRegistry.getToolStatistics();

      expect(disallowedTools.length).toBe(stats.totalTools);
    });

    it('should handle all tools allowed', async () => {
      const stats = await ToolRegistry.getToolStatistics();
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      const allTools = Object.values(toolsByCategory).flat();

      const disallowedTools = await ToolRegistry.calculateDisallowedTools(allTools);

      // Should have no disallowed tools
      expect(disallowedTools).toHaveLength(0);
    });

    it('should handle duplicate tools in allowed list', async () => {
      const allowedTools = ['Read', 'Write', 'Read', 'Write', 'Bash'];
      const disallowedTools = await ToolRegistry.calculateDisallowedTools(allowedTools);

      // Should handle duplicates gracefully
      expect(disallowedTools).not.toContain('Read');
      expect(disallowedTools).not.toContain('Write');
      expect(disallowedTools).not.toContain('Bash');
    });
  });

  describe('Tool Validation', () => {
    it('should validate known tools correctly', async () => {
      const knownTools = ['Read', 'Write', 'Edit', 'Bash', 'Grep'];
      const validation = await ToolRegistry.validateToolList(knownTools);

      expect(validation.valid).toBe(true);
      expect(validation.invalidTools).toHaveLength(0);
    });

    it('should identify unknown tools', async () => {
      const mixedTools = ['Read', 'UnknownTool1', 'Write', 'UnknownTool2'];
      const validation = await ToolRegistry.validateToolList(mixedTools);

      expect(validation.valid).toBe(false);
      expect(validation.invalidTools).toHaveLength(2);
      expect(validation.invalidTools).toContain('UnknownTool1');
      expect(validation.invalidTools).toContain('UnknownTool2');
    });

    it('should validate empty tool list', async () => {
      const validation = await ToolRegistry.validateToolList([]);

      expect(validation.valid).toBe(true);
      expect(validation.invalidTools).toHaveLength(0);
    });

    it('should treat third-party MCP tools as unknown (not in built-in registry)', async () => {
      // MCP tools are third-party tools added dynamically by agents, NOT in the built-in registry
      const mcpTools = ['mcp__ide__getDiagnostics', 'mcp__ide__executeCode'];
      const validation = await ToolRegistry.validateToolList(mcpTools);

      // These should be considered invalid/unknown by the built-in registry
      // but agents can still use them (they're third-party tools)
      expect(validation.valid).toBe(false);
      expect(validation.invalidTools).toHaveLength(2);
      expect(validation.invalidTools).toContain('mcp__ide__getDiagnostics');
      expect(validation.invalidTools).toContain('mcp__ide__executeCode');
    });
  });

  describe('Tool Statistics', () => {
    it('should provide comprehensive tool statistics', async () => {
      const stats = await ToolRegistry.getToolStatistics();

      expect(stats).toHaveProperty('totalTools');
      expect(stats).toHaveProperty('categoriesCount');
      expect(stats).toHaveProperty('categories');

      expect(stats.totalTools).toBeGreaterThan(0);
      expect(stats.categoriesCount).toBeGreaterThan(0);
      expect(stats.categories).toBeInstanceOf(Array);
    });

    it('should have correct totals', async () => {
      const stats = await ToolRegistry.getToolStatistics();
      const toolsByCategory = await ToolRegistry.getToolsByCategory();

      // Total from stats should match actual count
      const actualTotal = Object.values(toolsByCategory)
        .flat()
        .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
        .length;

      expect(stats.totalTools).toBe(actualTotal);
      expect(stats.categoriesCount).toBe(Object.keys(toolsByCategory).length);
    });
  });

  describe('Tool Category Lookup', () => {
    it('should find category for known tools', () => {
      expect(ToolRegistry.getToolCategory('Read')).toBe('file-system');
      expect(ToolRegistry.getToolCategory('Bash')).toBe('execution');
      expect(ToolRegistry.getToolCategory('Grep')).toBe('search');
      expect(ToolRegistry.getToolCategory('TodoWrite')).toBe('development');
    });

    it('should return undefined for unknown tools', () => {
      expect(ToolRegistry.getToolCategory('UnknownTool')).toBeUndefined();
      expect(ToolRegistry.getToolCategory('')).toBeUndefined();
    });
  });

  describe('Tool Existence Check', () => {
    it('should correctly identify valid built-in tools', () => {
      expect(ToolRegistry.isValidTool('Read')).toBe(true);
      expect(ToolRegistry.isValidTool('Write')).toBe(true);
      expect(ToolRegistry.isValidTool('Bash')).toBe(true);
    });

    it('should correctly identify invalid tools and third-party MCP tools', () => {
      expect(ToolRegistry.isValidTool('InvalidTool')).toBe(false);
      // MCP tools are NOT in the built-in registry (they're third-party tools)
      expect(ToolRegistry.isValidTool('mcp__ide__getDiagnostics')).toBe(false);
      expect(ToolRegistry.isValidTool('')).toBe(false);
      expect(ToolRegistry.isValidTool('NotARealTool')).toBe(false);
    });
  });

  // Cache Management tests removed - no caching mechanism

  describe('Error Handling', () => {
    it('should handle malformed tool validation input', async () => {
      // Test with undefined/null values - should not throw
      const validation1 = await ToolRegistry.validateToolList([]);
      expect(validation1.valid).toBe(true);

      // Test with mixed valid/invalid tools
      const validation2 = await ToolRegistry.validateToolList(['Read', '', 'Invalid']);
      expect(validation2.valid).toBe(false);
      expect(validation2.invalidTools).toContain('');
      expect(validation2.invalidTools).toContain('Invalid');
    });
  });

  describe('Performance', () => {
    it('should complete tool discovery within reasonable time', async () => {
      const start = Date.now();
      const toolsByCategory = await ToolRegistry.getToolsByCategory();
      const duration = Date.now() - start;

      expect(Object.keys(toolsByCategory).length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should be nearly instant
    });

    // Performance cache test removed - no caching mechanism
  });
});