import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

export const agentGeneratorTools = [
  {
    name: 'convert_agent_ts_to_claude_md',
    description: 'Convert a TypeScript agent file to Claude agent markdown format',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentPath: {
          type: 'string',
          description: 'Path to the TypeScript agent file (e.g., "agents/builder.ts")'
        }
      },
      required: ['agentPath'],
      additionalProperties: false
    }
  },
  {
    name: 'convert_all_agents_ts_to_claude_md',
    description: 'Convert all TypeScript agent files in agents/ directory to Claude agent markdown format',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'remove_all_agent_md_files',
    description: 'Remove all generated agent markdown files from .claude/agents/ directory',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  }
];

async function convertTSAgentToMD(agentPath: string): Promise<string> {
  const fileContent = await readFile(agentPath, 'utf8');
  
  // Extract basic properties using regex
  const nameMatch = fileContent.match(/name:\s*['"`]([^'"`]+)['"`]/);
  const descMatch = fileContent.match(/description:\s*['"`]([^'"`]+)['"`]/);
  const modelMatch = fileContent.match(/model[?]?:\s*['"`]([^'"`]+)['"`]/);
  
  // Extract systemPrompt (handle multiline template literals)
  const systemPromptMatch = fileContent.match(/systemPrompt:\s*`([\s\S]*?)`/);
  
  // Extract prompt (can be at root or in options)
  const promptMatch = fileContent.match(/prompt:\s*['"`]([^'"`]+)['"`]/);
  
  // Extract arrays using simple string parsing - no regex
  function extractArrayNoRegex(fieldName: string): string[] {
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
    const result: string[] = [];
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
  
  // Try to extract allowed tools from either schema
  let allowedTools = extractArrayNoRegex('allowedTools');
  if (allowedTools.length === 0) {
    // Try old schema with permissions.tools.allowed
    allowedTools = extractArrayNoRegex('allowed');
  }
  
  let disallowedTools = extractArrayNoRegex('disallowedTools');
  if (disallowedTools.length === 0) {
    // Try old schema with permissions.tools.denied
    disallowedTools = extractArrayNoRegex('denied');
  }
  
  // Try to extract mcp servers from either schema
  let mcpServers = extractArrayNoRegex('mcpServers');
  if (mcpServers.length === 0) {
    // Try to find servers in the old schema format
    const mcpServersObj = fileContent.match(/mcpServers:\s*\{([^}]+)\}/);
    if (mcpServersObj) {
      const serversContent = mcpServersObj[1];
      const serverNames = serversContent.match(/'([^']+)':\s*'allow'/g);
      if (serverNames) {
        mcpServers = serverNames.map(match => match.match(/'([^']+)':/)?.[1]).filter(Boolean) as string[];
      }
    }
  }
  
  // Debug output
  console.log('=== EXTRACTION DEBUG ===');
  console.log('allowedTools found:', allowedTools);
  console.log('mcpServers found:', mcpServers);
  
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

export async function handleAgentGeneratorTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'convert_agent_ts_to_claude_md':
      case 'mcp__levys-awesome-mcp__mcp__agent-generator__convert_agent_ts_to_claude_md': {
        const { agentPath } = args;
        
        // Resolve full path
        const fullPath = path.resolve(agentPath);
        
        // Generate markdown content
        const markdown = await convertTSAgentToMD(fullPath);
        
        // Ensure .claude/agents directory exists
        const outputDir = path.join(process.cwd(), '.claude', 'agents');
        if (!existsSync(outputDir)) {
          await mkdir(outputDir, { recursive: true });
        }
        
        // Generate output filename
        const fileName = path.basename(agentPath, '.ts') + '.md';
        const outputPath = path.join(outputDir, fileName);
        
        // Write the markdown file
        await writeFile(outputPath, markdown, 'utf8');
        
        return {
          content: [{
            type: 'text',
            text: `Successfully converted ${agentPath} to ${outputPath}`
          }]
        };
      }

      case 'convert_all_agents_ts_to_claude_md':
      case 'mcp__levys-awesome-mcp__mcp__agent-generator__convert_all_agents_ts_to_claude_md': {
        const agentsDir = path.join(process.cwd(), 'agents');
        const outputDir = path.join(process.cwd(), '.claude', 'agents');
        
        // Ensure agents directory exists
        if (!existsSync(agentsDir)) {
          return {
            content: [{
              type: 'text',
              text: `Agents directory not found: ${agentsDir}`
            }],
            isError: true
          };
        }
        
        // Ensure output directory exists
        if (!existsSync(outputDir)) {
          await mkdir(outputDir, { recursive: true });
        }
        
        // Get all .ts files in agents directory
        const files = await readdir(agentsDir);
        const tsFiles = files.filter(file => file.endsWith('.ts'));
        
        const results = [];
        let successCount = 0;
        
        for (const tsFile of tsFiles) {
          try {
            const agentPath = path.join(agentsDir, tsFile);
            const markdown = await convertTSAgentToMD(agentPath);
            
            const fileName = path.basename(tsFile, '.ts') + '.md';
            const outputPath = path.join(outputDir, fileName);
            
            await writeFile(outputPath, markdown, 'utf8');
            results.push(`✓ ${tsFile} → ${fileName}`);
            successCount++;
          } catch (error) {
            results.push(`✗ ${tsFile} → Error: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: `Build complete: ${successCount}/${tsFiles.length} agents converted\n\n${results.join('\n')}\n\nOutput directory: ${outputDir}`
          }]
        };
      }

      case 'remove_all_agent_md_files':
      case 'mcp__levys-awesome-mcp__mcp__agent-generator__remove_all_agent_md_files': {
        const outputDir = path.join(process.cwd(), '.claude', 'agents');
        
        // Check if output directory exists
        if (!existsSync(outputDir)) {
          return {
            content: [{
              type: 'text',
              text: `No agent files to remove - directory does not exist: ${outputDir}`
            }]
          };
        }
        
        // Get all .md files in the directory
        const files = await readdir(outputDir);
        const mdFiles = files.filter(file => file.endsWith('.md'));
        
        if (mdFiles.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No agent markdown files found in ${outputDir}`
            }]
          };
        }
        
        // Remove all .md files
        const results = [];
        let removedCount = 0;
        
        for (const mdFile of mdFiles) {
          try {
            const filePath = path.join(outputDir, mdFile);
            await unlink(filePath);
            results.push(`✓ Removed ${mdFile}`);
            removedCount++;
          } catch (error) {
            results.push(`✗ Failed to remove ${mdFile}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: `Cleanup complete: ${removedCount}/${mdFiles.length} agent files removed\n\n${results.join('\n')}`
          }]
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown agent generator tool: ${name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Agent generator error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}