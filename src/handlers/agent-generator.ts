import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

export const agentGeneratorTools = [
  {
    name: 'mcp__levys-awesome-mcp__mcp__agent-generator__convert_agent_ts_to_claude_md',
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
    name: 'mcp__levys-awesome-mcp__mcp__agent-generator__convert_all_agents_ts_to_claude_md',
    description: 'Convert all TypeScript agent files in agents/ directory to Claude agent markdown format',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__agent-generator__remove_all_agent_md_files',
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
  
  if (!nameMatch) {
    throw new Error('Could not find agent name in file');
  }
  
  const name = nameMatch[1];
  const description = descMatch ? descMatch[1] : 'Agent description';
  const model = modelMatch ? modelMatch[1] : 'sonnet';
  const systemPrompt = systemPromptMatch ? systemPromptMatch[1].trim() : '';
  
  // Format like demo.md
  return `---
name: ${name}
description: ${description}
model: ${model}
---

${systemPrompt}`;
}

export async function handleAgentGeneratorTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
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