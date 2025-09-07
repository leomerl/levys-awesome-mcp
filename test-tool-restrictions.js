#!/usr/bin/env node

/**
 * Test script for the new tool restriction system
 * Demonstrates awesome-claude-code patterns for agent tool enforcement
 */

import { PermissionManager } from './dist/src/utilities/agents/permission-manager.js';

console.log('🧪 Testing Tool Restriction System\n');

// Test 1: YAML frontmatter parsing
console.log('=== Test 1: YAML Frontmatter Parsing ===');
const yamlExamples = [
  // Code reviewer with explicit tools
  `---
name: code-reviewer
description: "Reviews code without making changes"
tools: Read, Grep, Glob, WebFetch
role: read-only
---

# Code Reviewer Agent
System prompt content here...`,

  // Orchestrator with tool inheritance (omitted tools field)
  `---
name: orchestrator-planner
description: "Strategic planning agent"
# tools: omit for all tools inheritance
role: full-access
---

# Orchestrator Agent
System prompt content here...`,

  // Mixed approach
  `---
name: specialized-agent
description: "Custom agent"
tools: ["Read", "Grep", "custom-tool"]
role: write-restricted
---

# Specialized Agent
System prompt content here...`
];

yamlExamples.forEach((yaml, index) => {
  console.log(`\nYAML Example ${index + 1}:`);
  const parsed = PermissionManager.parseYAMLFrontmatter(yaml);
  console.log('Parsed config:', JSON.stringify(parsed, null, 2));
  
  if (parsed) {
    const permissionConfig = PermissionManager.fromYAMLConfig(parsed);
    console.log('Permission config:', JSON.stringify(permissionConfig, null, 2));
    
    const finalPermissions = PermissionManager.getAgentPermissions(permissionConfig);
    console.log('Final permissions:', JSON.stringify(finalPermissions, null, 2));
  }
});

// Test 2: Role-based security profiles
console.log('\n=== Test 2: Security Profiles ===');
const roles = ['read-only', 'write-restricted', 'security-sensitive', 'full-access'];

roles.forEach(role => {
  console.log(`\n${role.toUpperCase()} Profile:`);
  const tools = PermissionManager.getToolsForRole(role);
  console.log('Allowed built-in tools:', tools);
  
  const permissions = PermissionManager.getAgentPermissions({
    allowedTools: ['mcp__custom-tool'],
    agentRole: role
  });
  console.log('Final permissions:', JSON.stringify(permissions, null, 2));
});

// Test 3: Security validation
console.log('\n=== Test 3: Security Validation ===');
const securityTests = [
  {
    name: 'Code Reviewer (Read-Only)',
    config: { allowedTools: [], agentRole: 'read-only' }
  },
  {
    name: 'Frontend Agent (Write-Restricted)',
    config: { 
      allowedTools: ['mcp__content-writer__frontend_write'], 
      agentRole: 'write-restricted' 
    }
  },
  {
    name: 'Legacy Agent (No Role)',
    config: { allowedTools: ['Read', 'Write', 'Bash'] }
  },
  {
    name: 'Orchestrator (Full Access)', 
    config: { allowedTools: [], agentRole: 'full-access' }
  }
];

securityTests.forEach(test => {
  console.log(`\n${test.name}:`);
  const permissions = PermissionManager.getAgentPermissions(test.config);
  
  console.log(`✅ Allowed tools (${permissions.allowedTools.length}):`, permissions.allowedTools);
  console.log(`❌ Denied tools (${permissions.disallowedTools.length}):`, permissions.disallowedTools.slice(0, 5), '...');
  
  // Security checks
  const hasWrite = permissions.allowedTools.includes('Write');
  const hasBash = permissions.allowedTools.includes('Bash');
  const hasTask = permissions.allowedTools.includes('Task');
  
  console.log(`🔒 Security check - Write access: ${hasWrite ? '⚠️  YES' : '✅ BLOCKED'}`);
  console.log(`🔒 Security check - Bash access: ${hasBash ? '⚠️  YES' : '✅ BLOCKED'}`);
  console.log(`🔒 Security check - Task access: ${hasTask ? '⚠️  YES' : '✅ BLOCKED'}`);
});

// Test 4: Summary permissions
console.log('\n=== Test 4: Summary Permissions ===');
const baseConfig = { allowedTools: ['Read', 'Grep'], agentRole: 'read-only' };
const summaryPermissions = PermissionManager.getSummaryPermissions(baseConfig);
console.log('Base permissions:', PermissionManager.getAgentPermissions(baseConfig).allowedTools);
console.log('With summary permissions:', summaryPermissions.allowedTools);

// Test 5: Profile documentation
console.log('\n=== Test 5: Security Profile Reference ===');
const profiles = PermissionManager.getSecurityProfiles();
Object.entries(profiles).forEach(([role, profile]) => {
  console.log(`\n${role.toUpperCase()}:`);
  console.log(`  Description: ${profile.description}`);
  console.log(`  Allowed: ${profile.allowedBuiltInTools.join(', ')}`);
  console.log(`  Denied: ${profile.deniedBuiltInTools.join(', ')}`);
});

console.log('\n✅ Tool restriction testing completed!');
console.log('\n📖 For full documentation, see: docs/agent-tool-restrictions.md');