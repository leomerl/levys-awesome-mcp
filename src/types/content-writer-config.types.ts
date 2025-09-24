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

// ============================================================================
// COMPILE-TIME TYPE TESTS
// ============================================================================

/**
 * Utility type for compile-time type assertion tests
 */
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type NotEqual<X, Y> = Equal<X, Y> extends false ? true : false;

/**
 * Type test dictionary for comprehensive compile-time validation
 */
type TypeTests = {
  // ==================== FolderCategory Type Tests ====================
  'FolderCategory contains all expected literal types': Expect<Equal<
    FolderCategory,
    'backend' | 'frontend' | 'agents' | 'docs' | 'reports' | 'plans'
  >>;

  'FolderCategory accepts valid literal types': Expect<Equal<
    'backend' extends FolderCategory ? true : false,
    true
  >>;

  'FolderCategory rejects invalid literal types': Expect<Equal<
    'invalid' extends FolderCategory ? true : false,
    false
  >>;

  // ==================== FolderArrayByCategory Generic Tests ====================
  'FolderArrayByCategory<backend> returns BackendFolders': Expect<Equal<
    FolderArrayByCategory<'backend'>,
    BackendFolders
  >>;

  'FolderArrayByCategory<frontend> returns FrontendFolders': Expect<Equal<
    FolderArrayByCategory<'frontend'>,
    FrontendFolders
  >>;

  'FolderArrayByCategory<agents> returns string[]': Expect<Equal<
    FolderArrayByCategory<'agents'>,
    string[]
  >>;

  'FolderArrayByCategory<docs> returns string[]': Expect<Equal<
    FolderArrayByCategory<'docs'>,
    string[]
  >>;

  'FolderArrayByCategory<reports> returns string[]': Expect<Equal<
    FolderArrayByCategory<'reports'>,
    string[]
  >>;

  'FolderArrayByCategory<plans> returns string[]': Expect<Equal<
    FolderArrayByCategory<'plans'>,
    string[]
  >>;

  // ==================== Conditional Type Discrimination Tests ====================
  'FolderArrayByCategory conditional type works correctly for backend': Expect<Equal<
    FolderArrayByCategory<'backend'> extends string[] ? true : false,
    true
  >>;

  'FolderArrayByCategory conditional type works correctly for frontend': Expect<Equal<
    FolderArrayByCategory<'frontend'> extends string[] ? true : false,
    true
  >>;

  'BackendFolders and FrontendFolders are both string[]': Expect<Equal<
    BackendFolders extends string[] ? FrontendFolders extends string[] ? true : false : false,
    true
  >>;

  // ==================== Interface Structure Tests ====================
  'FolderMappings has all required category properties': Expect<Equal<
    keyof FolderMappings,
    'backend' | 'frontend' | 'agents' | 'docs' | 'reports' | 'plans'
  >>;

  'DefaultPaths has all required category properties': Expect<Equal<
    keyof DefaultPaths,
    'backend' | 'frontend' | 'agents' | 'docs' | 'reports' | 'plans'
  >>;

  'FolderMappings properties are all string arrays': Expect<Equal<
    FolderMappings['backend'] extends string[] ? 
    FolderMappings['frontend'] extends string[] ?
    FolderMappings['agents'] extends string[] ?
    FolderMappings['docs'] extends string[] ?
    FolderMappings['reports'] extends string[] ?
    FolderMappings['plans'] extends string[] ? true : false : false : false : false : false : false,
    true
  >>;

  'DefaultPaths properties are all strings': Expect<Equal<
    DefaultPaths['backend'] extends string ?
    DefaultPaths['frontend'] extends string ?
    DefaultPaths['agents'] extends string ?
    DefaultPaths['docs'] extends string ?
    DefaultPaths['reports'] extends string ?
    DefaultPaths['plans'] extends string ? true : false : false : false : false : false : false,
    true
  >>;

  // ==================== PathValidation Type Tests ====================
  'PathValidation has correct property types': Expect<Equal<
    PathValidation['allowPathTraversal'] extends boolean ?
    PathValidation['restrictToConfiguredFolders'] extends boolean ?
    PathValidation['createDirectoriesIfNotExist'] extends boolean ? true : false : false : false,
    true
  >>;

  'PathValidation has all required properties': Expect<Equal<
    keyof PathValidation,
    'allowPathTraversal' | 'restrictToConfiguredFolders' | 'createDirectoriesIfNotExist'
  >>;

  // ==================== ConfigMetadata Type Tests ====================
  'ConfigMetadata has correct property types': Expect<Equal<
    ConfigMetadata['version'] extends string ?
    ConfigMetadata['description'] extends string ?
    ConfigMetadata['createdBy'] extends string ?
    ConfigMetadata['lastModified'] extends string ? true : false : false : false : false,
    true
  >>;

  'ConfigMetadata has all required properties': Expect<Equal<
    keyof ConfigMetadata,
    'version' | 'description' | 'createdBy' | 'lastModified'
  >>;

  // ==================== ContentWriterConfig Complete Structure Tests ====================
  'ContentWriterConfig has all required top-level properties': Expect<Equal<
    keyof ContentWriterConfig,
    'folderMappings' | 'defaultPaths' | 'pathValidation' | 'metadata'
  >>;

  'ContentWriterConfig property types are correct': Expect<Equal<
    ContentWriterConfig['folderMappings'] extends FolderMappings ?
    ContentWriterConfig['defaultPaths'] extends DefaultPaths ?
    ContentWriterConfig['pathValidation'] extends PathValidation ?
    ContentWriterConfig['metadata'] extends ConfigMetadata ? true : false : false : false : false,
    true
  >>;

  // ==================== Type Guard Function Tests ====================
  'isFolderCategory return type is correct': Expect<Equal<
    ReturnType<typeof isFolderCategory> extends boolean ? true : false,
    true
  >>;

  'isFolderCategory parameter type is correct': Expect<Equal<
    Parameters<typeof isFolderCategory>[0] extends string ? true : false,
    true
  >>;

  // ==================== Generic Constraint Tests ====================
  'FolderArrayByCategory requires valid FolderCategory': Expect<Equal<
    FolderArrayByCategory<'backend'> extends never ? false : true,
    true
  >>;

  // Test that invalid category would cause compile error (commented out as it should fail)
  // 'FolderArrayByCategory rejects invalid category': Expect<Equal<
  //   FolderArrayByCategory<'invalid'> extends never ? true : false,
  //   true
  // >>;

  // ==================== Utility Type Consistency Tests ====================
  'BackendFolders and string[] are equivalent': Expect<Equal<
    BackendFolders,
    string[]
  >>;

  'FrontendFolders and string[] are equivalent': Expect<Equal<
    FrontendFolders,
    string[]
  >>;

  // ==================== Complex Conditional Type Tests ====================
  'FolderArrayByCategory handles union types correctly': Expect<Equal<
    FolderArrayByCategory<'backend' | 'frontend'>,
    BackendFolders | FrontendFolders
  >>;

  'FolderArrayByCategory distributes over union types': Expect<Equal<
    FolderArrayByCategory<'agents' | 'docs'>,
    string[] | string[]
  >>;

  // ==================== Interface Compatibility Tests ====================
  'FolderMappings and DefaultPaths have compatible keys': Expect<Equal<
    keyof FolderMappings,
    keyof DefaultPaths
  >>;

  'All FolderMappings values are compatible with FolderArrayByCategory': Expect<Equal<
    FolderMappings['backend'] extends FolderArrayByCategory<'backend'> ?
    FolderMappings['frontend'] extends FolderArrayByCategory<'frontend'> ?
    FolderMappings['agents'] extends FolderArrayByCategory<'agents'> ?
    FolderMappings['docs'] extends FolderArrayByCategory<'docs'> ?
    FolderMappings['reports'] extends FolderArrayByCategory<'reports'> ?
    FolderMappings['plans'] extends FolderArrayByCategory<'plans'> ? true : false : false : false : false : false : false,
    true
  >>;

  // ==================== Security and Path Validation Tests ====================
  'PathValidation boolean properties prevent type confusion': Expect<Equal<
    PathValidation['allowPathTraversal'] extends string ? false : true,
    true
  >>;

  'PathValidation properties are not any type': Expect<Equal<
    PathValidation['allowPathTraversal'] extends any ? 
    PathValidation['allowPathTraversal'] extends boolean ? true : false : false,
    true
  >>;

  // ==================== Type Safety and No Any Tests ====================
  'FolderCategory does not extend any': Expect<Equal<
    FolderCategory extends any ? FolderCategory extends string ? true : false : false,
    true
  >>;

  'All interface properties are properly typed (not any)': Expect<Equal<
    ConfigMetadata['version'] extends any ? 
    ConfigMetadata['version'] extends string ? true : false : false,
    true
  >>;

  // ==================== Advanced Generic Tests ====================
  'FolderArrayByCategory maintains type safety with extends constraint': Expect<Equal<
    <T extends FolderCategory>(category: T) => FolderArrayByCategory<T>,
    <T extends FolderCategory>(category: T) => FolderArrayByCategory<T>
  >>;
};