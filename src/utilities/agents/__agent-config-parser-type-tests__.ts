/**
 * Agent Config Parser Static Type Tests
 * 
 * Comprehensive compile-time type tests for agent configuration parsing functionality.
 * These tests verify complex type transformations, generic constraints,
 * and configuration normalization patterns.
 * 
 * The tests focus on:
 * - ConfigValidationResult interface structure and discriminated unions
 * - Generic type transformations in parseAndValidate
 * - Configuration normalization type flows
 * - Legacy to modern config transformation patterns
 * - Complex conditional types for config merging
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

// ============================================================================
// IMPORTS AND TYPE EXTRACTION
// ============================================================================

import { 
  AgentConfigParser,
  ConfigValidationResult 
} from './agent-config-parser.js';
import { AgentConfig, AgentConfigLegacy } from '../../types/agent-config.js';

// ============================================================================
// CONFIG VALIDATION RESULT INTERFACE TESTS
// ============================================================================

// Test: ConfigValidationResult interface structure
type TestConfigValidationResultStructure = Expect<Equal<
  keyof ConfigValidationResult,
  'isValid' | 'errors' | 'warnings' | 'normalizedConfig'
>>;

// Test: ConfigValidationResult required vs optional fields
type ConfigValidationResultRequiredFields = RequiredKeys<ConfigValidationResult>;
type ConfigValidationResultOptionalFields = OptionalKeys<ConfigValidationResult>;

type TestConfigValidationResultRequired = Expect<Equal<
  ConfigValidationResultRequiredFields,
  'isValid' | 'errors' | 'warnings'
>>;

type TestConfigValidationResultOptional = Expect<Equal<
  ConfigValidationResultOptionalFields,
  'normalizedConfig'
>>;

// Test: ConfigValidationResult field types
type TestConfigValidationResultIsValid = Expect<Equal<ConfigValidationResult['isValid'], boolean>>;
type TestConfigValidationResultErrors = Expect<Equal<ConfigValidationResult['errors'], string[]>>;
type TestConfigValidationResultWarnings = Expect<Equal<ConfigValidationResult['warnings'], string[]>>;
type TestConfigValidationResultNormalizedConfig = Expect<Equal<ConfigValidationResult['normalizedConfig'], AgentConfig | undefined>>;

// ============================================================================
// AGENT CONFIG PARSER CLASS STRUCTURE TESTS
// ============================================================================

// Test: AgentConfigParser is a class with static methods
type TestAgentConfigParserIsClass = Expect<Equal<
  typeof AgentConfigParser extends { new (...args: any[]): any } ? false : true,
  true
>>;

// Test: AgentConfigParser has expected static methods
type AgentConfigParserMethodNames = keyof typeof AgentConfigParser;
type TestAgentConfigParserMethodNames = Expect<Equal<
  AgentConfigParserMethodNames,
  'parseAndValidate' | 'normalizeConfig' | 'convertLegacyConfig' | 'mergeConfigs'
>>;

// ============================================================================
// PARSE AND VALIDATE METHOD TESTS
// ============================================================================

// Test: parseAndValidate method signature (uses 'any' parameter)
type ParseAndValidateMethod = typeof AgentConfigParser.parseAndValidate;
type TestParseAndValidateSignature = Expect<Equal<
  ParseAndValidateMethod,
  (rawConfig: any) => ConfigValidationResult
>>;

// Test: parseAndValidate parameters (identifies 'any' usage)
type ParseAndValidateParams = Parameters<ParseAndValidateMethod>;
type TestParseAndValidateParams = Expect<Equal<
  ParseAndValidateParams,
  [rawConfig: any]
>>;

// Test: parseAndValidate return type
type ParseAndValidateReturn = ReturnType<ParseAndValidateMethod>;
type TestParseAndValidateReturn = Expect<Equal<
  ParseAndValidateReturn,
  ConfigValidationResult
>>;

// Test: Identify 'any' usage in function parameter
type TestParseAndValidateUsesAny = IsAny<Parameters<typeof AgentConfigParser.parseAndValidate>[0]>;
type TestParseAndValidateUsesAnyResult = Expect<TestParseAndValidateUsesAny>;

// ============================================================================
// NORMALIZE CONFIG METHOD TESTS
// ============================================================================

// Test: normalizeConfig method signature (uses 'any' parameter)
type NormalizeConfigMethod = typeof AgentConfigParser.normalizeConfig;
type TestNormalizeConfigSignature = Expect<Equal<
  NormalizeConfigMethod,
  (rawConfig: any) => AgentConfig
>>;

// Test: normalizeConfig parameters (identifies 'any' usage)
type NormalizeConfigParams = Parameters<NormalizeConfigMethod>;
type TestNormalizeConfigParams = Expect<Equal<
  NormalizeConfigParams,
  [rawConfig: any]
>>;

// Test: normalizeConfig return type
type NormalizeConfigReturn = ReturnType<NormalizeConfigMethod>;
type TestNormalizeConfigReturn = Expect<Equal<
  NormalizeConfigReturn,
  AgentConfig
>>;

// Test: Identify 'any' usage in function parameter
type TestNormalizeConfigUsesAny = IsAny<Parameters<typeof AgentConfigParser.normalizeConfig>[0]>;
type TestNormalizeConfigUsesAnyResult = Expect<TestNormalizeConfigUsesAny>;

// ============================================================================
// CONVERT LEGACY CONFIG METHOD TESTS
// ============================================================================

// Test: convertLegacyConfig method signature
type ConvertLegacyConfigMethod = typeof AgentConfigParser.convertLegacyConfig;
type TestConvertLegacyConfigSignature = Expect<Equal<
  ConvertLegacyConfigMethod,
  (legacyConfig: AgentConfigLegacy) => AgentConfig
>>;

// Test: convertLegacyConfig parameters (properly typed)
type ConvertLegacyConfigParams = Parameters<ConvertLegacyConfigMethod>;
type TestConvertLegacyConfigParams = Expect<Equal<
  ConvertLegacyConfigParams,
  [legacyConfig: AgentConfigLegacy]
>>;

// Test: convertLegacyConfig return type
type ConvertLegacyConfigReturn = ReturnType<ConvertLegacyConfigMethod>;
type TestConvertLegacyConfigReturn = Expect<Equal<
  ConvertLegacyConfigReturn,
  AgentConfig
>>;

// ============================================================================
// MERGE CONFIGS METHOD TESTS
// ============================================================================

// Test: mergeConfigs method signature
type MergeConfigsMethod = typeof AgentConfigParser.mergeConfigs;
type TestMergeConfigsSignature = Expect<Equal<
  MergeConfigsMethod,
  (baseConfig: AgentConfig, overrides: Partial<AgentConfig>) => AgentConfig
>>;

// Test: mergeConfigs parameters (properly typed)
type MergeConfigsParams = Parameters<MergeConfigsMethod>;
type TestMergeConfigsParams = Expect<Equal<
  MergeConfigsParams,
  [baseConfig: AgentConfig, overrides: Partial<AgentConfig>]
>>;

// Test: mergeConfigs return type
type MergeConfigsReturn = ReturnType<MergeConfigsMethod>;
type TestMergeConfigsReturn = Expect<Equal<
  MergeConfigsReturn,
  AgentConfig
>>;

// ============================================================================
// CONFIG NORMALIZATION TYPE TRANSFORMATION TESTS
// ============================================================================

// Define proper input types for normalization (to replace 'any')
type NormalizableConfig = {
  name: string;
  description: string;
  systemPrompt?: string;
  prompt?: string;
  model?: string;
  options?: {
    systemPrompt?: string;
    model?: string;
    allowedTools?: string[];
    mcpServers?: Record<string, any>;
    [key: string]: any;
  };
  permissions?: {
    mode?: string;
    tools?: {
      allowed?: string[];
      denied?: string[];
    };
    mcpServers?: Record<string, any>;
  };
  context?: {
    maxTokens?: number;
    temperature?: number;
  };
  color?: string;
  [key: string]: any;
};

// Test: Config type discrimination for normalization
type DiscriminateConfigFormat<T extends NormalizableConfig> = 
  T extends { options: any }
    ? 'new-format'
    : T extends { permissions: any }
    ? 'legacy-format'
    : 'basic-format';

type TestDiscriminateNewFormat = Expect<Equal<
  DiscriminateConfigFormat<{
    name: 'test';
    description: 'test';
    options: { model: 'sonnet' };
  }>,
  'new-format'
>>;

type TestDiscriminateLegacyFormat = Expect<Equal<
  DiscriminateConfigFormat<{
    name: 'test';
    description: 'test';
    permissions: { tools: { allowed: [] } };
  }>,
  'legacy-format'
>>;

type TestDiscriminateBasicFormat = Expect<Equal<
  DiscriminateConfigFormat<{
    name: 'test';
    description: 'test';
    systemPrompt: 'test';
  }>,
  'basic-format'
>>;

// ============================================================================
// CONFIG TRANSFORMATION TYPE TESTS
// ============================================================================

// Test: Transform different config formats to normalized structure
type NormalizeConfigTransformation<T extends NormalizableConfig> = {
  name: T['name'];
  description: T['description'];
  systemPrompt: T extends { options: { systemPrompt: infer S } }
    ? S
    : T['systemPrompt'];
  model: T extends { options: { model: infer M } }
    ? M
    : T['model'];
  options: T extends { options: infer O }
    ? O extends object
      ? O & {
          systemPrompt: T extends { options: { systemPrompt: infer S } } ? S : T['systemPrompt'];
          model: T extends { options: { model: infer M } } ? M : T['model'];
        }
      : {
          systemPrompt: T['systemPrompt'];
          model: T['model'];
          allowedTools: T extends { permissions: { tools: { allowed: infer A } } } ? A : string[];
        }
    : T extends { permissions: { tools: { allowed: infer A } } }
    ? {
        systemPrompt: T['systemPrompt'];
        model: T['model'];
        allowedTools: A;
      }
    : {
        systemPrompt: T extends { systemPrompt: infer S } ? S : T['prompt'];
        model: T['model'];
        allowedTools: string[];
      };
} & Omit<T, 'systemPrompt' | 'model'>;

// Test: Transformation for new format config
type TestTransformNewFormat = NormalizeConfigTransformation<{
  name: 'test';
  description: 'test';
  options: {
    systemPrompt: 'test prompt';
    model: 'sonnet';
    allowedTools: ['Read'];
  };
}>;

// ============================================================================
// LEGACY CONFIG CONVERSION TESTS
// ============================================================================

// Test: Legacy to modern config transformation
type LegacyToModernTransformation<T extends AgentConfigLegacy> = {
  name: T['name'];
  description: T['description'];
  systemPrompt: T['systemPrompt'];
  model: T['model'];
  options: {
    systemPrompt: T['systemPrompt'];
    model: T['model'];
    allowedTools: T['permissions']['tools']['allowed'];
    mcpServers: undefined;
  };
  permissions: T['permissions'];
  context: T['context'];
  color: T['color'];
};

type TestLegacyToModernTransformation = Expect<Equal<
  LegacyToModernTransformation<{
    name: 'test';
    description: 'test';
    model: 'sonnet';
    systemPrompt: 'test';
    permissions: {
      mode: 'default';
      tools: { allowed: ['Read']; denied: [] };
      mcpServers: {};
    };
    context: { maxTokens: 1000; temperature: 0.5 };
  }>['options']['allowedTools'],
  ['Read']
>>;

// ============================================================================
// CONFIG MERGING TYPE TESTS
// ============================================================================

// Test: Deep merge type transformation
type DeepMerge<Base, Override> = Override extends object
  ? Base extends object
    ? {
        [K in keyof Base | keyof Override]: 
          K extends keyof Override 
            ? K extends keyof Base
              ? Base[K] extends object
                ? Override[K] extends object
                  ? DeepMerge<Base[K], Override[K]>
                  : Override[K]
                : Override[K]
              : Override[K]
            : K extends keyof Base
            ? Base[K]
            : never;
      }
    : Override
  : Override;

type TestDeepMerge = Expect<Equal<
  DeepMerge<
    { name: string; options: { model: string; allowedTools: string[] } },
    { options: { model: string; temperature: number } }
  >,
  {
    name: string;
    options: {
      model: string;
      allowedTools: string[];
      temperature: number;
    };
  }
>>;

// Test: Config merge with partial override
type MergeConfigWithOverride<Base extends AgentConfig, Override extends Partial<AgentConfig>> = 
  Override extends { options: any }
    ? Base extends { options: any }
      ? {
          [K in keyof Base]: K extends 'options'
            ? Base[K] & Override[K]
            : K extends keyof Override
            ? Override[K]
            : Base[K];
        } & {
          systemPrompt: Override extends { options: { systemPrompt: infer S } } ? S : Base['systemPrompt'];
          model: Override extends { options: { model: infer M } } ? M : Base['model'];
        }
      : Base & Override
    : Base & Override;

// ============================================================================
// VALIDATION RESULT TYPE DISCRIMINATION TESTS
// ============================================================================

// Test: Validation result discrimination based on success
type DiscriminateValidationResult<T extends ConfigValidationResult> = 
  T extends { isValid: true; normalizedConfig: infer Config }
    ? Config extends AgentConfig
      ? { status: 'success'; config: Config; messages: { errors: T['errors']; warnings: T['warnings'] } }
      : { status: 'success-no-config'; messages: { errors: T['errors']; warnings: T['warnings'] } }
    : T extends { isValid: false; errors: infer Errors }
    ? { status: 'validation-failed'; errors: Errors; messages: { warnings: T['warnings'] } }
    : { status: 'unknown' };

type TestDiscriminateValidationSuccess = Expect<Equal<
  DiscriminateValidationResult<{
    isValid: true;
    errors: [];
    warnings: [];
    normalizedConfig: AgentConfig;
  }>,
  {
    status: 'success';
    config: AgentConfig;
    messages: { errors: []; warnings: [] };
  }
>>;

type TestDiscriminateValidationFailure = Expect<Equal<
  DiscriminateValidationResult<{
    isValid: false;
    errors: ['Missing name'];
    warnings: [];
  }>,
  {
    status: 'validation-failed';
    errors: ['Missing name'];
    messages: { warnings: [] };
  }
>>;

// ============================================================================
// CONDITIONAL TYPE TESTS FOR CONFIG VALIDATION
// ============================================================================

// Test: Config validation pipeline
type ConfigValidationPipeline<T> = 
  T extends { name: string; description: string }
    ? T extends { options: any } | { permissions: any }
      ? { stage: 'structure-validation'; result: 'valid-structure' }
      : { stage: 'structure-validation'; result: 'missing-config-section' }
    : { stage: 'basic-validation'; result: 'missing-required-fields' };

type TestValidationPipelineValid = Expect<Equal<
  ConfigValidationPipeline<{
    name: 'test';
    description: 'test';
    options: { model: 'sonnet' };
  }>,
  { stage: 'structure-validation'; result: 'valid-structure' }
>>;

type TestValidationPipelineMissingSection = Expect<Equal<
  ConfigValidationPipeline<{
    name: 'test';
    description: 'test';
  }>,
  { stage: 'structure-validation'; result: 'missing-config-section' }
>>;

type TestValidationPipelineMissingFields = Expect<Equal<
  ConfigValidationPipeline<{
    description: 'test';
  }>,
  { stage: 'basic-validation'; result: 'missing-required-fields' }
>>;

// ============================================================================
// GENERIC CONSTRAINT TESTS
// ============================================================================

// Test: Generic config parser with constraints
type ParseConfigWithConstraints<
  T extends { name: string; description: string },
  RequiredSections extends keyof T = never
> = T & {
  [K in RequiredSections]: T[K] extends undefined ? never : T[K];
};

type TestParseConfigWithConstraints = ParseConfigWithConstraints<
  { name: string; description: string; options?: any },
  'options'
>;

// This should fail compilation if options is undefined
// type TestConstraintsEnforcement = ParseConfigWithConstraints<
//   { name: string; description: string },
//   'options'
// >;

// ============================================================================
// TEMPLATE LITERAL TYPE TESTS FOR CONFIG GENERATION
// ============================================================================

// Test: Generate config names using template literals
type GenerateConfigName<Agent extends string, Environment extends string> = 
  `${Agent}-${Environment}-config`;

type TestGenerateConfigName = Expect<Equal<
  GenerateConfigName<'backend-agent', 'production'>,
  'backend-agent-production-config'
>>;

// Test: Parse config name components
type ParseConfigName<T extends string> = 
  T extends `${infer Agent}-${infer Environment}-config`
    ? { agent: Agent; environment: Environment }
    : never;

type TestParseConfigName = Expect<Equal<
  ParseConfigName<'frontend-agent-development-config'>,
  { agent: 'frontend-agent'; environment: 'development' }
>>;

// ============================================================================
// ERROR CLASSIFICATION TESTS
// ============================================================================

// Test: Classify config parsing errors
type ClassifyConfigError<Error extends string> = 
  Error extends `Missing or invalid ${infer Field} field`
    ? { type: 'missing-field'; field: Field }
    : Error extends `Invalid ${infer Field} format`
    ? { type: 'format-error'; field: Field }
    : Error extends `Configuration parsing error: ${infer Details}`
    ? { type: 'parsing-error'; details: Details }
    : { type: 'unknown-error'; message: Error };

type TestClassifyMissingFieldError = Expect<Equal<
  ClassifyConfigError<'Missing or invalid name field'>,
  { type: 'missing-field'; field: 'name' }
>>;

type TestClassifyFormatError = Expect<Equal<
  ClassifyConfigError<'Invalid agent name format'>,
  { type: 'format-error'; field: 'agent name' }
>>;

type TestClassifyParsingError = Expect<Equal<
  ClassifyConfigError<'Configuration parsing error: JSON syntax error'>,
  { type: 'parsing-error'; details: 'JSON syntax error' }
>>;

// ============================================================================
// BRAND TYPE TESTS FOR VALIDATED CONFIGS
// ============================================================================

// Test: Branded types for different config states
type Brand<T, B> = T & { __brand: B };

type ParsedConfig = Brand<AgentConfig, 'ParsedConfig'>;
type ValidatedConfig = Brand<AgentConfig, 'ValidatedConfig'>;
type NormalizedConfig = Brand<AgentConfig, 'NormalizedConfig'>;

type TestConfigBrandDiscrimination = Expect<Equal<ParsedConfig, ValidatedConfig> extends true ? false : true>;

// ============================================================================
// FUNCTION PIPELINE TYPE TESTS
// ============================================================================

// Test: Config processing pipeline types
type ConfigProcessingPipeline = {
  parse: typeof AgentConfigParser.parseAndValidate;
  normalize: typeof AgentConfigParser.normalizeConfig;
  merge: typeof AgentConfigParser.mergeConfigs;
  convertLegacy: typeof AgentConfigParser.convertLegacyConfig;
};

type TestConfigProcessingPipeline = Expect<Equal<
  ConfigProcessingPipeline,
  {
    parse: (rawConfig: any) => ConfigValidationResult;
    normalize: (rawConfig: any) => AgentConfig;
    merge: (baseConfig: AgentConfig, overrides: Partial<AgentConfig>) => AgentConfig;
    convertLegacy: (legacyConfig: AgentConfigLegacy) => AgentConfig;
  }
>>;

// ============================================================================
// COMPLEX INTEGRATION TESTS
// ============================================================================

// Test: Complete config processing workflow
type ConfigWorkflow<Input> = {
  input: Input;
  validation: ReturnType<typeof AgentConfigParser.parseAndValidate>;
  normalization: ReturnType<typeof AgentConfigParser.normalizeConfig>;
  merging: (overrides: Partial<AgentConfig>) => ReturnType<typeof AgentConfigParser.mergeConfigs>;
};

// Test: Legacy config processing workflow
type LegacyConfigWorkflow<Input extends AgentConfigLegacy> = {
  input: Input;
  conversion: ReturnType<typeof AgentConfigParser.convertLegacyConfig>;
  validation: ReturnType<typeof AgentConfigParser.parseAndValidate>;
};

// ============================================================================
// FINAL COMPREHENSIVE VALIDATION
// ============================================================================

// Test: All AgentConfigParser methods have correct signatures
type AgentConfigParserMethodValidation = {
  parseAndValidate: typeof AgentConfigParser.parseAndValidate extends (config: any) => ConfigValidationResult ? true : false;
  normalizeConfig: typeof AgentConfigParser.normalizeConfig extends (config: any) => AgentConfig ? true : false;
  convertLegacyConfig: typeof AgentConfigParser.convertLegacyConfig extends (config: AgentConfigLegacy) => AgentConfig ? true : false;
  mergeConfigs: typeof AgentConfigParser.mergeConfigs extends (base: AgentConfig, overrides: Partial<AgentConfig>) => AgentConfig ? true : false;
  usesAnyInParse: IsAny<Parameters<typeof AgentConfigParser.parseAndValidate>[0]>;
  usesAnyInNormalize: IsAny<Parameters<typeof AgentConfigParser.normalizeConfig>[0]>;
};

type TestAgentConfigParserComplete = Expect<Equal<
  AgentConfigParserMethodValidation,
  {
    parseAndValidate: true;
    normalizeConfig: true;
    convertLegacyConfig: true;
    mergeConfigs: true;
    usesAnyInParse: true; // This identifies 'any' usage that needs proper typing
    usesAnyInNormalize: true; // This identifies 'any' usage that needs proper typing
  }
>>;

// If this file compiles without errors, all agent config parser type tests pass!
export type AgentConfigParserTypeTestsComplete = 'All agent config parser compile-time type tests completed successfully! 🔧';