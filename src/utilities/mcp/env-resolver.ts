/**
 * Environment Variable Resolution Utilities
 * Handles loading and resolving env vars with placeholders
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Load environment variables from .env file
 * Only loads once per process
 */
let envLoaded = false;
export function loadEnvVars(): void {
  if (envLoaded) {
    return;
  }

  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    console.log('[EnvResolver] Loaded environment variables from .env');
  } else {
    console.log('[EnvResolver] No .env file found, using system environment variables only');
    envLoaded = true;
  }
}

/**
 * Resolve environment variable placeholders in a string
 * Supports ${VAR_NAME} syntax
 *
 * @param value - String with potential env var placeholders
 * @returns Resolved string with env vars substituted
 */
export function resolveEnvVars(value: string): string {
  // Ensure env vars are loaded
  loadEnvVars();

  // Match ${VAR_NAME} patterns
  return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      console.warn(`[EnvResolver] Environment variable ${varName} not found, keeping placeholder`);
      return match; // Keep original placeholder if not found
    }
    return envValue;
  });
}

/**
 * Resolve env var placeholders in an array of strings
 *
 * @param values - Array of strings with potential placeholders
 * @returns Array with resolved values
 */
export function resolveEnvVarsInArray(values: string[]): string[] {
  return values.map(v => resolveEnvVars(v));
}

/**
 * Check if required environment variables are present
 *
 * @param requiredVars - Array of required env var names
 * @returns Object with validation result and missing vars
 */
export function validateRequiredEnvVars(requiredVars: string[]): {
  isValid: boolean;
  missingVars: string[];
} {
  // Ensure env vars are loaded
  loadEnvVars();

  const missingVars = requiredVars.filter(varName => {
    return process.env[varName] === undefined || process.env[varName] === '';
  });

  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

/**
 * Get an environment variable value
 *
 * @param varName - Name of the environment variable
 * @param defaultValue - Optional default value if not found
 * @returns The env var value or default
 */
export function getEnvVar(varName: string, defaultValue?: string): string | undefined {
  loadEnvVars();
  return process.env[varName] ?? defaultValue;
}

/**
 * Check if a string contains env var placeholders
 *
 * @param value - String to check
 * @returns True if contains ${...} patterns
 */
export function hasEnvVarPlaceholders(value: string): boolean {
  return /\$\{[^}]+\}/.test(value);
}

/**
 * Resolve env var placeholders in HTTP headers object
 *
 * @param headers - Headers object with potential placeholders in values
 * @returns Headers object with resolved values
 */
export function resolveEnvVarsInHeaders(headers: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    resolved[key] = resolveEnvVars(value);
  }

  return resolved;
}
