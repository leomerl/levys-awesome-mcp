import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for folder mappings configuration
 */
interface FolderMappings {
  backend: string[];
  frontend: string[];
  agents: string[];
  docs: string[];
  reports: string[];
  plans: string[];
}

/**
 * Interface for default paths configuration
 */
interface DefaultPaths {
  backend: string;
  frontend: string;
  agents: string;
  docs: string;
  reports: string;
  plans: string;
}

/**
 * Interface for path validation settings
 */
interface PathValidation {
  allowPathTraversal: boolean;
  restrictToConfiguredFolders: boolean;
  createDirectoriesIfNotExist: boolean;
}

/**
 * Interface for configuration metadata
 */
interface ConfigMetadata {
  version: string;
  description: string;
  createdBy: string;
  lastModified: string;
}

/**
 * Main configuration interface
 */
export interface ContentWriterConfig {
  folderMappings: FolderMappings;
  defaultPaths: DefaultPaths;
  pathValidation: PathValidation;
  metadata: ConfigMetadata;
}

/**
 * Configuration validation error class
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Configuration file not found error class
 */
export class ConfigNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Configuration file not found: ${filePath}`);
    this.name = 'ConfigNotFoundError';
  }
}

/**
 * Creates a default configuration for backward compatibility
 * @returns ContentWriterConfig Default configuration with hardcoded paths
 */
export function createDefaultConfig(): ContentWriterConfig {
  return {
    folderMappings: {
      backend: ["backend/", "src/"],
      frontend: ["frontend/"],
      agents: ["agents/"],
      docs: ["docs/"],
      reports: ["reports/"],
      plans: ["plan_and_progress/"]
    },
    defaultPaths: {
      backend: "src",
      frontend: "frontend",
      agents: "agents",
      docs: "docs",
      reports: "reports",
      plans: "plan_and_progress"
    },
    pathValidation: {
      allowPathTraversal: false,
      restrictToConfiguredFolders: true,
      createDirectoriesIfNotExist: true
    },
    metadata: {
      version: "1.0.0",
      description: "Default fallback configuration for backward compatibility",
      createdBy: "system",
      lastModified: new Date().toISOString()
    }
  };
}

/**
 * Validates the structure of the configuration object
 * @param config - The parsed configuration object to validate
 * @throws {ConfigValidationError} If the configuration structure is invalid
 */
function validateConfig(config: unknown): asserts config is ContentWriterConfig {
  if (!config || typeof config !== 'object') {
    throw new ConfigValidationError('Configuration must be a valid object');
  }

  const cfg = config as Record<string, unknown>;

  // Validate folderMappings
  if (!cfg.folderMappings || typeof cfg.folderMappings !== 'object') {
    throw new ConfigValidationError('folderMappings is required and must be an object');
  }

  const folderMappings = cfg.folderMappings as Record<string, unknown>;
  const requiredFolders = ['backend', 'frontend', 'agents', 'docs', 'reports', 'plans'];
  
  for (const folder of requiredFolders) {
    if (!Array.isArray(folderMappings[folder])) {
      throw new ConfigValidationError(`folderMappings.${folder} must be an array of strings`);
    }
    
    const folderArray = folderMappings[folder] as unknown[];
    if (!folderArray.every(item => typeof item === 'string')) {
      throw new ConfigValidationError(`folderMappings.${folder} must contain only strings`);
    }
  }

  // Validate defaultPaths
  if (!cfg.defaultPaths || typeof cfg.defaultPaths !== 'object') {
    throw new ConfigValidationError('defaultPaths is required and must be an object');
  }

  const defaultPaths = cfg.defaultPaths as Record<string, unknown>;
  for (const folder of requiredFolders) {
    if (typeof defaultPaths[folder] !== 'string') {
      throw new ConfigValidationError(`defaultPaths.${folder} must be a string`);
    }
  }

  // Validate pathValidation
  if (!cfg.pathValidation || typeof cfg.pathValidation !== 'object') {
    throw new ConfigValidationError('pathValidation is required and must be an object');
  }

  const pathValidation = cfg.pathValidation as Record<string, unknown>;
  const pathValidationFields = ['allowPathTraversal', 'restrictToConfiguredFolders', 'createDirectoriesIfNotExist'];
  
  for (const field of pathValidationFields) {
    if (typeof pathValidation[field] !== 'boolean') {
      throw new ConfigValidationError(`pathValidation.${field} must be a boolean`);
    }
  }

  // Validate metadata
  if (!cfg.metadata || typeof cfg.metadata !== 'object') {
    throw new ConfigValidationError('metadata is required and must be an object');
  }

  const metadata = cfg.metadata as Record<string, unknown>;
  const metadataFields = ['version', 'description', 'createdBy', 'lastModified'];
  
  for (const field of metadataFields) {
    if (typeof metadata[field] !== 'string') {
      throw new ConfigValidationError(`metadata.${field} must be a string`);
    }
  }
}

/**
 * Loads and parses the content-writer.json configuration file
 * @param configPath - Optional path to the configuration file (defaults to content-writer.json in project root)
 * @returns Promise<ContentWriterConfig> The parsed and validated configuration
 * @throws {ConfigNotFoundError} If the configuration file doesn't exist
 * @throws {ConfigValidationError} If the configuration structure is invalid
 * @throws {SyntaxError} If the JSON file contains invalid syntax
 */
export async function loadContentWriterConfig(
  configPath: string = 'content-writer.json'
): Promise<ContentWriterConfig> {
  const absolutePath = path.resolve(configPath);

  try {
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new ConfigNotFoundError(absolutePath);
    }

    // Read the configuration file
    const configContent = await fs.promises.readFile(absolutePath, 'utf-8');
    
    // Parse JSON
    let parsedConfig: unknown;
    try {
      parsedConfig = JSON.parse(configContent);
    } catch (error) {
      throw new SyntaxError(`Invalid JSON syntax in configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate the configuration structure
    validateConfig(parsedConfig);

    return parsedConfig;
  } catch (error) {
    if (error instanceof ConfigNotFoundError || 
        error instanceof ConfigValidationError || 
        error instanceof SyntaxError) {
      throw error;
    }
    
    // Handle other file system errors
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Synchronous version of loadContentWriterConfig
 * @param configPath - Optional path to the configuration file (defaults to content-writer.json in project root)
 * @returns ContentWriterConfig The parsed and validated configuration
 * @throws {ConfigNotFoundError} If the configuration file doesn't exist
 * @throws {ConfigValidationError} If the configuration structure is invalid
 * @throws {SyntaxError} If the JSON file contains invalid syntax
 */
export function loadContentWriterConfigSync(
  configPath: string = 'content-writer.json'
): ContentWriterConfig {
  const absolutePath = path.resolve(configPath);

  try {
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new ConfigNotFoundError(absolutePath);
    }

    // Read the configuration file synchronously
    const configContent = fs.readFileSync(absolutePath, 'utf-8');
    
    // Parse JSON
    let parsedConfig: unknown;
    try {
      parsedConfig = JSON.parse(configContent);
    } catch (error) {
      throw new SyntaxError(`Invalid JSON syntax in configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate the configuration structure
    validateConfig(parsedConfig);

    return parsedConfig;
  } catch (error) {
    if (error instanceof ConfigNotFoundError || 
        error instanceof ConfigValidationError || 
        error instanceof SyntaxError) {
      throw error;
    }
    
    // Handle other file system errors
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Loads configuration with fallback to default values for backward compatibility
 * @param configPath - Optional path to the configuration file (defaults to content-writer.json in project root)
 * @returns ContentWriterConfig The configuration (loaded from file or default fallback)
 */
export function loadContentWriterConfigWithFallback(
  configPath: string = 'content-writer.json'
): ContentWriterConfig {
  try {
    return loadContentWriterConfigSync(configPath);
  } catch (error) {
    // Log warning but continue with default configuration for backward compatibility
    console.warn('Warning: Failed to load content-writer configuration file, falling back to default hardcoded paths:', 
      error instanceof Error ? error.message : String(error));
    return createDefaultConfig();
  }
}

/**
 * Gets the folder mappings for a specific category
 * @param config - The loaded configuration
 * @param category - The category to get mappings for
 * @returns string[] Array of folder paths for the category
 */
export function getFolderMappings(config: ContentWriterConfig, category: keyof FolderMappings): string[] {
  return config.folderMappings[category];
}

/**
 * Gets the default path for a specific category
 * @param config - The loaded configuration
 * @param category - The category to get the default path for
 * @returns string The default path for the category
 */
export function getDefaultPath(config: ContentWriterConfig, category: keyof DefaultPaths): string {
  return config.defaultPaths[category];
}

/**
 * Checks if a given path is allowed based on the configuration
 * @param config - The loaded configuration
 * @param filePath - The path to validate
 * @param category - The category to check against
 * @returns boolean True if the path is allowed, false otherwise
 */
export function isPathAllowed(
  config: ContentWriterConfig, 
  filePath: string, 
  category: keyof FolderMappings
): boolean {
  const allowedPaths = config.folderMappings[category];
  const normalizedPath = path.normalize(filePath);
  
  // Check if path traversal is allowed
  if (!config.pathValidation.allowPathTraversal && normalizedPath.includes('..')) {
    return false;
  }
  
  // Check if path starts with any of the allowed paths for the category
  return allowedPaths.some(allowedPath => {
    const normalizedAllowedPath = path.normalize(allowedPath);
    return normalizedPath.startsWith(normalizedAllowedPath);
  });
}