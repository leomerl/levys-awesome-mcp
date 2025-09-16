#!/usr/bin/env node

import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function copyCommandsToClaudeDir() {
  try {
    // Get the package root directory
    const packageRoot = join(__dirname, '..');
    const commandsSource = join(packageRoot, 'commands');

    // Find the actual project root
    // When installed as a dependency, we're in node_modules/levys-awesome-mcp
    // So project root is two levels up from package root
    let projectRoot;

    // Check if we're in node_modules
    if (packageRoot.includes('node_modules')) {
      // Go up from node_modules/levys-awesome-mcp to project root
      projectRoot = join(packageRoot, '..', '..');
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


// Run the copy function
copyCommandsToClaudeDir();