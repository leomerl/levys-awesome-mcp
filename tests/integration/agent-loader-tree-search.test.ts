/**
 * Agent Loader Tree Search Validation Test
 * Verifies that AgentLoader's recursive directory scanning matches
 * actual file system tree search results
 */

import { describe, it, expect } from 'vitest';
import { AgentLoader } from '../../src/utilities/agents/agent-loader.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper: Use find command to recursively discover all .ts files in agents/
 */
function findAgentFilesInFileSystem(): string[] {
  const agentsDir = path.resolve(process.cwd(), 'agents');

  if (!fs.existsSync(agentsDir)) {
    return [];
  }

  try {
    // Find all .ts files, excluding .d.ts and files in node_modules
    const output = execSync(
      `find "${agentsDir}" -name "*.ts" -type f ! -name "*.d.ts" ! -path "*/node_modules/*"`,
      { encoding: 'utf-8' }
    );

    return output
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
  } catch (error) {
    console.error('Error running find command:', error);
    return [];
  }
}

/**
 * Helper: Extract agent name from file content using same regex as AgentLoader
 */
function extractAgentNameFromFile(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/);
    return nameMatch ? nameMatch[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Helper: Parse all agent files and extract names
 */
function getAgentNamesFromFileSystem(): string[] {
  const agentFiles = findAgentFilesInFileSystem();
  const agentNames: string[] = [];

  for (const filePath of agentFiles) {
    const name = extractAgentNameFromFile(filePath);
    if (name) {
      agentNames.push(name);
    }
  }

  return agentNames.sort();
}

/**
 * Helper: Count agents in each subdirectory
 */
function countAgentsByDirectory(): Record<string, number> {
  const agentsDir = path.resolve(process.cwd(), 'agents');
  const agentFiles = findAgentFilesInFileSystem();
  const counts: Record<string, number> = {};

  for (const filePath of agentFiles) {
    const relativePath = path.relative(agentsDir, filePath);
    const parts = relativePath.split(path.sep);

    // Handle root-level files (e.g., memory-test-agent.ts)
    const dirName = parts.length === 1 ? 'root' : parts[0];

    // Only count files with valid agent names
    const agentName = extractAgentNameFromFile(filePath);
    if (agentName) {
      counts[dirName] = (counts[dirName] || 0) + 1;
    }
  }

  return counts;
}

describe('Agent Loader Tree Search Validation', () => {
  describe('Dynamic File System Scan vs AgentLoader Comparison', () => {
    it('should find the same agents as file system tree search', () => {
      console.log('\n🔍 Comparing AgentLoader with file system scan...');

      // Get agents from both sources
      const fsAgents = getAgentNamesFromFileSystem();
      const loaderAgents = AgentLoader.listAvailableAgents().sort();

      console.log(`   File system found: ${fsAgents.length} agents`);
      console.log(`   AgentLoader found: ${loaderAgents.length} agents`);

      // Display any differences
      const onlyInFS = fsAgents.filter(a => !loaderAgents.includes(a));
      const onlyInLoader = loaderAgents.filter(a => !fsAgents.includes(a));

      if (onlyInFS.length > 0) {
        console.log('   ❌ Agents found in file system but NOT by AgentLoader:');
        onlyInFS.forEach(a => console.log(`      - ${a}`));
      }

      if (onlyInLoader.length > 0) {
        console.log('   ❌ Agents found by AgentLoader but NOT in file system:');
        onlyInLoader.forEach(a => console.log(`      - ${a}`));
      }

      if (onlyInFS.length === 0 && onlyInLoader.length === 0) {
        console.log('   ✅ Perfect match - all agents found by both methods');
      }

      // Assertions
      expect(loaderAgents).toHaveLength(fsAgents.length);
      expect(onlyInFS).toHaveLength(0);
      expect(onlyInLoader).toHaveLength(0);
      expect(loaderAgents).toEqual(fsAgents);
    });

    it('should discover agents in all subdirectories', () => {
      console.log('\n📁 Checking subdirectory coverage...');

      const counts = countAgentsByDirectory();
      console.log('   Agents per directory:');

      for (const [dir, count] of Object.entries(counts)) {
        console.log(`      ${dir}: ${count} agents`);
      }

      // Expected directory structure
      const expectedDirs = ['workflows', 'sparc', 'development', 'testing', 'tooling'];

      for (const expectedDir of expectedDirs) {
        expect(counts[expectedDir]).toBeGreaterThan(0);
      }

      // base/ directory may have base-agent.ts but it has no name field, so count could be 0
      console.log('   ✅ All expected directories have agents');
    });

    it('should correctly exclude .d.ts and .map files', () => {
      console.log('\n🚫 Checking file exclusion...');

      const agentFiles = findAgentFilesInFileSystem();

      const invalidFiles = agentFiles.filter(file =>
        file.endsWith('.d.ts') || file.endsWith('.map')
      );

      console.log(`   Total files found: ${agentFiles.length}`);
      console.log(`   Invalid files (.d.ts, .map): ${invalidFiles.length}`);

      if (invalidFiles.length > 0) {
        console.log('   ❌ Found invalid files:');
        invalidFiles.forEach(f => console.log(`      - ${f}`));
      } else {
        console.log('   ✅ No invalid files found');
      }

      expect(invalidFiles).toHaveLength(0);
    });
  });

  describe('Subdirectory Structure Validation', () => {
    it('should have correct agent count per subdirectory', () => {
      console.log('\n📊 Validating subdirectory structure...');

      const counts = countAgentsByDirectory();

      // Expected counts based on current structure
      // Updated to reflect actual agent counts:
      // - development now has 5 agents (added backend-agent)
      // - root has 1 agent (memory-test-agent)
      const expectedCounts = {
        'workflows': 3,    // orchestrator-agent, planner-agent, sparc-orchestrator
        'sparc': 7,        // research-agent, sparc-research-agent, specification-agent, pseudocode-agent, architecture-agent, refinement-agent, completion-agent
        'development': 5,  // builder-agent, backend-agent, frontend-agent, linter-agent, reviewer-agent
        'testing': 3,      // testing-agent, static-test-creator, static-test-absence-detector
        'tooling': 2,      // agent-creator, github-issue-creator
        'root': 1          // memory-test-agent
      };

      for (const [dir, expectedCount] of Object.entries(expectedCounts)) {
        console.log(`   ${dir}: expected ${expectedCount}, found ${counts[dir] || 0}`);
        expect(counts[dir] || 0).toBe(expectedCount);
      }

      console.log('   ✅ All subdirectory counts match expectations');
    });

    it('should find exactly 21 total agents (excluding base)', () => {
      console.log('\n🔢 Counting total agents...');

      const fsAgents = getAgentNamesFromFileSystem();
      const loaderAgents = AgentLoader.listAvailableAgents();

      console.log(`   File system: ${fsAgents.length} agents`);
      console.log(`   AgentLoader: ${loaderAgents.length} agents`);
      console.log(`   Expected: 21 agents`);

      // Updated to 21 agents total (was 19)
      expect(fsAgents).toHaveLength(21);
      expect(loaderAgents).toHaveLength(21);
    });

    it('should handle nested directory traversal correctly', () => {
      console.log('\n🌳 Testing nested directory traversal...');

      const agentsDir = path.resolve(process.cwd(), 'agents');
      const agentFiles = findAgentFilesInFileSystem();

      // Check that we're finding files in subdirectories
      const filesInSubdirs = agentFiles.filter(file => {
        const relativePath = path.relative(agentsDir, file);
        return relativePath.includes(path.sep); // Has at least one directory separator
      });

      console.log(`   Files in root: ${agentFiles.length - filesInSubdirs.length}`);
      console.log(`   Files in subdirectories: ${filesInSubdirs.length}`);

      // Most agents should be in subdirectories, but we now have memory-test-agent in root
      // So we expect: total files = files in subdirs + files in root
      // Files with agent names in root: 1 (memory-test-agent)
      // Files without agent names in root: 1 (base-agent if it exists in root, but it's in base/)
      // Total files = 22 (21 with names + 1 base without name)
      expect(filesInSubdirs.length).toBe(21); // 20 in subdirs + base-agent in base/

      console.log('   ✅ Correct distribution of agents in subdirectories');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-agent TypeScript files correctly', () => {
      console.log('\n📄 Checking non-agent files...');

      const agentsDir = path.resolve(process.cwd(), 'agents');
      const allTsFiles = findAgentFilesInFileSystem();

      // base-agent.ts exists but has no name field
      const baseAgentPath = path.join(agentsDir, 'base', 'base-agent.ts');

      if (fs.existsSync(baseAgentPath)) {
        const agentName = extractAgentNameFromFile(baseAgentPath);
        console.log(`   base-agent.ts name field: ${agentName || 'null'}`);

        // base-agent should not have a name
        expect(agentName).toBeNull();
      }

      console.log('   ✅ Non-agent files handled correctly');
    });

    it('should handle empty subdirectories gracefully', () => {
      console.log('\n📭 Checking empty directory handling...');

      // Create a temporary empty subdirectory
      const tempDir = path.resolve(process.cwd(), 'agents', 'temp-empty');

      try {
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Run the agent loader - should not crash
        const agents = AgentLoader.listAvailableAgents();
        expect(Array.isArray(agents)).toBe(true);

        console.log('   ✅ Empty directories handled gracefully');

        // Cleanup
        fs.rmdirSync(tempDir);
      } catch (error) {
        // Cleanup even if test fails
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
        throw error;
      }
    });

    it('should handle malformed agent files without crashing', () => {
      console.log('\n⚠️  Checking malformed file handling...');

      const agentFiles = findAgentFilesInFileSystem();

      // Try to extract names from all files - should not throw
      let successCount = 0;
      let nullCount = 0;

      for (const file of agentFiles) {
        const name = extractAgentNameFromFile(file);
        if (name) {
          successCount++;
        } else {
          nullCount++;
        }
      }

      console.log(`   Files with valid names: ${successCount}`);
      console.log(`   Files without names: ${nullCount}`);

      // Most files should have names (only base-agent.ts doesn't)
      expect(successCount).toBeGreaterThan(0);
      expect(nullCount).toBeLessThanOrEqual(1); // Only base-agent.ts

      console.log('   ✅ Malformed files handled without crashing');
    });
  });
});