/**
 * TypeScript interfaces and types for the content-writer configuration structure
 */

/**
 * Represents a folder category with its mapped paths
 */
export type FolderCategory = 'backend' | 'frontend' | 'agents' | 'docs' | 'reports' | 'plans';

/**
 * Configuration for folder mappings - maps category to array of folder paths
 */
export interface FolderMappings {
  /** Backend development folders */
  backend: string[];
  /** Frontend development folders */
  frontend: string[];
  /** Agent configuration folders */
  agents: string[];
  /** Documentation folders */
  docs: string[];
  /** Report output folders */
  reports: string[];
  /** Planning and progress tracking folders */
  plans: string[];
}

/**
 * Default paths for each folder category
 */
export interface DefaultPaths {
  /** Default backend folder path */
  backend: string;
  /** Default frontend folder path */
  frontend: string;
  /** Default agents folder path */
  agents: string;
  /** Default documentation folder path */
  docs: string;
  /** Default reports folder path */
  reports: string;
  /** Default plans folder path */
  plans: string;
}

/**
 * Path validation configuration options
 */
export interface PathValidation {
  /** Whether to allow path traversal (../) in paths */
  allowPathTraversal: boolean;
  /** Whether to restrict operations to configured folders only */
  restrictToConfiguredFolders: boolean;
  /** Whether to create directories if they don't exist */
  createDirectoriesIfNotExist: boolean;
}

/**
 * Metadata information for the configuration
 */
export interface ConfigMetadata {
  /** Configuration version */
  version: string;
  /** Description of the configuration purpose */
  description: string;
  /** Agent or user who created the configuration */
  createdBy: string;
  /** Last modification date */
  lastModified: string;
}

/**
 * Complete content-writer configuration structure
 */
export interface ContentWriterConfig {
  /** Folder mappings for different categories */
  folderMappings: FolderMappings;
  /** Default paths for each category */
  defaultPaths: DefaultPaths;
  /** Path validation settings */
  pathValidation: PathValidation;
  /** Configuration metadata */
  metadata: ConfigMetadata;
}

/**
 * Type guard to check if a string is a valid folder category
 */
export function isFolderCategory(value: string): value is FolderCategory {
  return ['backend', 'frontend', 'agents', 'docs', 'reports', 'plans'].includes(value);
}

/**
 * Type for backend folder arrays specifically
 */
export type BackendFolders = string[];

/**
 * Type for frontend folder arrays specifically  
 */
export type FrontendFolders = string[];

/**
 * Utility type to get folder array type by category
 */
export type FolderArrayByCategory<T extends FolderCategory> = 
  T extends 'backend' ? BackendFolders :
  T extends 'frontend' ? FrontendFolders :
  string[];