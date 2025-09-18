/**
 * Agent configuration parser with comprehensive validation
 */

import { z } from 'zod';
import type { 
  AgentConfig, 
  AgentConfigLegacy
} from '../../types/agent-config.js';

// Define types locally since they're not in agent-config.ts
type AgentModel = 'sonnet' | 'opus' | 'haiku';
type AgentOptions = {
  maxTokens?: number;
  temperature?: number;
  streaming?: boolean;
  saveToFile?: boolean;
};

/**
 * Zod schema for agent configuration validation
 */
const AgentConfigSchema = z.object({
  name: z.string()
    .min(1, 'Agent name is required')
    .regex(/^[a-z0-9-]+$/, 'Agent name must be lowercase alphanumeric with hyphens'),
  description: z.string().min(1, 'Description is required'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  model: z.enum(['sonnet', 'opus', 'haiku'] as const).optional(),
  allowedTools: z.array(z.string()).optional(),
  mcpServers: z.array(z.object({
    name: z.string(),
    config: z.object({
      command: z.string().optional(),
      env: z.record(z.string()).optional(),
      args: z.array(z.string()).optional()
    })
  })).optional(),
  options: z.object({
    maxTokens: z.number().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    streaming: z.boolean().optional(),
    saveToFile: z.boolean().optional()
  }).optional(),
  permissions: z.object({
    mode: z.enum(['default', 'acceptEdits', 'ask'] as const).optional(),
    tools: z.object({
      allowed: z.array(z.string()),
      denied: z.array(z.string())
    }).optional(),
    mcpServers: z.record(z.enum(['allow', 'deny', 'ask'] as const)).optional()
  }).optional()
});

// Extended AgentConfig interface with required fields
interface ParsedAgentConfig extends AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  model?: string; // Made optional to match AgentConfig
}

/**
 * Configuration validation result type
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig?: ParsedAgentConfig;
}

/**
 * Configuration parser with enhanced error handling and validation
 */
export class AgentConfigParser {
  /**
   * Parse and validate raw configuration input
   */
  static parseAndValidate(rawConfig: any): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const result = AgentConfigSchema.safeParse(rawConfig);
      
      if (!result.success) {
        result.error.issues.forEach(issue => {
          errors.push(`${issue.path.join('.')}: ${issue.message}`);
        });
        
        return {
          isValid: false,
          errors,
          warnings
        };
      }
      
      // Check for warnings (optional fields that could be improved)
      if (!result.data.model) {
        warnings.push('No model specified, defaulting to sonnet');
      }
      
      const normalizedConfig = this.normalizeConfig(result.data);
      
      return {
        isValid: true,
        errors,
        warnings,
        normalizedConfig
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error');
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }
  
  /**
   * Normalize configuration with defaults
   */
  static normalizeConfig(rawConfig: any): ParsedAgentConfig {
    const config = rawConfig as Partial<AgentConfig>;
    
    const defaults: ParsedAgentConfig = {
      name: config.name || '',
      description: config.description || '',
      systemPrompt: config.systemPrompt || config.prompt || '',
      model: config.model || 'sonnet',
      permissions: {
        mode: config.permissions?.mode || 'default',
        tools: config.permissions?.tools || {
          allowed: [],
          denied: []
        },
        mcpServers: config.permissions?.mcpServers || {}
      },
      context: config.context || {
        maxTokens: 4096,
        temperature: 0.7
      },
      options: config.options,
      color: config.color
    };
    
    return defaults;
  }
  
  /**
   * Convert legacy configuration format to new format
   */
  static convertLegacyConfig(legacyConfig: AgentConfigLegacy): ParsedAgentConfig {
    return {
      name: legacyConfig.name,
      description: legacyConfig.description || '',
      systemPrompt: legacyConfig.systemPrompt || '',
      model: this.mapLegacyModel(legacyConfig.model),
      permissions: legacyConfig.permissions,
      context: legacyConfig.context,
      color: legacyConfig.color
    };
  }
  
  /**
   * Map legacy model names to new format
   */
  private static mapLegacyModel(model: string | undefined): string {
    const modelMap: Record<string, AgentModel> = {
      'claude-3-sonnet': 'sonnet',
      'claude-3-opus': 'opus', 
      'claude-3-haiku': 'haiku',
      'sonnet': 'sonnet',
      'opus': 'opus',
      'haiku': 'haiku'
    };
    
    return modelMap[model || ''] || 'sonnet';
  }
  
  /**
   * Merge multiple configurations with priority
   */
  static mergeConfigs(baseConfig: AgentConfig, overrides: Partial<AgentConfig>): ParsedAgentConfig {
    const merged = {
      ...baseConfig,
      ...overrides,
      permissions: {
        ...baseConfig.permissions,
        ...overrides.permissions,
        tools: {
          ...baseConfig.permissions?.tools,
          ...overrides.permissions?.tools
        },
        mcpServers: {
          ...baseConfig.permissions?.mcpServers,
          ...overrides.permissions?.mcpServers
        }
      },
      context: {
        ...baseConfig.context,
        ...overrides.context
      },
      options: {
        ...baseConfig.options,
        ...overrides.options
      }
    };
    
    return this.normalizeConfig(merged);
  }
  
  /**
   * Validate configuration against schema
   */
  static validate(config: AgentConfig): boolean {
    const result = AgentConfigSchema.safeParse(config);
    return result.success;
  }
  
  /**
   * Get validation errors for configuration
   */
  static getValidationErrors(config: any): string[] {
    const result = AgentConfigSchema.safeParse(config);
    
    if (result.success) {
      return [];
    }
    
    return result.error.issues.map(issue => 
      `${issue.path.join('.')}: ${issue.message}`
    );
  }
  
  /**
   * Create empty configuration template
   */
  static createTemplate(): ParsedAgentConfig {
    return {
      name: '',
      description: '',
      systemPrompt: '',
      model: 'sonnet',
      permissions: {
        mode: 'default',
        tools: {
          allowed: [],
          denied: []
        },
        mcpServers: {}
      },
      context: {
        maxTokens: 4096,
        temperature: 0.7
      }
    };
  }
  
  /**
   * Check if configuration is complete
   */
  static isComplete(config: Partial<AgentConfig>): boolean {
    return !!(
      config.name &&
      config.description &&
      config.systemPrompt
    );
  }
}

/**
 * Static Type Tests
 * Using the "test dictionary" pattern to ensure TypeScript compiler validates our types
 */

// Type utilities for testing
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type NotEqual<X, Y> = Equal<X, Y> extends true ? false : true;

// Test input types for config parsing
type TestRawConfigInput = any; // Reflects actual usage
type LegacyConfigInput = AgentConfigLegacy;
type PartialConfigInput = Partial<AgentConfig>;

// Test result types
type ParseAndValidateResult = ReturnType<typeof AgentConfigParser.parseAndValidate>;
type NormalizeConfigResult = ReturnType<typeof AgentConfigParser.normalizeConfig>;
type ConvertLegacyResult = ReturnType<typeof AgentConfigParser.convertLegacyConfig>;
type MergeConfigsResult = ReturnType<typeof AgentConfigParser.mergeConfigs>;

// Test validation result structure
type ValidationResult = ConfigValidationResult;

// Test model type constraints
type ModelType = ParsedAgentConfig['model'];
type ValidModels = string | undefined; // Matches the actual type

// Test permission structure
type PermissionStructure = AgentConfig['permissions'];

// Test options structure
type OptionsStructure = AgentConfig['options'];

// Static type tests
const staticTypeTests = {
  // Test parseAndValidate return type
  parseAndValidateReturnType: (() => {
    type Result = ParseAndValidateResult;
    type IsValidationResult = Equal<Result, ValidationResult>;
    const test1: Expect<IsValidationResult> = true;
    return test1;
  })(),
  
  // Test normalizeConfig returns ParsedAgentConfig
  normalizeConfigReturnType: (() => {
    type Result = NormalizeConfigResult;
    type IsAgentConfig = Equal<Result, ParsedAgentConfig>;
    const test1: Expect<IsAgentConfig> = true;
    return test1;
  })(),
  
  // Test convertLegacyConfig returns ParsedAgentConfig
  convertLegacyReturnType: (() => {
    type Result = ConvertLegacyResult;
    type IsAgentConfig = Equal<Result, ParsedAgentConfig>;
    const test1: Expect<IsAgentConfig> = true;
    return test1;
  })(),
  
  // Test mergeConfigs returns ParsedAgentConfig
  mergeConfigsReturnType: (() => {
    type Result = MergeConfigsResult;
    type IsAgentConfig = Equal<Result, ParsedAgentConfig>;
    const test1: Expect<IsAgentConfig> = true;
    return test1;
  })(),
  
  // Test model type constraints
  modelTypeConstraints: (() => {
    type IsValidModels = Equal<ModelType, ValidModels>;
    const test1: Expect<IsValidModels> = true;
    return test1;
  })(),
  
  // Test validate method returns boolean
  validateReturnType: (() => {
    type Result = ReturnType<typeof AgentConfigParser.validate>;
    type IsBoolean = Equal<Result, boolean>;
    const test1: Expect<IsBoolean> = true;
    return test1;
  })(),
  
  // Test getValidationErrors returns string array
  getValidationErrorsReturnType: (() => {
    type Result = ReturnType<typeof AgentConfigParser.getValidationErrors>;
    type IsStringArray = Equal<Result, string[]>;
    const test1: Expect<IsStringArray> = true;
    return test1;
  })(),
  
  // Test createTemplate returns ParsedAgentConfig
  createTemplateReturnType: (() => {
    type Result = ReturnType<typeof AgentConfigParser.createTemplate>;
    type IsAgentConfig = Equal<Result, ParsedAgentConfig>;
    const test1: Expect<IsAgentConfig> = true;
    return test1;
  })(),
  
  // Test isComplete returns boolean
  isCompleteReturnType: (() => {
    type Result = ReturnType<typeof AgentConfigParser.isComplete>;
    type IsBoolean = Equal<Result, boolean>;
    const test1: Expect<IsBoolean> = true;
    return test1;
  })(),
  
  // Test input parameter types
  parameterTypes: (() => {
    // parseAndValidate accepts any (raw input)
    type ParseParam = Parameters<typeof AgentConfigParser.parseAndValidate>[0];
    type ParseAcceptsAny = Equal<ParseParam, any>;
    const test1: Expect<ParseAcceptsAny> = true;
    
    // normalizeConfig accepts any (raw config)
    type NormalizeParam = Parameters<typeof AgentConfigParser.normalizeConfig>[0];
    type NormalizeAcceptsAny = Equal<NormalizeParam, any>;
    const test2: Expect<NormalizeAcceptsAny> = true;
    
    // convertLegacyConfig accepts AgentConfigLegacy
    type ConvertParam = Parameters<typeof AgentConfigParser.convertLegacyConfig>[0];
    type ConvertAcceptsLegacy = Equal<ConvertParam, AgentConfigLegacy>;
    const test3: Expect<ConvertAcceptsLegacy> = true;
    
    // mergeConfigs accepts AgentConfig and Partial<AgentConfig>
    type MergeParams = Parameters<typeof AgentConfigParser.mergeConfigs>;
    type MergeAcceptsCorrect = Equal<MergeParams, [AgentConfig, Partial<AgentConfig>]>;
    const test4: Expect<MergeAcceptsCorrect> = true;
    
    return true as typeof test1 & typeof test2 & typeof test3 & typeof test4;
  })(),
  
  // Test method return type consistency
  methodReturnConsistency: (() => {
    // All methods that process config should return proper types
    type ParseReturnsValidation = ParseAndValidateResult extends ConfigValidationResult ? true : false;
    type NormalizeReturnsConfig = NormalizeConfigResult extends ParsedAgentConfig ? true : false;
    type ConvertReturnsConfig = ConvertLegacyResult extends ParsedAgentConfig ? true : false;
    type MergeReturnsConfig = MergeConfigsResult extends ParsedAgentConfig ? true : false;
    
    const test1: Expect<ParseReturnsValidation> = true;
    const test2: Expect<NormalizeReturnsConfig> = true;
    const test3: Expect<ConvertReturnsConfig> = true;
    const test4: Expect<MergeReturnsConfig> = true;
    
    return true as typeof test1 & typeof test2 & typeof test3 & typeof test4;
  })(),
  
  // Test ConfigValidationResult structure
  configValidationResultStructure: (() => {
    type HasIsValid = ConfigValidationResult extends { isValid: boolean } ? true : false;
    type HasErrors = ConfigValidationResult extends { errors: string[] } ? true : false;
    type HasWarnings = ConfigValidationResult extends { warnings: string[] } ? true : false;
    type HasNormalizedConfig = ConfigValidationResult extends { normalizedConfig?: ParsedAgentConfig } ? true : false;
    
    const test1: Expect<HasIsValid> = true;
    const test2: Expect<HasErrors> = true;
    const test3: Expect<HasWarnings> = true;
    const test4: Expect<HasNormalizedConfig> = true;
    
    return true as typeof test1 & typeof test2 & typeof test3 & typeof test4;
  })(),
  
  // Test type transformation safety
  typeTransformationSafety: (() => {
    // Test that raw input is properly transformed to typed output
    type RawInput = { name: unknown; model: unknown; [key: string]: unknown };
    type TransformedOutput = ParsedAgentConfig;
    
    // Ensure transformation narrows types appropriately
    type NameNarrowed = TransformedOutput['name'] extends string ? true : false;
    type ModelNarrowed = NonNullable<TransformedOutput['model']> extends string ? true : false;
    
    const test1: Expect<NameNarrowed> = true;
    const test2: Expect<ModelNarrowed> = true;
    
    return true as typeof test1 & typeof test2;
  })(),
  
  // Test error handling types
  errorHandlingTypes: (() => {
    // Validation errors should be string arrays
    type ErrorsType = ConfigValidationResult['errors'];
    type WarningsType = ConfigValidationResult['warnings'];
    
    type ErrorsAreStrings = ErrorsType extends string[] ? true : false;
    type WarningsAreStrings = WarningsType extends string[] ? true : false;
    
    const test1: Expect<ErrorsAreStrings> = true;
    const test2: Expect<WarningsAreStrings> = true;
    
    return true as typeof test1 & typeof test2;
  })()
};

// Type assertion to ensure all tests compile
const _typeTestVerification: typeof staticTypeTests = staticTypeTests;

/**
 * Additional type definitions to improve type safety where 'any' was used
 */

// More specific type for raw configuration input
export type RawConfigInput = {
  name?: unknown;
  description?: unknown;
  systemPrompt?: unknown;
  prompt?: unknown;
  model?: unknown;
  allowedTools?: unknown;
  mcpServers?: unknown;
  options?: unknown;
  permissions?: unknown;
  context?: unknown;
  color?: unknown;
  [key: string]: unknown;
};

// Type guard for raw config validation
export const isValidRawConfig = (config: unknown): config is RawConfigInput => {
  return typeof config === 'object' && config !== null;
};

// Export parser for external use
export default AgentConfigParser;