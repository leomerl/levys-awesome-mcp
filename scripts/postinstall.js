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

    // Find the project root (where npm install was run from)
    // This will be the cwd when postinstall runs
    const projectRoot = process.cwd();

    // Skip if we're in the package itself (during development)
    if (projectRoot === packageRoot) {
      console.log('Skipping postinstall: running in package directory');
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