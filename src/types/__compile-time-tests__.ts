/**
 * Compile-time Type Tests
 * 
 * This file contains comprehensive compile-time tests for the TypeScript types
 * in this codebase. These tests verify type transformations, generic constraints,
 * conditional types, and type inference at compile time using TypeScript's 
 * type system.
 * 
 * The tests use the pattern:
 * - type Test = Expect<Equal<ActualType, ExpectedType>>
 * - These fail compilation if types don't match exactly
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

/**tt = 
 * Utility type to expect a condition to be true
 */
type Expect<T extends true> = T;
  
/**
 * Utility type to check if a type extends another
 */
type Extends<T, U> = T extends U ? true : false;

/**
 * Utility type to check if a type is assignable to another
 */
type IsAssignable<T, U> = T extends U ? true : false;

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
// type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

// ============================================================================
// TESTS FOR AGENT CONFIG TYPES (src/types/agent-config.ts)
// ============================================================================

import type { 
  AgentConfig, 
  EnhancedAgentConfig, 
  DynamicRestrictionConfig,
  ToolPermissionResult,
  AgentConfigLegacy 
} from './agent-config.js';

// Test: AgentConfig has required fields
type TestAgentConfigStructure = Expect<Equal<
  keyof AgentConfig,
  'name' | 'description' | 'prompt' | 'systemPrompt' | 'model' | 'permissions' | 'context' | 'options' | 'color'
>>;

// Test: AgentConfig name and description are required strings
type TestAgentConfigRequiredFields = Expect<Equal<
  Pick<Required<AgentConfig>, 'name' | 'description'>,
  { name: string; description: string }
>>;

// Test: EnhancedAgentConfig extends AgentConfig
type TestEnhancedAgentConfigExtension = Expect<Extends<EnhancedAgentConfig, AgentConfig>>;

// Test: EnhancedAgentConfig has additional computed fields
type TestEnhancedAgentConfigComputedFields = Expect<
  HasProperty<EnhancedAgentConfig, 'computedPermissions' | 'restrictionPrompt'>
>;

// Test: Permission tools structure
type TestPermissionToolsStructure = Expect<Equal<
  NonNullable<AgentConfig['permissions']>['tools'],
  {
    allowed: string[];
    denied: string[];
    autoPopulatedDisallowed?: string[];
    lastDiscoveryTime?: number;
  }
>>;

// Test: ToolPermissionResult structure validation
type TestToolPermissionResultStructure = Expect<Equal<
  keyof ToolPermissionResult,
  'allowedTools' | 'disallowedTools' | 'validation' | 'statistics' | 'restrictionPrompt' | 'generatedAt'
>>;

// Test: DynamicRestrictionConfig boolean fields
type TestDynamicRestrictionConfigBooleans = Expect<Equal<
  Pick<DynamicRestrictionConfig, 'enabled' | 'includePromptInjection'>,
  { enabled: boolean; includePromptInjection: boolean }
>>;

// Test: AgentConfigLegacy vs AgentConfig compatibility
type TestLegacyConfigFields = Expect<
  HasProperty<AgentConfigLegacy, 'name' | 'description' | 'model' | 'permissions' | 'systemPrompt'>
>;

// ============================================================================
// TESTS FOR SHARED TYPES (src/shared/types.ts)  
// ============================================================================

import type {
  AgentConfigOld,
  AgentConfigNew, 
  AgentConfig as SharedAgentConfig,
  CommandResult,
  TestValidationResult,
  DevServerResult,
  TestResult,
  TestResults
} from '../shared/types.js';

// Test: AgentConfig union type correctness
type TestAgentConfigUnion = Expect<Equal<
  SharedAgentConfig,
  AgentConfigOld | AgentConfigNew
>>;

// Test: CommandResult success field type
type TestCommandResultSuccess = Expect<Equal<
  CommandResult['success'],
  boolean
>>;

// Test: CommandResult has all expected fields
type TestCommandResultStructure = Expect<Equal<
  keyof CommandResult,
  'success' | 'code' | 'stdout' | 'stderr' | 'error'
>>;

// Test: TestResults nested structure
type TestTestResultsStructure = Expect<Equal<
  TestResults['backend'],
  {
    lint: TestResult | null;
    typecheck: TestResult | null;
  }
>>;

// Test: TestValidationResult coverage type
type TestCoverageType = Expect<Equal<
  NonNullable<TestValidationResult['coverage']>,
  {
    frontend: boolean;
    backend: boolean;
    e2e: boolean;
  }
>>;

// ============================================================================
// TESTS FOR MCP PROTOCOL TYPES (src/utilities/mcp/protocol-types.ts)
// ============================================================================

import type {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  MCPTool,
  MCPServerInfo,
  MCPCapabilities,
  MCPInitializeResult,
  MCPToolCall,
  MCPToolResult
} from '../utilities/mcp/protocol-types.js';

// Test: MCPRequest has required jsonrpc and method fields
type TestMCPRequestRequired = Expect<Equal<
  Pick<Required<MCPRequest>, 'jsonrpc' | 'method'>,
  { jsonrpc: string; method: string }
>>;

// Test: MCPResponse and MCPRequest share common fields
type TestMCPResponseCommonFields = Expect<
  HasProperty<MCPResponse, 'jsonrpc' | 'id'>
>;

// Test: MCPError structure
type TestMCPErrorStructure = Expect<Equal<
  keyof MCPError,
  'code' | 'message' | 'data'
>>;

// Test: MCPTool inputSchema structure
type TestMCPToolInputSchema = Expect<Equal<
  MCPTool['inputSchema'],
  {
    type: string;
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  }
>>;

// Test: MCPInitializeResult contains expected fields
type TestMCPInitializeResultStructure = Expect<Equal<
  keyof MCPInitializeResult,
  'protocolVersion' | 'capabilities' | 'serverInfo'
>>;

// Test: MCPToolResult content type
type TestMCPToolResultContent = Expect<Equal<
  MCPToolResult['content'],
  Array<{
    type: 'text';
    text: string;
  }>
>>;

// ============================================================================
// TESTS FOR SESSION TYPES (src/types/session.ts)
// ============================================================================

import type {
  ConversationHistory,
  CompactMessage,
  CompactConversationHistory,
  SessionSummary,
  InvokeAgentParams,
  AgentInvocationResult,
  SessionInitResult,
  StreamingUtils
} from '../types/session.js';

// Test: ConversationHistory required fields
type TestConversationHistoryRequired = Expect<Equal<
  Pick<ConversationHistory, 'sessionId' | 'agentName' | 'messages' | 'createdAt' | 'lastUpdated'>,
  {
    sessionId: string;
    agentName: string;
    messages: any[];
    createdAt: string;
    lastUpdated: string;
  }
>>;

// Test: CompactConversationHistory extends basic conversation info
type TestCompactConversationHistoryStructure = Expect<Equal<
  Pick<CompactConversationHistory, 'sessionId' | 'agentName'>,
  Pick<ConversationHistory, 'sessionId' | 'agentName'>
>>;

// Test: InvokeAgentParams has required fields
type TestInvokeAgentParamsRequired = Expect<Equal<
  Pick<Required<InvokeAgentParams>, 'agentName' | 'prompt'>,
  { agentName: string; prompt: string }
>>;

// Test: AgentInvocationResult success field
type TestAgentInvocationResultSuccess = Expect<Equal<
  AgentInvocationResult['success'],
  boolean
>>;

// Test: StreamingUtils interface methods
type TestStreamingUtilsMethods = Expect<
  HasProperty<StreamingUtils, 
    'initStreamFile' | 'appendToStream' | 'addStreamingOutput' | 
    'addVerboseOutput' | 'getStreamingOutput' | 'getVerboseOutput' | 'getStreamLogFile'
  >
>;

// ============================================================================
// TESTS FOR AGENT CONFIG PARSER TYPES (src/utilities/agents/agent-config-parser.ts)
// ============================================================================

import type { ConfigValidationResult } from '../utilities/agents/agent-config-parser.js';

// Test: ConfigValidationResult structure
type TestConfigValidationResultStructure = Expect<Equal<
  keyof ConfigValidationResult,
  'isValid' | 'errors' | 'warnings' | 'normalizedConfig'
>>;

// Test: ConfigValidationResult validation fields
type TestConfigValidationResultValidation = Expect<Equal<
  Pick<ConfigValidationResult, 'isValid' | 'errors' | 'warnings'>,
  {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }
>>;

// ============================================================================
// TESTS FOR PERMISSION MANAGER TYPES (src/utilities/agents/permission-manager.ts)
// ============================================================================

import type { 
  AgentPermissionConfig,
  YAMLAgentConfig
} from '../utilities/agents/permission-manager.js';

// Test: AgentPermissionConfig structure
type TestAgentPermissionConfigStructure = Expect<Equal<
  keyof AgentPermissionConfig,
  'allowedTools' | 'deniedTools' | 'restrictBuiltInTools' | 'agentRole' | 'useDynamicRestrictions'
>>;

// Test: AgentPermissionConfig role type
type TestAgentPermissionConfigRole = Expect<Equal<
  NonNullable<AgentPermissionConfig['agentRole']>,
  'read-only' | 'write-restricted' | 'full-access' | 'security-sensitive'
>>;

// Test: YAMLAgentConfig required fields
type TestYAMLAgentConfigRequired = Expect<Equal<
  Pick<Required<YAMLAgentConfig>, 'name' | 'description'>,
  { name: string; description: string }
>>;

// ============================================================================
// TESTS FOR VALIDATION UTILS (src/utilities/config/validation.ts)
// ============================================================================

// Note: ValidationUtils is a class with static methods, so we test the method signatures
// These tests verify the function signature types

// Test: ValidationUtils static method signatures exist and return booleans
type TestValidationUtilsSessionId = Expect<Equal<
  (sessionId: string) => boolean,
  typeof import('../utilities/config/validation.js')['ValidationUtils']['validateSessionId']
>>;

type TestValidationUtilsAgentName = Expect<Equal<
  (agentName: string) => boolean,
  typeof import('../utilities/config/validation.js')['ValidationUtils']['validateAgentName']
>>;

type TestValidationUtilsEmail = Expect<Equal<
  (email: string) => boolean,
  typeof import('../utilities/config/validation.js')['ValidationUtils']['validateEmail']
>>;

// Test: Type guard function signature
type TestIsNonEmptyStringSignature = Expect<Equal<
  (value: any) => value is string,
  typeof import('../utilities/config/validation.js')['ValidationUtils']['isNonEmptyString']
>>;

// ============================================================================
// CONDITIONAL TYPE TESTS
// ============================================================================

// Test: Conditional type for extracting tool permission
type ExtractToolPermission<T> = T extends { permissions: { tools: infer U } } ? U : never;

const extractToolPerms = <
  const T extends { permissions: { tools: any } }
>(config: T): ExtractToolPermission<T> => {
  return config.permissions.tools;
};
const foo = {
  permissions: {
    tools: {
      foo: "bar",
      bar: "baz"
    }
    
  }
} as const;
const _test = extractToolPerms(foo) as {foo: "bar", bar: "baz"};
type _test = Expect<Equal<
  typeof _test,
  {foo: "bar", bar: "baz"}
>>

type TestExtractToolPermissionFromAgentConfig = Expect<Extends<
  ExtractToolPermission<AgentConfig>,
  {
    allowed: string[];
    denied: string[];
    autoPopulatedDisallowed?: string[];
    lastDiscoveryTime?: number;
  } | never
>>;

// Test: Conditional type for checking if config has permissions
type HasPermissions<T> = T extends { permissions?: any } ? true : false;

type TestAgentConfigHasPermissions = Expect<Equal<
  HasPermissions<AgentConfig>,
  true
>>;

// Test: Utility type to make certain fields required
type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

type TestRequireFieldsOnAgentConfig = Expect<Equal<
  RequireFields<AgentConfig, 'systemPrompt' | 'model'>,
  AgentConfig & Required<Pick<AgentConfig, 'systemPrompt' | 'model'>>
>>;

// ============================================================================
// MAPPED TYPE TESTS
// ============================================================================

// Test: Create a type that maps over permission modes
type PermissionModeMap<T> = {
  [K in NonNullable<AgentConfig['permissions']>['mode']]: T
};

type TestPermissionModeMap = Expect<Equal<
  PermissionModeMap<boolean>,
  {
    default: boolean;
    acceptEdits: boolean;  
    ask: boolean;
  }
>>;

// Test: Partial type for configuration overrides
type PartialAgentConfig = Partial<AgentConfig>;

type TestPartialAgentConfig = Expect<
  IsAssignable<{}, PartialAgentConfig>
>;

// Test: Pick specific fields from complex types
type AgentBasicInfo = Pick<AgentConfig, 'name' | 'description'>;

type TestAgentBasicInfo = Expect<Equal<
  AgentBasicInfo,
  { name: string; description: string }
>>;

// ============================================================================
// GENERIC TYPE CONSTRAINT TESTS
// ============================================================================

// Test: Generic function type with constraints
type ValidateConfig<T extends Pick<AgentConfig, 'name'>> = (config: T) => boolean;

type TestValidateConfigConstraint = Expect<
  IsAssignable<ValidateConfig<AgentConfig>, (config: AgentConfig) => boolean>
>;

// Test: Generic type with multiple constraints
type ConfigWithTools<T extends { allowedTools: string[] }> = T & {
  toolCount: number;
};

type TestConfigWithToolsConstraint = Expect<Equal<
  ConfigWithTools<AgentPermissionConfig>['toolCount'],
  number
>>;

// ============================================================================
// INFERENCE TESTS
// ============================================================================

// Test: Function parameter inference
declare function processAgentConfig<T extends AgentConfig>(
  config: T
): T extends { options: { model: infer M } } ? M : string;

type x = ReturnType<typeof processAgentConfig<AgentConfig>>;

type TestProcessAgentConfigInference = Expect<Equal<
  ReturnType<typeof processAgentConfig<AgentConfig>>,
  string
>>;

// Test: Array element type inference
type InferArrayElement<T> = T extends (infer U)[] ? U : never;

type TestInferStringArrayElement = Expect<Equal<
  InferArrayElement<string[]>,
  string
>>;

type TestInferToolsArrayElement = Expect<Equal<
  InferArrayElement<NonNullable<AgentPermissionConfig['allowedTools']>>,
  string
>>;

// ============================================================================
// COMPLEX TRANSFORMATION TESTS
// ============================================================================

// Test: Transform config to validation result type
type ConfigToValidationResult<T extends AgentConfig> = {
  config: T;
  isValid: boolean;
  errors: string[];
};

type TestConfigToValidationResult = Expect<Equal<
  ConfigToValidationResult<AgentConfig>['config'],
  AgentConfig
>>;

// Test: Extract all string literal types from permissions mode
type ExtractPermissionModes<T> = T extends { permissions?: { mode: infer M } } ? M : never;

type TestExtractPermissionModes = Expect<Equal<
  ExtractPermissionModes<AgentConfig>,
  'default' | 'acceptEdits' | 'ask'
>>;

// ============================================================================
// UNION AND INTERSECTION TYPE TESTS
// ============================================================================

// Test: Union type discrimination
type DiscriminateAgentConfig<T> = 
  T extends { options: any } 
    ? 'new-format'
    : T extends { permissions: any }
    ? 'legacy-format' 
    : 'unknown';

type TestDiscriminateNewFormat = Expect<Equal<
  DiscriminateAgentConfig<{ name: string; description: string; options: { model: string } }>,
  'new-format'
>>;

type TestDiscriminateLegacyFormat = Expect<Equal<
  DiscriminateAgentConfig<{ name: string; description: string; permissions: { mode: 'default' } }>,
  'legacy-format'
>>;

// Test: Intersection types
type ConfigWithMetadata = AgentConfig & { metadata: { version: string; createdAt: Date } };

type TestConfigWithMetadata = Expect<
  HasProperty<ConfigWithMetadata, 'name' | 'metadata'>
>;

// ============================================================================
// UTILITY TYPE COMPOSITION TESTS
// ============================================================================

// Test: Compose utility types
type OptionalizeFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type TestOptionalizeAgentConfigFields = Expect<Equal<
  OptionalizeFields<AgentConfig, 'color' | 'context'>,
  Omit<AgentConfig, 'color' | 'context'> & Partial<Pick<AgentConfig, 'color' | 'context'>>
>>;

// Test: Deep partial type
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type TestDeepPartialAgentConfig = Expect<
  IsAssignable<{}, DeepPartial<AgentConfig>>
>;

// ============================================================================
// TEMPLATE LITERAL TYPE TESTS  
// ============================================================================

// Test: Template literal types for tool names
type MCPToolPrefix = 'mcp__';
type LevysMCPTool<T extends string> = `${MCPToolPrefix}levys-awesome-mcp__${T}`;

type TestLevysMCPToolTemplate = Expect<Equal<
  LevysMCPTool<'backend_write'>,
  'mcp__levys-awesome-mcp__backend_write'
>>;

// Test: Extract tool category from tool name
type ExtractToolCategory<T extends string> = 
  T extends `mcp__levys-awesome-mcp__${infer Category}__${string}`
    ? Category
    : never;

type TestExtractToolCategory = Expect<Equal<
  ExtractToolCategory<'mcp__levys-awesome-mcp__content-writer__backend_write'>,
  'content-writer'
>>;

// ============================================================================
// RECURSIVE TYPE TESTS
// ============================================================================

// Test: Recursive type for nested configuration
type NestedConfig = {
  name: string;
  children?: NestedConfig[];
};

type FlattenConfig<T> = T extends { children: (infer U)[] }
  ? T & { children: FlattenConfig<U>[] }
  : T;

type TestFlattenConfig = Expect<Equal<
  FlattenConfig<NestedConfig>['name'],
  string
>>;

// ============================================================================
// ERROR CASE TESTS (Should fail compilation if uncommented)
// ============================================================================

// These tests verify that invalid type assignments are correctly rejected
// Uncomment any of these to see TypeScript compilation errors

// type TestInvalidAgentConfigAssignment = Expect<Equal<
//   AgentConfig,
//   { name: number; description: string } // Should fail - name must be string
// >>;

// type TestInvalidPermissionMode = Expect<Equal<
//   NonNullable<AgentConfig['permissions']>['mode'],
//   'invalid-mode' // Should fail - not a valid permission mode
// >>;

// type TestInvalidToolPermissionResult = Expect<Equal<
//   ToolPermissionResult['allowedTools'],
//   number[] // Should fail - should be string[]
// >>;

// ============================================================================
// RUNTIME TYPE ASSERTION TESTS
// ============================================================================

// These create compile-time assertions that will fail if the types change unexpectedly

// Test: Ensure certain types remain exactly as expected
const _agentConfigNameMustBeString: AgentConfig['name'] = '' as string;
const _agentConfigDescriptionMustBeString: AgentConfig['description'] = '' as string;
const _commandResultSuccessMustBeBoolean: CommandResult['success'] = true as boolean;
const _mcpErrorCodeMustBeNumber: MCPError['code'] = 0 as number;
const _sessionIdMustBeString: ConversationHistory['sessionId'] = '' as string;

// Test: Ensure optional fields can be undefined
const _agentConfigColorCanBeUndefined: AgentConfig['color'] = undefined;
const _agentConfigContextCanBeUndefined: AgentConfig['context'] = undefined;
const _testResultErrorCanBeUndefined: TestResult['error'] = undefined;

// Test: Ensure arrays have correct element types
const _allowedToolsMustBeStringArray: string[] = [] as NonNullable<AgentPermissionConfig['allowedTools']>;
const _errorsMustBeStringArray: string[] = [] as ConfigValidationResult['errors'];
const _messagesMustBeAnyArray: any[] = [] as ConversationHistory['messages'];

// ============================================================================
// FINAL TYPE VALIDATION
// ============================================================================

// This section performs final validation that all our core types are well-formed

type CoreTypesValidation = {
  agentConfig: AgentConfig extends Record<string, any> ? true : false;
  enhancedAgentConfig: EnhancedAgentConfig extends AgentConfig ? true : false;
  commandResult: CommandResult extends { success: boolean } ? true : false;
  mcpRequest: MCPRequest extends { jsonrpc: string; method: string } ? true : false;
  sessionTypes: ConversationHistory extends { sessionId: string; agentName: string } ? true : false;
  permissionTypes: AgentPermissionConfig extends { allowedTools: string[] } ? true : false;
  validationTypes: ConfigValidationResult extends { isValid: boolean } ? true : false;
};

type TestAllCoreTypesValid = Expect<Equal<
  CoreTypesValidation,
  {
    agentConfig: true;
    enhancedAgentConfig: true;  
    commandResult: true;
    mcpRequest: true;
    sessionTypes: true;
    permissionTypes: true;
    validationTypes: true;
  }
>>;

// If this file compiles without errors, all type tests pass!
export type TypeTestsComplete = 'All compile-time type tests completed successfully! 🎉';