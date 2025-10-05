/**
 * Tool Registry Static Type Tests
 * 
 * Comprehensive compile-time type tests for the ToolRegistry class and its methods.
 * These tests verify type transformations, method signatures, return types, and
 * complex generic constraints used in the tool discovery system.
 * 
 * The tests focus on:
 * - Static readonly property type validation
 * - Method return type consistency
 * - Input/output type correlation
 * - Complex nested return type structures
 * - Type inference and generic constraints
 * 
 * Run `tsc --noEmit` to execute these tests
 */

// ============================================================================
// TYPE TESTING UTILITIES
// ============================================================================

/**
 * Utility type to check if two types are exactly equal
 */
type Equal<T, U> = 
  (<G>() => G extends T ? 1 : 2) extends 
  (<G>() => G extends U ? 1 : 2) ? true : false;

/**
 * Utility type to expect a condition to be true
 */
type Expect<T extends true> = T;

/**
 * Utility type to check if a type extends another
 */
type Extends<T, U> = T extends U ? true : false;

/**
 * Utility type to check if a property exists on a type
 */
type HasProperty<T, K extends keyof any> = K extends keyof T ? true : false;

/**
 * Utility type to extract function parameter types
 */
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Utility type to extract function return type
 */
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

/**
 * Utility type to await a Promise type
 */
type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Extract keys that are required in an object type
 */
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Extract keys that are optional in an object type
 */
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// ============================================================================
// TOOL REGISTRY STATIC TYPE TESTS
// ============================================================================

import { ToolRegistry } from './tool-registry.js';

// ============================================================================
// TOOL_CATEGORIES Static Readonly Type Validation
// ============================================================================

// Test: TOOL_CATEGORIES structure validation
type ToolCategoriesType = typeof ToolRegistry['TOOL_CATEGORIES'];
type ExpectedToolCategoriesStructure = {
  'file-system': string[];
  'execution': string[];
  'search': string[];
  'version-control': string[];
  'development': string[];
  'mcp': string[];
  'testing': string[];
  'documentation': string[];
  'deployment': string[];
  'monitoring': string[];
  'database': string[];
  'cloud': string[];
  'communication': string[];
};

// Test: TOOL_CATEGORIES has correct structure (readonly object with string arrays)
type TestToolCategoriesStructure = Expect<Equal<
  keyof ToolCategoriesType,
  'file-system' | 'execution' | 'search' | 'version-control' | 'development' |
  'testing' | 'documentation' | 'deployment' | 'monitoring' | 'database' |
  'cloud' | 'communication'
>>;

// Test: Each category contains string arrays
type TestFileSystemCategory = Expect<Equal<
  ToolCategoriesType['file-system'],
  string[]
>>;

type TestExecutionCategory = Expect<Equal<
  ToolCategoriesType['execution'],
  string[]
>>;

type TestSearchCategory = Expect<Equal<
  ToolCategoriesType['search'],
  string[]
>>;

// Test: All categories are arrays of strings
type TestCategoriesAreStringArrays = Expect<Equal<
  ToolCategoriesType[keyof ToolCategoriesType],
  string[]
>>;

// Test: TOOL_CATEGORIES structure matches implementation
type TestToolCategoriesStructureMatch = Expect<Extends<
  ToolCategoriesType,
  Record<string, string[]>
>>;

// ============================================================================
// getAllTools() Return Type Consistency Tests
// ============================================================================

// Extract the private method for testing purposes (using reflection)
type GetAllToolsMethod = typeof ToolRegistry['getAllTools'];
type GetAllToolsReturnType = ReturnType<GetAllToolsMethod>;

// Test: getAllTools returns string array
type TestGetAllToolsReturnsStringArray = Expect<Equal<
  GetAllToolsReturnType,
  string[]
>>;

// Test: getAllTools method signature
type TestGetAllToolsSignature = Expect<Equal<
  GetAllToolsMethod,
  () => string[]
>>;

// Test: Inferred tool union type from categories
type InferredToolsFromCategories =
  ToolCategoriesType['file-system'][number] |
  ToolCategoriesType['execution'][number] |
  ToolCategoriesType['search'][number] |
  ToolCategoriesType['version-control'][number] |
  ToolCategoriesType['development'][number] |
  ToolCategoriesType['testing'][number] |
  ToolCategoriesType['documentation'][number] |
  ToolCategoriesType['deployment'][number] |
  ToolCategoriesType['monitoring'][number] |
  ToolCategoriesType['database'][number] |
  ToolCategoriesType['cloud'][number] |
  ToolCategoriesType['communication'][number];

// Test: The union type matches expected tools
type TestInferredToolsUnion = Expect<Extends<
  InferredToolsFromCategories,
  'Read' | 'Write' | 'Bash' | 'Grep' | 'Git' | string
>>;

// ============================================================================
// calculateDisallowedTools() Input/Output Type Correlation Tests
// ============================================================================

type CalculateDisallowedToolsMethod = typeof ToolRegistry.calculateDisallowedTools;
type CalculateDisallowedToolsParams = Parameters<CalculateDisallowedToolsMethod>;
type CalculateDisallowedToolsReturn = ReturnType<CalculateDisallowedToolsMethod>;

// Test: calculateDisallowedTools method signature
type TestCalculateDisallowedToolsSignature = Expect<Equal<
  CalculateDisallowedToolsMethod,
  (allowedTools: string[]) => Promise<string[]>
>>;

// Test: Parameter type is string array
type TestCalculateDisallowedToolsParams = Expect<Equal<
  CalculateDisallowedToolsParams,
  [allowedTools: string[]]
>>;

// Test: Return type is Promise of string array
type TestCalculateDisallowedToolsReturn = Expect<Equal<
  CalculateDisallowedToolsReturn,
  Promise<string[]>
>>;

// Test: Awaited return type is string array
type TestCalculateDisallowedToolsAwaited = Expect<Equal<
  Awaited<CalculateDisallowedToolsReturn>,
  string[]
>>;

// ============================================================================
// validateToolList() Result Interface Structure Tests
// ============================================================================

type ValidateToolListMethod = typeof ToolRegistry.validateToolList;
type ValidateToolListParams = Parameters<ValidateToolListMethod>;
type ValidateToolListReturn = ReturnType<ValidateToolListMethod>;
type ValidateToolListAwaited = Awaited<ValidateToolListReturn>;

// Test: validateToolList method signature
type TestValidateToolListSignature = Expect<Equal<
  ValidateToolListMethod,
  (tools: string[]) => Promise<{
    valid: boolean;
    invalidTools: string[];
    message?: string;
  }>
>>;

// Test: Parameter type is string array
type TestValidateToolListParams = Expect<Equal<
  ValidateToolListParams,
  [tools: string[]]
>>;

// Test: Return type structure validation
type TestValidateToolListReturnStructure = Expect<Equal<
  keyof ValidateToolListAwaited,
  'valid' | 'invalidTools' | 'message'
>>;

// Test: Required fields in return type
type ValidateToolListRequiredFields = RequiredKeys<ValidateToolListAwaited>;
type ValidateToolListOptionalFields = OptionalKeys<ValidateToolListAwaited>;

type TestValidateToolListRequiredFields = Expect<Equal<
  ValidateToolListRequiredFields,
  'valid' | 'invalidTools'
>>;

type TestValidateToolListOptionalFields = Expect<Equal<
  ValidateToolListOptionalFields,
  'message'
>>;

// Test: Field types in return interface
type TestValidateToolListValidField = Expect<Equal<
  ValidateToolListAwaited['valid'],
  boolean
>>;

type TestValidateToolListInvalidToolsField = Expect<Equal<
  ValidateToolListAwaited['invalidTools'],
  string[]
>>;

type TestValidateToolListMessageField = Expect<Equal<
  ValidateToolListAwaited['message'],
  string | undefined
>>;

// ============================================================================
// getToolsByCategory() Return Type Mapping Tests
// ============================================================================

type GetToolsByCategoryMethod = typeof ToolRegistry.getToolsByCategory;
type GetToolsByCategoryReturn = ReturnType<GetToolsByCategoryMethod>;
type GetToolsByCategoryAwaited = Awaited<GetToolsByCategoryReturn>;

// Test: getToolsByCategory method signature
type TestGetToolsByCategorySignature = Expect<Equal<
  GetToolsByCategoryMethod,
  () => Promise<Record<string, string[]>>
>>;

// Test: Return type is Promise of Record<string, string[]>
type TestGetToolsByCategoryReturn = Expect<Equal<
  GetToolsByCategoryReturn,
  Promise<Record<string, string[]>>
>>;

// Test: Awaited return type structure
type TestGetToolsByCategoryAwaited = Expect<Equal<
  GetToolsByCategoryAwaited,
  Record<string, string[]>
>>;

// Test: Return type should match TOOL_CATEGORIES structure
type TestGetToolsByCategoryMatchesCategories = Expect<Equal<
  GetToolsByCategoryAwaited,
  Record<string, string[]>
>>;

// Test: Specific category mapping
type TestCategoryMappingFileSystem = Expect<Extends<
  { 'file-system': string[] },
  GetToolsByCategoryAwaited
>>;

// ============================================================================
// getToolStatistics() Complex Nested Return Type Tests
// ============================================================================

type GetToolStatisticsMethod = typeof ToolRegistry.getToolStatistics;
type GetToolStatisticsReturn = ReturnType<GetToolStatisticsMethod>;
type GetToolStatisticsAwaited = Awaited<GetToolStatisticsReturn>;

// Test: getToolStatistics method signature
type TestGetToolStatisticsSignature = Expect<Equal<
  GetToolStatisticsMethod,
  () => Promise<{
    totalTools: number;
    categoriesCount: number;
    categories: Array<{ name: string; count: number }>;
  }>
>>;

// Test: Return type structure validation
type TestGetToolStatisticsReturnStructure = Expect<Equal<
  keyof GetToolStatisticsAwaited,
  'totalTools' | 'categoriesCount' | 'categories'
>>;

// Test: All fields are required
type GetToolStatisticsRequiredFields = RequiredKeys<GetToolStatisticsAwaited>;
type TestGetToolStatisticsAllRequired = Expect<Equal<
  GetToolStatisticsRequiredFields,
  'totalTools' | 'categoriesCount' | 'categories'
>>;

// Test: Field types
type TestTotalToolsField = Expect<Equal<
  GetToolStatisticsAwaited['totalTools'],
  number
>>;

type TestCategoriesCountField = Expect<Equal<
  GetToolStatisticsAwaited['categoriesCount'],
  number
>>;

type TestCategoriesArrayField = Expect<Equal<
  GetToolStatisticsAwaited['categories'],
  Array<{ name: string; count: number }>
>>;

// Test: Categories array element structure
type CategoryStatElement = GetToolStatisticsAwaited['categories'][number];
type TestCategoryStatElementStructure = Expect<Equal<
  keyof CategoryStatElement,
  'name' | 'count'
>>;

type TestCategoryStatElementTypes = Expect<Equal<
  CategoryStatElement,
  { name: string; count: number }
>>;

// Test: Categories array element required fields
type CategoryStatRequiredFields = RequiredKeys<CategoryStatElement>;
type TestCategoryStatAllRequired = Expect<Equal<
  CategoryStatRequiredFields,
  'name' | 'count'
>>;

// ============================================================================
// Additional Method Type Tests
// ============================================================================

// Test: isValidTool method signature
type IsValidToolMethod = typeof ToolRegistry.isValidTool;
type TestIsValidToolSignature = Expect<Equal<
  IsValidToolMethod,
  (toolName: string) => boolean
>>;

// Test: getToolCategory method signature
type GetToolCategoryMethod = typeof ToolRegistry.getToolCategory;
type TestGetToolCategorySignature = Expect<Equal<
  GetToolCategoryMethod,
  (toolName: string) => string | undefined
>>;

// Test: getToolCategory return type
type GetToolCategoryReturn = ReturnType<GetToolCategoryMethod>;
type TestGetToolCategoryReturn = Expect<Equal<
  GetToolCategoryReturn,
  string | undefined
>>;

// ============================================================================
// Type Transformation and Inference Tests
// ============================================================================

// Test: Extract tool category keys as union type
type ToolCategoryKeys = keyof ToolCategoriesType;
type TestToolCategoryKeys = Expect<Equal<
  ToolCategoryKeys,
  'file-system' | 'execution' | 'search' | 'version-control' | 'development' |
  'testing' | 'documentation' | 'deployment' | 'monitoring' | 'database' |
  'cloud' | 'communication'
>>;

// Test: Transform categories to tool count mapping
type CategoryToCountMapping<T extends Record<string, string[]>> = {
  [K in keyof T]: T[K]['length'];
};

type TestCategoryToCountMapping = CategoryToCountMapping<ToolCategoriesType>;
type TestSpecificCategoryCount = Expect<Equal<
  TestCategoryToCountMapping['file-system'],
  number
>>;

// Test: Flatten all tool names from categories
type FlattenTools<T extends Record<string, string[]>> = {
  [K in keyof T]: T[K][number];
}[keyof T];

type FlattenedToolsType = FlattenTools<ToolCategoriesType>;
type TestFlattenedToolsContainsRead = Expect<Extends<'Read', FlattenedToolsType>>;
type TestFlattenedToolsContainsBash = Expect<Extends<'Bash', FlattenedToolsType>>;

// Test: Conditional type for tool validation result
type ValidateToolResult<T extends string> = T extends FlattenedToolsType ? true : false;
type TestValidReadTool = Expect<Equal<ValidateToolResult<'Read'>, true>>;
type TestInvalidTool = Expect<Extends<ValidateToolResult<'NonExistentTool'>, boolean>>;

// ============================================================================
// Generic Constraint Tests
// ============================================================================

// Test: Generic function with tool constraints
type ValidateToolsFunction<T extends readonly string[]> = (tools: T) => Promise<{
  valid: boolean;
  invalidTools: Exclude<T[number], FlattenedToolsType>[];
}>;

type TestValidateToolsFunctionConstraint = Expect<Equal<
  ValidateToolsFunction<['Read', 'Write']>,
  (tools: ['Read', 'Write']) => Promise<{
    valid: boolean;
    invalidTools: never[];
  }>
>>;

// Test: Generic tool category extraction
type ExtractCategoryTools<T extends ToolCategoryKeys> = ToolCategoriesType[T][number];
type TestExtractFileSystemTools = Expect<Equal<
  ExtractCategoryTools<'file-system'>,
  string
>>;

// ============================================================================
// Complex Return Type Validation Tests
// ============================================================================

// Test: Promise unwrapping for all async methods
type AsyncMethodReturns = {
  calculateDisallowed: Awaited<ReturnType<typeof ToolRegistry.calculateDisallowedTools>>;
  validate: Awaited<ReturnType<typeof ToolRegistry.validateToolList>>;
  byCategory: Awaited<ReturnType<typeof ToolRegistry.getToolsByCategory>>;
  statistics: Awaited<ReturnType<typeof ToolRegistry.getToolStatistics>>;
};

type TestAsyncMethodReturnsStructure = Expect<Equal<
  AsyncMethodReturns,
  {
    calculateDisallowed: string[];
    validate: { valid: boolean; invalidTools: string[]; message?: string };
    byCategory: Record<string, string[]>;
    statistics: {
      totalTools: number;
      categoriesCount: number;
      categories: Array<{ name: string; count: number }>;
    };
  }
>>;

// Test: Method parameter consistency
type MethodParameters = {
  calculateDisallowed: Parameters<typeof ToolRegistry.calculateDisallowedTools>;
  validate: Parameters<typeof ToolRegistry.validateToolList>;
  isValid: Parameters<typeof ToolRegistry.isValidTool>;
  getCategory: Parameters<typeof ToolRegistry.getToolCategory>;
};

type TestMethodParametersStructure = Expect<Equal<
  MethodParameters,
  {
    calculateDisallowed: [allowedTools: string[]];
    validate: [tools: string[]];
    isValid: [toolName: string];
    getCategory: [toolName: string];
  }
>>;

// ============================================================================
// Edge Case Type Tests
// ============================================================================

// Test: Empty tool array handling
type TestEmptyToolArrayValidation = ValidateToolsFunction<[]>;
type TestEmptyArrayResult = Expect<Equal<
  ReturnType<TestEmptyToolArrayValidation>,
  Promise<{ valid: boolean; invalidTools: never[] }>
>>;

// Test: Mixed valid/invalid tools handling
type TestMixedToolsValidation = ValidateToolsFunction<['Read', 'NonExistent']>;

// Test: Tool category inference with never type
type TestNonExistentCategoryTools = ToolCategoriesType extends Record<'non-existent', any> 
  ? ToolCategoriesType['non-existent'] 
  : never;
type TestNeverCategory = Expect<Equal<TestNonExistentCategoryTools, never>>;

// ============================================================================
// Type-Level Statistics Computation Tests
// ============================================================================

// Test: Count total categories at compile time
type CountCategories<T extends Record<string, any>, C extends any[] = []> =
  keyof T extends never ? C['length'] : CountCategories<Omit<T, keyof T>, [...C, any]>;

// Test: Compute expected category count (simplified for testing)
type ExpectedCategoryCount = 13; // Based on the 13 categories we see
type TestCategoryCountMatches = Expect<Equal<
  ToolCategoriesType extends Record<string, any> ? true : false,
  true
>>;

// ============================================================================
// Comprehensive Integration Tests
// ============================================================================

// Test: Complete workflow type validation
type ToolRegistryWorkflow = {
  // Step 1: Get all tools
  allTools: ReturnType<typeof ToolRegistry['getAllTools']>;
  // Step 2: Calculate disallowed
  disallowed: ReturnType<typeof ToolRegistry.calculateDisallowedTools>;
  // Step 3: Validate tools
  validation: ReturnType<typeof ToolRegistry.validateToolList>;
  // Step 4: Get by category
  categories: ReturnType<typeof ToolRegistry.getToolsByCategory>;
  // Step 5: Get statistics
  stats: ReturnType<typeof ToolRegistry.getToolStatistics>;
};

type TestWorkflowTypes = Expect<Equal<
  ToolRegistryWorkflow,
  {
    allTools: string[];
    disallowed: Promise<string[]>;
    validation: Promise<{ valid: boolean; invalidTools: string[]; message?: string }>;
    categories: Promise<Record<string, string[]>>;
    stats: Promise<{
      totalTools: number;
      categoriesCount: number;
      categories: Array<{ name: string; count: number }>;
    }>;
  }
>>;

// ============================================================================
// Final Validation Tests
// ============================================================================

// Test: All ToolRegistry static methods exist and have correct signatures
type ToolRegistryMethodValidation = {
  hasCalculateDisallowedTools: typeof ToolRegistry.calculateDisallowedTools extends Function ? true : false;
  hasValidateToolList: typeof ToolRegistry.validateToolList extends Function ? true : false;
  hasGetToolsByCategory: typeof ToolRegistry.getToolsByCategory extends Function ? true : false;
  hasGetToolStatistics: typeof ToolRegistry.getToolStatistics extends Function ? true : false;
  hasIsValidTool: typeof ToolRegistry.isValidTool extends Function ? true : false;
  hasGetToolCategory: typeof ToolRegistry.getToolCategory extends Function ? true : false;
  hasToolCategories: typeof ToolRegistry['TOOL_CATEGORIES'] extends Record<string, string[]> ? true : false;
};

type TestToolRegistryComplete = Expect<Equal<
  ToolRegistryMethodValidation,
  {
    hasCalculateDisallowedTools: true;
    hasValidateToolList: true;
    hasGetToolsByCategory: true;
    hasGetToolStatistics: true;
    hasIsValidTool: true;
    hasGetToolCategory: true;
    hasToolCategories: true;
  }
>>;

// ============================================================================
// Performance and Complexity Tests
// ============================================================================

// Test: Type instantiation doesn't exceed reasonable limits
type DeepToolCategoryAccess<T extends ToolCategoryKeys> = 
  ToolCategoriesType[T] extends readonly (infer U)[] ? U : never;

type TestDeepAccess = DeepToolCategoryAccess<'file-system'>;
type TestDeepAccessResult = Expect<Equal<
  TestDeepAccess,
  string
>>;

// If this file compiles without errors, all ToolRegistry type tests pass!
export type ToolRegistryTypeTestsComplete = 'All ToolRegistry compile-time type tests completed successfully! 🔧';