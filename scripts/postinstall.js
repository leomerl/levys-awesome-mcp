#!/usr/bin/env node

import { copyFileSync, mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert TypeScript agent to Claude markdown format
 */
function convertTSAgentToMD(agentPath) {
  const fileContent = readFileSync(agentPath, 'utf8');

  // Extract basic properties using regex
  const nameMatch = fileContent.match(/name:\s*['"`]([^'"`]+)['"`]/);
  const descMatch = fileContent.match(/description:\s*['"`]([^'"`]+)['"`]/);
  const modelMatch = fileContent.match(/model[?]?:\s*['"`]([^'"`]+)['"`]/);

  // Extract systemPrompt (handle multiline template literals)
  const systemPromptMatch = fileContent.match(/systemPrompt:\s*`([\s\S]*?)`/);

  // Extract prompt (can be at root or in options)
  const promptMatch = fileContent.match(/prompt:\s*['"`]([^'"`]+)['"`]/);

  // Extract arrays using simple string parsing
  function extractArrayNoRegex(fieldName) {
    const startPattern = `${fieldName}: [`;
    let startIndex = fileContent.indexOf(startPattern);

    // Try with spaces around colon
    if (startIndex === -1) {
      const altPattern = `${fieldName} : [`;
      startIndex = fileContent.indexOf(altPattern);
    }

    if (startIndex === -1) return [];

    // Find the opening bracket
    const openBracketIndex = fileContent.indexOf('[', startIndex);
    if (openBracketIndex === -1) return [];

    // Find matching closing bracket by counting brackets
    let bracketCount = 0;
    let closeBracketIndex = -1;

    for (let i = openBracketIndex; i < fileContent.length; i++) {
      if (fileContent[i] === '[') bracketCount++;
      if (fileContent[i] === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          closeBracketIndex = i;
          break;
        }
      }
    }

    if (closeBracketIndex === -1) return [];

    // Extract content between brackets
    const arrayContent = fileContent.substring(openBracketIndex + 1, closeBracketIndex);

    // Find all quoted strings manually
    const result = [];
    let inQuote = false;
    let quoteChar = '';
    let currentString = '';

    for (let i = 0; i < arrayContent.length; i++) {
      const char = arrayContent[i];

      if (!inQuote && (char === '"' || char === "'")) {
        inQuote = true;
        quoteChar = char;
        currentString = '';
      } else if (inQuote && char === quoteChar) {
        inQuote = false;
        if (currentString.trim()) {
          result.push(currentString);
        }
        currentString = '';
      } else if (inQuote) {
        currentString += char;
      }
    }

    return result;
  }

  // Try to extract allowed tools
  let allowedTools = extractArrayNoRegex('allowedTools');
  if (allowedTools.length === 0) {
    allowedTools = extractArrayNoRegex('allowed');
  }

  let disallowedTools = extractArrayNoRegex('disallowedTools');
  if (disallowedTools.length === 0) {
    disallowedTools = extractArrayNoRegex('denied');
  }

  // Try to extract mcp servers
  let mcpServers = extractArrayNoRegex('mcpServers');
  if (mcpServers.length === 0) {
    const mcpServersObj = fileContent.match(/mcpServers:\s*\{([^}]+)\}/);
    if (mcpServersObj) {
      const serversContent = mcpServersObj[1];
      const serverNames = serversContent.match(/'([^']+)':\s*'allow'/g);
      if (serverNames) {
        mcpServers = serverNames.map(match => match.match(/'([^']+)':/)?.[1]).filter(Boolean);
      }
    }
  }

  if (!nameMatch) {
    throw new Error('Could not find agent name in file');
  }

  const name = nameMatch[1];
  const description = descMatch ? descMatch[1] : 'Agent description';
  const model = modelMatch ? modelMatch[1] : 'sonnet';
  const systemPrompt = systemPromptMatch ? systemPromptMatch[1].trim() : '';
  const prompt = promptMatch ? promptMatch[1] : undefined;

  // Build markdown content
  let markdown = `---
name: ${name}
description: ${description}
model: ${model}`;

  if (prompt) {
    markdown += `
prompt: ${prompt}`;
  }

  // Add allowedTools if present
  if (allowedTools.length > 0) {
    markdown += `
allowedTools:`;
    allowedTools.forEach(tool => {
      markdown += `
  - ${tool}`;
    });
  }

  // Add disallowedTools if present
  if (disallowedTools.length > 0) {
    markdown += `
disallowedTools:`;
    disallowedTools.forEach(tool => {
      markdown += `
  - ${tool}`;
    });
  }

  // Add mcpServers if present
  if (mcpServers.length > 0) {
    markdown += `
mcpServers:`;
    mcpServers.forEach(server => {
      markdown += `
  - ${server}`;
    });
  }

  markdown += `
---

${systemPrompt}`;

  return markdown;
}

/**
 * Recursively find all .ts files in a directory
 */
function findTsFiles(dir, results = []) {
  if (!existsSync(dir)) {
    return results;
  }

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      findTsFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.ts') &&
               !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

function copyCommandsToClaudeDir() {
  try {
    // Get the package root directory
    const packageRoot = join(__dirname, '..');
    const commandsSource = join(packageRoot, 'commands');

    // Find the actual project root
    // When installed as a dependency, we're in node_modules/@leomerl/levys-awesome-mcp
    // So project root is three levels up from package root (scope → node_modules → root)
    let projectRoot;

    // Check if we're in node_modules
    if (packageRoot.includes('node_modules')) {
      // Go up from node_modules/@leomerl/levys-awesome-mcp to project root
      // Path: .. → @leomerl/, .. → node_modules/, .. → project root
      projectRoot = join(packageRoot, '..', '..', '..');
    } else {
      // We're running in development, skip
      console.log('Skipping postinstall: not installed as a dependency');
      return;
    }

    // Create .claude/commands directory in project root
    const claudeDir = join(projectRoot, '.claude');
    const claudeCommandsDir = join(claudeDir, 'commands');

    // Create directories if they don't exist
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }

    if (!existsSync(claudeCommandsDir)) {
      mkdirSync(claudeCommandsDir, { recursive: true });
    }

    // Check if source commands directory exists
    if (!existsSync(commandsSource)) {
      console.log('Commands directory not found in package');
      return;
    }

    // Copy all files from commands directory
    const files = readdirSync(commandsSource);
    let copiedCount = 0;

    files.forEach(file => {
      const sourcePath = join(commandsSource, file);
      const destPath = join(claudeCommandsDir, file);

      try {
        copyFileSync(sourcePath, destPath);
        copiedCount++;
        console.log(`Copied: ${file} -> .claude/commands/`);
      } catch (error) {
        console.error(`Failed to copy ${file}:`, error.message);
      }
    });

    if (copiedCount > 0) {
      console.log(`✓ Successfully copied ${copiedCount} command file(s) to .claude/commands/`);
    }

  } catch (error) {
    console.error('Error during postinstall:', error.message);
    // Don't fail the installation if postinstall fails
    process.exit(0);
  }
}

function convertAgentsToMarkdown() {
  try {
    // Get the package root directory
    const packageRoot = join(__dirname, '..');
    const agentsSource = join(packageRoot, 'agents');

    // Find the actual project root
    let projectRoot;

    // Check if we're in node_modules
    if (packageRoot.includes('node_modules')) {
      // Go up from node_modules/@leomerl/levys-awesome-mcp to project root
      projectRoot = join(packageRoot, '..', '..', '..');
    } else {
      // We're running in development, skip
      console.log('Skipping agent conversion: not installed as a dependency');
      return;
    }

    // Check if agents directory exists
    if (!existsSync(agentsSource)) {
      console.log('Agents directory not found in package');
      return;
    }

    // Create .claude/agents directory in project root
    const claudeAgentsDir = join(projectRoot, '.claude', 'agents');
    if (!existsSync(claudeAgentsDir)) {
      mkdirSync(claudeAgentsDir, { recursive: true });
    }

    // Find all TypeScript agent files
    const tsFiles = findTsFiles(agentsSource);

    if (tsFiles.length === 0) {
      console.log('No agent TypeScript files found');
      return;
    }

    let convertedCount = 0;
    const results = [];

    // Convert each agent file
    for (const agentPath of tsFiles) {
      try {
        const markdown = convertTSAgentToMD(agentPath);

        const fileName = basename(agentPath, '.ts') + '.md';
        const outputPath = join(claudeAgentsDir, fileName);

        writeFileSync(outputPath, markdown, 'utf8');
        const relativePath = relative(agentsSource, agentPath);
        results.push(`✓ ${relativePath} → ${fileName}`);
        convertedCount++;
      } catch (error) {
        const relativePath = relative(agentsSource, agentPath);
        results.push(`✗ ${relativePath} → Error: ${error.message}`);
      }
    }

    if (convertedCount > 0) {
      console.log(`\n✓ Successfully converted ${convertedCount}/${tsFiles.length} agent file(s) to .claude/agents/`);
      results.forEach(result => console.log(`  ${result}`));
    }

  } catch (error) {
    console.error('Error during agent conversion:', error.message);
    // Don't fail the installation if agent conversion fails
  }
}

// Run the setup functions
copyCommandsToClaudeDir();
convertAgentsToMarkdown();