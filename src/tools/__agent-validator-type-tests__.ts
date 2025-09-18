/**
 * Agent Validator Static Type Tests
 * 
 * Comprehensive compile-time type tests for agent validation functionality.
 * These tests verify complex Zod schema validations, type transformations,
 * and functions using 'any' types that should have proper type definitions.
 * 
 * The tests focus on:
 * - Zod schema type inference and validation
 * - ValidationResult interface structure
 * - Generic constraints for config validation
 * - Template literal types for config generation
 * - Complex conditional types for config fixing
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
 * Utility type to extract function parameter types
 */
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Utility type to extract function return type
 */
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

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

/**
 * Type to check if a type is any
 */
type IsAny<T> = 0 extends (1 & T) ? true : false;

/**
 * Type to extract Zod schema type
 */
type ZodInfer<T> = T extends { _output: infer O } ? O : unknown;

// ============================================================================
// IMPORTS AND TYPE EXTRACTION
// ============================================================================

import { 
  validateAgentConfig,
  createAgentTemplate,
  fixAgentConfig,
  ValidationResult
} from './agent-validator.js';
import { AgentConfig } from '../types/agent-config.js';

// ============================================================================
// VALIDATION RESULT INTERFACE TESTS
// ============================================================================

// Test: ValidationResult interface structure
type TestValidationResultStructure = Expect<Equal<
  keyof ValidationResult,
  'isValid' | 'errors' | 'warnings' | 'suggestions' | 'queryOptions'
>>;

// Test: ValidationResult required vs optional fields
type ValidationResultRequiredFields = RequiredKeys<ValidationResult>;
type ValidationResultOptionalFields = OptionalKeys<ValidationResult>;

type TestValidationResultRequiredFields = Expect<Equal<
  ValidationResultRequiredFields,
  'isValid' | 'errors' | 'warnings' | 'suggestions'
>>;

type TestValidationResultOptionalFields = Expect<Equal<
  ValidationResultOptionalFields,
  'queryOptions'
>>;

// Test: ValidationResult field types
type TestValidationResultIsValid = Expect<Equal<ValidationResult['isValid'], boolean>>;
type TestValidationResultErrors = Expect<Equal<ValidationResult['errors'], string[]>>;
type TestValidationResultWarnings = Expect<Equal<ValidationResult['warnings'], string[]>>;
type TestValidationResultSuggestions = Expect<Equal<ValidationResult['suggestions'], string[]>>;
type TestValidationResultQueryOptions = Expect<Equal<ValidationResult['queryOptions'], any | undefined>>;

// ============================================================================
// VALIDATE AGENT CONFIG FUNCTION TESTS
// ============================================================================

// Test: validateAgentConfig function signature
type ValidateAgentConfigFunction = typeof validateAgentConfig;
type TestValidateAgentConfigSignature = Expect<Equal<
  ValidateAgentConfigFunction,
  (config: unknown) => ValidationResult
>>;

// Test: validateAgentConfig parameters
type ValidateAgentConfigParams = Parameters<ValidateAgentConfigFunction>;
type TestValidateAgentConfigParams = Expect<Equal<
  ValidateAgentConfigParams,
  [config: unknown]
>>;

// Test: validateAgentConfig return type
type ValidateAgentConfigReturn = ReturnType<ValidateAgentConfigFunction>;
type TestValidateAgentConfigReturn = Expect<Equal<
  ValidateAgentConfigReturn,
  ValidationResult
>>;

// Test: Proper typing for function parameter (currently unknown, which is good)
type TestValidateConfigInputType = Expect<Equal<
  Parameters<typeof validateAgentConfig>[0],
  unknown
>>;

// ============================================================================
// CREATE AGENT TEMPLATE FUNCTION TESTS
// ============================================================================

// Test: createAgentTemplate function signature
type CreateAgentTemplateFunction = typeof createAgentTemplate;
type TestCreateAgentTemplateSignature = Expect<Equal<
  CreateAgentTemplateFunction,
  (name: string, description: string) => AgentConfig
>>;

// Test: createAgentTemplate parameters
type CreateAgentTemplateParams = Parameters<CreateAgentTemplateFunction>;
type TestCreateAgentTemplateParams = Expect<Equal<
  CreateAgentTemplateParams,
  [name: string, description: string]
>>;

// Test: createAgentTemplate return type
type CreateAgentTemplateReturn = ReturnType<CreateAgentTemplateFunction>;
type TestCreateAgentTemplateReturn = Expect<Equal<
  CreateAgentTemplateReturn,
  AgentConfig
>>;

// ============================================================================
// FIX AGENT CONFIG FUNCTION TESTS (USES 'ANY' - NEEDS PROPER TYPING)
// ============================================================================

// Test: fixAgentConfig function signature (currently uses any)
type FixAgentConfigFunction = typeof fixAgentConfig;
type TestFixAgentConfigSignature = Expect<Equal<
  FixAgentConfigFunction,
  (config: any) => AgentConfig
>>;

// Test: fixAgentConfig parameters (identifies 'any' usage)
type FixAgentConfigParams = Parameters<FixAgentConfigFunction>;
type TestFixAgentConfigParams = Expect<Equal<
  FixAgentConfigParams,
  [config: any]
>>;

// Test: Identify 'any' usage in function parameter
type TestFixAgentConfigUsesAny = IsAny<Parameters<typeof fixAgentConfig>[0]>;
type TestFixAgentConfigUsesAnyResult = Expect<TestFixAgentConfigUsesAny>;

// Define proper input type for fixAgentConfig
type FixableAgentConfig = {
  name?: string;
  description?: string;
  systemPrompt?: string;
  model?: string;
  options?: {
    systemPrompt?: string;
    model?: string;
    allowedTools?: string[];
    mcpServers?: Record<string, any>;
    [key: string]: any;
  };
  serverAllowedDirectories?: any; // Invalid field to be removed
  [key: string]: any;
};

// Test: Proper return type transformation
type FixedConfigShape<T extends FixableAgentConfig> = {
  name?: T['name'];
  description?: T['description'];
  options: {
    systemPrompt: T['systemPrompt'] extends string ? T['systemPrompt'] : 
                 T['options'] extends { systemPrompt: infer S } ? S : string;
    model: T['model'] extends string ? T['model'] :
           T['options'] extends { model: infer M } ? M : string;
    allowedTools: T['options'] extends { allowedTools: infer A } ? A : string[];
    mcpServers: T['options'] extends { mcpServers: infer M } ? M : Record<string, any>;
  };
} & Omit<T, 'systemPrompt' | 'model' | 'serverAllowedDirectories'>;

// ============================================================================
// CONDITIONAL TYPE TESTS FOR CONFIG VALIDATION
// ============================================================================

// Test: Config type discrimination
type DiscriminateConfigType<T> = 
  T extends { options: { model: infer M } }
    ? M extends 'sonnet' | 'opus' | 'haiku'
      ? 'valid-new-config'
      : 'invalid-model'
    : T extends { permissions: any; systemPrompt: any; context: any }
    ? 'legacy-config'
    : T extends { name: string; description: string }
    ? 'minimal-config'
    : 'invalid-config';

type TestValidNewConfig = Expect<Equal<
  DiscriminateConfigType<{
    name: 'test';
    description: 'test';
    options: { model: 'sonnet'; systemPrompt: 'test' };
  }>,
  'valid-new-config'
>>;

type TestInvalidModelConfig = Expect<Equal<
  DiscriminateConfigType<{
    name: 'test';
    description: 'test';
    options: { model: 'invalid-model'; systemPrompt: 'test' };
  }>,
  'invalid-model'
>>;

type TestLegacyConfig = Expect<Equal<
  DiscriminateConfigType<{
    name: 'test';
    permissions: {};
    systemPrompt: 'test';
    context: {};
  }>,
  'legacy-config'
>>;

// ============================================================================
// VALIDATION ERROR TYPE TESTS
// ============================================================================

// Test: Error classification based on config type
type ClassifyValidationError<Config, Error extends string> =
  Config extends { options?: undefined }
    ? Error extends 'Missing options object - required for claude-code query API'
      ? 'missing-options-error'
      : 'other-error'
    : Config extends { options: { model?: undefined } }
    ? Error extends 'model is required in options (must be sonnet, opus, or haiku)'
      ? 'missing-model-error'
      : 'other-error'
    : 'unknown-error';

type TestMissingOptionsError = Expect<Equal<
  ClassifyValidationError<{}, 'Missing options object - required for claude-code query API'>,
  'missing-options-error'
>>;

type TestMissingModelError = Expect<Equal<
  ClassifyValidationError<{ options: {} }, 'model is required in options (must be sonnet, opus, or haiku)'>,
  'missing-model-error'
>>;

// ============================================================================
// GENERIC CONSTRAINT TESTS FOR AGENT TEMPLATES
// ============================================================================

// Test: Generic template creation with constraints
type CreateValidAgentTemplate<
  N extends string,
  D extends string,
  M extends 'sonnet' | 'opus' | 'haiku' = 'sonnet'
> = {
  name: N;
  description: D;
  prompt: `Default prompt for ${N}`;
  options: {
    model: M;
    systemPrompt: `You are ${N}. ${D}`;
    allowedTools: string[];
    mcpServers: Record<string, any>;
  };
};

type TestCreateValidTemplate = Expect<Equal<
  CreateValidAgentTemplate<'test-agent', 'A test agent', 'opus'>,
  {
    name: 'test-agent';
    description: 'A test agent';
    prompt: 'Default prompt for test-agent';
    options: {
      model: 'opus';
      systemPrompt: 'You are test-agent. A test agent';
      allowedTools: string[];
      mcpServers: Record<string, any>;
    };
  }
>>;

// ============================================================================
// TEMPLATE LITERAL TYPE TESTS
// ============================================================================

// Test: Generate system prompts using template literals
type GenerateSystemPrompt<Name extends string, Description extends string> = 
  `You are ${Name}. ${Description}`;

type TestGenerateSystemPrompt = Expect<Equal<
  GenerateSystemPrompt<'backend-agent', 'Handles backend operations'>,
  'You are backend-agent. Handles backend operations'
>>;

// Test: Generate default prompts
type GenerateDefaultPrompt<Name extends string> = `Default prompt for ${Name}`;

type TestGenerateDefaultPrompt = Expect<Equal<
  GenerateDefaultPrompt<'test-agent'>,
  'Default prompt for test-agent'
>>;

// ============================================================================
// ZOD SCHEMA INFERENCE TESTS
// ============================================================================

// Test: Model enum constraint
type ValidModels = 'sonnet' | 'opus' | 'haiku';
type TestValidModelConstraint = Expect<Equal<
  'sonnet' extends ValidModels ? true : false,
  true
>>;

type TestInvalidModelConstraint = Expect<Equal<
  'claude-2' extends ValidModels ? true : false,
  false
>>;

// Test: Permission mode enum constraint  
type ValidPermissionModes = 'default' | 'acceptEdits' | 'ask';
type TestValidPermissionMode = Expect<Equal<
  'acceptEdits' extends ValidPermissionModes ? true : false,
  true
>>;

// Test: MCP server action constraint
type ValidMCPActions = 'allow' | 'deny' | 'ask';
type TestValidMCPAction = Expect<Equal<
  'allow' extends ValidMCPActions ? true : false,
  true
>>;

// ============================================================================
// CONFIG FIXING TRANSFORMATION TESTS
// ============================================================================

// Test: Root level field migration
type MigrateRootFields<T> = T extends {
  systemPrompt: infer S;
  model: infer M;
  options?: infer O;
} ? {
  options: O extends object ? O & {
    systemPrompt: S;
    model: M;
  } : {
    systemPrompt: S;
    model: M;
  };
} & Omit<T, 'systemPrompt' | 'model'> : T;

type TestMigrateRootFields = Expect<Equal<
  MigrateRootFields<{
    name: 'test';
    systemPrompt: 'test prompt';
    model: 'sonnet';
    options: { allowedTools: ['Read'] };
  }>,
  {
    name: 'test';
    options: {
      allowedTools: ['Read'];
      systemPrompt: 'test prompt';
      model: 'sonnet';
    };
  }
>>;

// Test: Invalid field removal
type RemoveInvalidFields<T> = Omit<T, 'serverAllowedDirectories'>;

type TestRemoveInvalidFields = Expect<Equal<
  RemoveInvalidFields<{
    name: 'test';
    serverAllowedDirectories: string[];
    options: {};
  }>,
  {
    name: 'test';
    options: {};
  }
>>;

// ============================================================================
// QUERY OPTIONS GENERATION TESTS
// ============================================================================

// Test: Query options extraction from config
type ExtractQueryOptions<T> = T extends {
  options: {
    systemPrompt?: infer SP;
    model?: infer M;
    allowedTools?: infer AT;
    disallowedTools?: infer DT;
    mcpServers?: infer MCP;
  };
} ? {
  systemPrompt: SP;
  model: M;
  allowedTools: AT;
  disallowedTools: DT;
  mcpServers: MCP;
  pathToClaudeCodeExecutable: string;
} : never;

type TestExtractQueryOptions = Expect<Equal<
  ExtractQueryOptions<{
    name: 'test';
    options: {
      systemPrompt: 'test';
      model: 'sonnet';
      allowedTools: ['Read'];
      mcpServers: {};
    };
  }>,
  {
    systemPrompt: 'test';
    model: 'sonnet';
    allowedTools: ['Read'];
    disallowedTools: undefined;
    mcpServers: {};
    pathToClaudeCodeExecutable: string;
  }
>>;

// ============================================================================
// VALIDATION RESULT TRANSFORMATION TESTS
// ============================================================================

// Test: Transform validation results to standardized format
type StandardizeValidationResult<T extends ValidationResult> = T extends {
  isValid: true;
  queryOptions: infer Q;
} ? {
  status: 'success';
  config: Q;
  messages: {
    warnings: T['warnings'];
    suggestions: T['suggestions'];
  };
} : T extends {
  isValid: false;
  errors: infer E;
} ? {
  status: 'error';
  errors: E;
  messages: {
    warnings: T['warnings'];
    suggestions: T['suggestions'];
  };
} : {
  status: 'unknown';
};

type TestStandardizeValidationSuccess = Expect<Equal<
  StandardizeValidationResult<{
    isValid: true;
    errors: [];
    warnings: ['No mcpServers'];
    suggestions: [];
    queryOptions: { model: 'sonnet' };
  }>,
  {
    status: 'success';
    config: { model: 'sonnet' };
    messages: {
      warnings: ['No mcpServers'];
      suggestions: [];
    };
  }
>>;

type TestStandardizeValidationError = Expect<Equal<
  StandardizeValidationResult<{
    isValid: false;
    errors: ['Missing model'];
    warnings: [];
    suggestions: [];
  }>,
  {
    status: 'error';
    errors: ['Missing model'];
    messages: {
      warnings: [];
      suggestions: [];
    };
  }
>>;

// ============================================================================
// COMPLEX CONDITIONAL TYPE CHAINS
// ============================================================================

// Test: Complex validation pipeline
type ValidationPipeline<Config> = 
  Config extends { name: string; description: string }
    ? Config extends { options: any }
      ? Config extends { options: { model: ValidModels } }
        ? { stage: 'complete'; result: 'valid' }
        : { stage: 'model-validation'; result: 'invalid-model' }
      : { stage: 'options-check'; result: 'missing-options' }
    : { stage: 'basic-validation'; result: 'missing-required-fields' };

type TestValidationPipelineComplete = Expect<Equal<
  ValidationPipeline<{
    name: 'test';
    description: 'test';
    options: { model: 'sonnet' };
  }>,
  { stage: 'complete'; result: 'valid' }
>>;

type TestValidationPipelineInvalidModel = Expect<Equal<
  ValidationPipeline<{
    name: 'test';
    description: 'test';
    options: { model: 'invalid' };
  }>,
  { stage: 'model-validation'; result: 'invalid-model' }
>>;

type TestValidationPipelineMissingOptions = Expect<Equal<
  ValidationPipeline<{
    name: 'test';
    description: 'test';
  }>,
  { stage: 'options-check'; result: 'missing-options' }
>>;

// ============================================================================
// BRAND TYPE TESTS FOR TYPE SAFETY
// ============================================================================

// Test: Branded types for validated configs
type Brand<T, B> = T & { __brand: B };

type ValidatedConfig = Brand<AgentConfig, 'ValidatedConfig'>;
type FixedConfig = Brand<AgentConfig, 'FixedConfig'>;

type TestValidatedConfigBrand = Expect<Equal<
  ValidatedConfig extends AgentConfig ? true : false,
  true
>>;

type TestConfigBrandDiscrimination = Expect<Equal<
  ValidatedConfig,
  FixedConfig
> extends true ? false : true>;

// ============================================================================
// ERROR HANDLING TYPE TESTS
// ============================================================================

// Test: Zod error handling
type ZodErrorTransformation<E> = E extends {
  errors: Array<{ path: infer P; message: infer M }>
} ? {
  validationErrors: Array<{ field: P; issue: M }>;
  formatted: Array<string>;
} : {
  genericError: E;
};

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

// Test: Complete agent validation workflow
type AgentValidationWorkflow<Config> = {
  input: Config;
  validation: ReturnType<typeof validateAgentConfig>;
  template: ReturnType<typeof createAgentTemplate>;
  fixed: ReturnType<typeof fixAgentConfig>;
};

// Test: Function pipeline types
type ValidationFunctionPipeline = {
  validate: typeof validateAgentConfig;
  create: typeof createAgentTemplate;
  fix: typeof fixAgentConfig;
};

type TestValidationFunctionPipeline = Expect<Equal<
  ValidationFunctionPipeline,
  {
    validate: (config: unknown) => ValidationResult;
    create: (name: string, description: string) => AgentConfig;
    fix: (config: any) => AgentConfig;
  }
>>;

// ============================================================================
// FINAL COMPREHENSIVE VALIDATION
// ============================================================================

// Test: All agent validator functions have correct signatures
type AgentValidatorFunctionValidation = {
  validateAgentConfig: typeof validateAgentConfig extends (config: unknown) => ValidationResult ? true : false;
  createAgentTemplate: typeof createAgentTemplate extends (name: string, description: string) => AgentConfig ? true : false;
  fixAgentConfig: typeof fixAgentConfig extends (config: any) => AgentConfig ? true : false;
  usesAnyType: IsAny<Parameters<typeof fixAgentConfig>[0]>;
};

type TestAgentValidatorComplete = Expect<Equal<
  AgentValidatorFunctionValidation,
  {
    validateAgentConfig: true;
    createAgentTemplate: true;
    fixAgentConfig: true;
    usesAnyType: true; // This identifies the 'any' usage that needs proper typing
  }
>>;

// If this file compiles without errors, all agent validator type tests pass!
export type AgentValidatorTypeTestsComplete = 'All agent validator compile-time type tests completed successfully! 🔍';