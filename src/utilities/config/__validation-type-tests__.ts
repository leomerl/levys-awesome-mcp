/**
 * Validation Utils Static Type Tests
 * 
 * Comprehensive compile-time type tests for validation utility functions.
 * These tests verify type guards, validation function signatures,
 * and complex parameter validation patterns.
 * 
 * The tests focus on:
 * - Type guard function behavior and type narrowing
 * - Validation function parameter and return types
 * - Generic constraints for validation patterns
 * - Template literal validation patterns
 * - Complex conditional type validations
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
 * Type guard utility
 */
type TypeGuard<T> = (value: any) => value is T;

/**
 * Validation function utility
 */
type ValidationFunction<T> = (value: T) => boolean;

// ============================================================================
// IMPORTS AND TYPE EXTRACTION
// ============================================================================

import { ValidationUtils } from './validation.js';

// ============================================================================
// VALIDATION UTILS CLASS STRUCTURE TESTS
// ============================================================================

// Test: ValidationUtils is a class with static methods
type TestValidationUtilsIsClass = Expect<Equal<
  typeof ValidationUtils extends { new (...args: any[]): any } ? false : true,
  true
>>;

// Test: ValidationUtils has expected static methods
type ValidationUtilsMethodNames = keyof typeof ValidationUtils;
type TestValidationUtilsMethodNames = Expect<Equal<
  ValidationUtilsMethodNames,
  'validateSessionId' | 'validateAgentName' | 'validateEmail' | 'validateUrl' | 
  'validatePort' | 'validateTimeout' | 'sanitizeString' | 'isNonEmptyString' | 'isValidJson'
>>;

// ============================================================================
// VALIDATE SESSION ID TESTS
// ============================================================================

// Test: validateSessionId method signature
type ValidateSessionIdMethod = typeof ValidationUtils.validateSessionId;
type TestValidateSessionIdSignature = Expect<Equal<
  ValidateSessionIdMethod,
  (sessionId: string) => boolean
>>;

// Test: validateSessionId parameters
type ValidateSessionIdParams = Parameters<ValidateSessionIdMethod>;
type TestValidateSessionIdParams = Expect<Equal<
  ValidateSessionIdParams,
  [sessionId: string]
>>;

// Test: validateSessionId return type
type ValidateSessionIdReturn = ReturnType<ValidateSessionIdMethod>;
type TestValidateSessionIdReturn = Expect<Equal<
  ValidateSessionIdReturn,
  boolean
>>;

// ============================================================================
// VALIDATE AGENT NAME TESTS
// ============================================================================

// Test: validateAgentName method signature
type ValidateAgentNameMethod = typeof ValidationUtils.validateAgentName;
type TestValidateAgentNameSignature = Expect<Equal<
  ValidateAgentNameMethod,
  (agentName: string) => boolean
>>;

// Test: validateAgentName parameters and return type
type ValidateAgentNameParams = Parameters<ValidateAgentNameMethod>;
type ValidateAgentNameReturn = ReturnType<ValidateAgentNameMethod>;

type TestValidateAgentNameParams = Expect<Equal<
  ValidateAgentNameParams,
  [agentName: string]
>>;

type TestValidateAgentNameReturn = Expect<Equal<
  ValidateAgentNameReturn,
  boolean
>>;

// ============================================================================
// VALIDATE EMAIL TESTS
// ============================================================================

// Test: validateEmail method signature
type ValidateEmailMethod = typeof ValidationUtils.validateEmail;
type TestValidateEmailSignature = Expect<Equal<
  ValidateEmailMethod,
  (email: string) => boolean
>>;

// Test: validateEmail parameters and return type
type ValidateEmailParams = Parameters<ValidateEmailMethod>;
type ValidateEmailReturn = ReturnType<ValidateEmailMethod>;

type TestValidateEmailParams = Expect<Equal<
  ValidateEmailParams,
  [email: string]
>>;

type TestValidateEmailReturn = Expect<Equal<
  ValidateEmailReturn,
  boolean
>>;

// ============================================================================
// VALIDATE URL TESTS
// ============================================================================

// Test: validateUrl method signature
type ValidateUrlMethod = typeof ValidationUtils.validateUrl;
type TestValidateUrlSignature = Expect<Equal<
  ValidateUrlMethod,
  (url: string) => boolean
>>;

// Test: validateUrl parameters and return type
type ValidateUrlParams = Parameters<ValidateUrlMethod>;
type ValidateUrlReturn = ReturnType<ValidateUrlMethod>;

type TestValidateUrlParams = Expect<Equal<
  ValidateUrlParams,
  [url: string]
>>;

type TestValidateUrlReturn = Expect<Equal<
  ValidateUrlReturn,
  boolean
>>;

// ============================================================================
// VALIDATE PORT TESTS
// ============================================================================

// Test: validatePort method signature
type ValidatePortMethod = typeof ValidationUtils.validatePort;
type TestValidatePortSignature = Expect<Equal<
  ValidatePortMethod,
  (port: number) => boolean
>>;

// Test: validatePort parameters and return type
type ValidatePortParams = Parameters<ValidatePortMethod>;
type ValidatePortReturn = ReturnType<ValidatePortMethod>;

type TestValidatePortParams = Expect<Equal<
  ValidatePortParams,
  [port: number]
>>;

type TestValidatePortReturn = Expect<Equal<
  ValidatePortReturn,
  boolean
>>;

// ============================================================================
// VALIDATE TIMEOUT TESTS
// ============================================================================

// Test: validateTimeout method signature
type ValidateTimeoutMethod = typeof ValidationUtils.validateTimeout;
type TestValidateTimeoutSignature = Expect<Equal<
  ValidateTimeoutMethod,
  (timeout: number) => boolean
>>;

// Test: validateTimeout parameters and return type
type ValidateTimeoutParams = Parameters<ValidateTimeoutMethod>;
type ValidateTimeoutReturn = ReturnType<ValidateTimeoutMethod>;

type TestValidateTimeoutParams = Expect<Equal<
  ValidateTimeoutParams,
  [timeout: number]
>>;

type TestValidateTimeoutReturn = Expect<Equal<
  ValidateTimeoutReturn,
  boolean
>>;

// ============================================================================
// SANITIZE STRING TESTS
// ============================================================================

// Test: sanitizeString method signature
type SanitizeStringMethod = typeof ValidationUtils.sanitizeString;
type TestSanitizeStringSignature = Expect<Equal<
  SanitizeStringMethod,
  (input: string) => string
>>;

// Test: sanitizeString parameters and return type
type SanitizeStringParams = Parameters<SanitizeStringMethod>;
type SanitizeStringReturn = ReturnType<SanitizeStringMethod>;

type TestSanitizeStringParams = Expect<Equal<
  SanitizeStringParams,
  [input: string]
>>;

type TestSanitizeStringReturn = Expect<Equal<
  SanitizeStringReturn,
  string
>>;

// ============================================================================
// IS NON EMPTY STRING TYPE GUARD TESTS
// ============================================================================

// Test: isNonEmptyString method signature (type guard)
type IsNonEmptyStringMethod = typeof ValidationUtils.isNonEmptyString;
type TestIsNonEmptyStringSignature = Expect<Equal<
  IsNonEmptyStringMethod,
  (value: any) => value is string
>>;

// Test: isNonEmptyString parameters and return type
type IsNonEmptyStringParams = Parameters<IsNonEmptyStringMethod>;
type IsNonEmptyStringReturn = ReturnType<IsNonEmptyStringMethod>;

type TestIsNonEmptyStringParams = Expect<Equal<
  IsNonEmptyStringParams,
  [value: any]
>>;

type TestIsNonEmptyStringReturn = Expect<Equal<
  IsNonEmptyStringReturn,
  value is string
>>;

// Test: Type guard behavior
type TestTypeGuardNarrowing<T> = T extends string
  ? ReturnType<typeof ValidationUtils.isNonEmptyString> extends boolean
    ? 'type-guard-works'
    : 'type-guard-broken'
  : 'not-string';

type TestTypeGuardResult = TestTypeGuardNarrowing<unknown>;

// ============================================================================
// IS VALID JSON TESTS
// ============================================================================

// Test: isValidJson method signature
type IsValidJsonMethod = typeof ValidationUtils.isValidJson;
type TestIsValidJsonSignature = Expect<Equal<
  IsValidJsonMethod,
  (jsonString: string) => boolean
>>;

// Test: isValidJson parameters and return type
type IsValidJsonParams = Parameters<IsValidJsonMethod>;
type IsValidJsonReturn = ReturnType<IsValidJsonMethod>;

type TestIsValidJsonParams = Expect<Equal<
  IsValidJsonParams,
  [jsonString: string]
>>;

type TestIsValidJsonReturn = Expect<Equal<
  IsValidJsonReturn,
  boolean
>>;

// ============================================================================
// GENERIC VALIDATION PATTERN TESTS
// ============================================================================

// Test: Generic validation function type
type GenericValidationFunction<T> = (value: T) => boolean;

// Test: String validation functions conform to generic pattern
type TestStringValidationConformance = Expect<Equal<
  typeof ValidationUtils.validateSessionId extends GenericValidationFunction<string> ? true : false,
  true
>>;

type TestAgentNameValidationConformance = Expect<Equal<
  typeof ValidationUtils.validateAgentName extends GenericValidationFunction<string> ? true : false,
  true
>>;

type TestEmailValidationConformance = Expect<Equal<
  typeof ValidationUtils.validateEmail extends GenericValidationFunction<string> ? true : false,
  true
>>;

type TestUrlValidationConformance = Expect<Equal<
  typeof ValidationUtils.validateUrl extends GenericValidationFunction<string> ? true : false,
  true
>>;

// Test: Number validation functions conform to generic pattern
type TestPortValidationConformance = Expect<Equal<
  typeof ValidationUtils.validatePort extends GenericValidationFunction<number> ? true : false,
  true
>>;

type TestTimeoutValidationConformance = Expect<Equal<
  typeof ValidationUtils.validateTimeout extends GenericValidationFunction<number> ? true : false,
  true
>>;

// ============================================================================
// TEMPLATE LITERAL VALIDATION PATTERN TESTS
// ============================================================================

// Test: Session ID pattern validation
type ValidSessionIdPattern<T extends string> = 
  T extends `${string}` 
    ? T extends '' 
      ? false 
      : T extends `${infer _}..${infer _}` 
      ? false 
      : true
    : false;

type TestValidSessionIdPattern = Expect<Equal<ValidSessionIdPattern<'valid-session-123'>, true>>;
type TestInvalidSessionIdPatternEmpty = Expect<Equal<ValidSessionIdPattern<''>, false>>;
type TestInvalidSessionIdPatternTraversal = Expect<Equal<ValidSessionIdPattern<'session..traversal'>, false>>;

// Test: Agent name pattern validation
type ValidAgentNamePattern<T extends string> = 
  T extends `${string}` 
    ? T extends '' 
      ? false 
      : T extends `${infer _} ${infer _}` 
      ? false 
      : true
    : false;

type TestValidAgentNamePattern = Expect<Equal<ValidAgentNamePattern<'valid-agent-name'>, true>>;
type TestInvalidAgentNamePatternEmpty = Expect<Equal<ValidAgentNamePattern<''>, false>>;
type TestInvalidAgentNamePatternSpace = Expect<Equal<ValidAgentNamePattern<'invalid agent name'>, false>>;

// Test: Email pattern validation using template literals
type ValidEmailPattern<T extends string> = 
  T extends `${string}@${string}.${string}` 
    ? T extends `@${string}` | `${string}@` | `${string}@.${string}` | `${string}@${string}.`
      ? false 
      : true
    : false;

type TestValidEmailPattern = Expect<Equal<ValidEmailPattern<'user@example.com'>, true>>;
type TestInvalidEmailPatternNoAt = Expect<Equal<ValidEmailPattern<'userexample.com'>, false>>;
type TestInvalidEmailPatternNoDomain = Expect<Equal<ValidEmailPattern<'user@'>, false>>;

// Test: URL pattern validation
type ValidUrlPattern<T extends string> = 
  T extends `http://${string}` | `https://${string}` | `ftp://${string}`
    ? true
    : false;

type TestValidUrlPattern = Expect<Equal<ValidUrlPattern<'https://example.com'>, true>>;
type TestValidUrlPatternHttp = Expect<Equal<ValidUrlPattern<'http://example.com'>, true>>;
type TestInvalidUrlPattern = Expect<Equal<ValidUrlPattern<'example.com'>, false>>;

// ============================================================================
// NUMERIC VALIDATION RANGE TESTS
// ============================================================================

// Test: Port range validation types
type ValidPortRange<T extends number> = T extends number
  ? T extends 1 | 80 | 443 | 8080 | 3000 | 65535 ? true : boolean
  : false;

// Test: Timeout range validation types
type ValidTimeoutRange<T extends number> = T extends number
  ? T extends 1000 | 5000 | 10000 | 30000 | 60000 ? true : boolean
  : false;

// ============================================================================
// CONDITIONAL TYPE VALIDATION TESTS
// ============================================================================

// Test: Input type discrimination for validation
type ValidateInputType<T> = 
  T extends string
    ? T extends `${string}@${string}.${string}`
      ? 'email'
      : T extends `http://${string}` | `https://${string}`
      ? 'url'
      : T extends `${string}-${string}`
      ? 'session-id'
      : 'string'
    : T extends number
    ? T extends 1 | 2 | 3 | 4 | 5 // Small numbers might be ports in testing
      ? 'port'
      : T extends 1000 | 5000 | 10000 // Larger numbers might be timeouts
      ? 'timeout'
      : 'number'
    : 'unknown';

type TestValidateEmailInput = Expect<Equal<
  ValidateInputType<'user@example.com'>,
  'email'
>>;

type TestValidateUrlInput = Expect<Equal<
  ValidateInputType<'https://example.com'>,
  'url'
>>;

type TestValidateSessionIdInput = Expect<Equal<
  ValidateInputType<'session-123'>,
  'session-id'
>>;

type TestValidatePortInput = Expect<Equal<
  ValidateInputType<3000>,
  'port' | 'number'
>>;

// ============================================================================
// TYPE GUARD BEHAVIOR TESTS
// ============================================================================

// Test: Type guard narrowing behavior
type TypeGuardNarrowing<Input, Guard extends (x: Input) => x is any> = 
  Guard extends (x: Input) => x is infer Narrowed
    ? { input: Input; narrowed: Narrowed; guard: Guard }
    : never;

type TestIsNonEmptyStringTypeGuard = TypeGuardNarrowing<
  any,
  typeof ValidationUtils.isNonEmptyString
>;

type TestTypeGuardNarrowingResult = Expect<Equal<
  TestIsNonEmptyStringTypeGuard['narrowed'],
  string
>>;

// Test: Type guard usage in conditional types
type UseTypeGuard<T, Guard extends (x: T) => boolean> = 
  Guard extends (x: T) => x is infer Narrowed
    ? { original: T; narrowed: Narrowed }
    : { original: T; narrowed: never };

type TestUseTypeGuardWithString = UseTypeGuard<unknown, typeof ValidationUtils.isNonEmptyString>;
type TestUseTypeGuardResult = Expect<Equal<
  TestUseTypeGuardWithString,
  { original: unknown; narrowed: string }
>>;

// ============================================================================
// VALIDATION PIPELINE TESTS
// ============================================================================

// Test: Multi-step validation pipeline
type ValidationPipeline<T> = {
  step1: T extends string ? 'string-check-passed' : 'not-string';
  step2: T extends string 
    ? typeof ValidationUtils.isNonEmptyString extends (x: T) => x is string
      ? 'non-empty-check-available'
      : 'non-empty-check-unavailable'
    : 'skip-non-empty-check';
  step3: T extends string
    ? T extends `${string}@${string}.${string}`
      ? 'email-pattern-matched'
      : 'not-email-pattern'
    : 'not-string-for-email';
};

type TestValidationPipelineEmail = ValidationPipeline<'user@example.com'>;
type TestValidationPipelineEmailResult = Expect<Equal<
  TestValidationPipelineEmail,
  {
    step1: 'string-check-passed';
    step2: 'non-empty-check-available';
    step3: 'email-pattern-matched';
  }
>>;

type TestValidationPipelineNonEmail = ValidationPipeline<'not-an-email'>;
type TestValidationPipelineNonEmailResult = Expect<Equal<
  TestValidationPipelineNonEmail,
  {
    step1: 'string-check-passed';
    step2: 'non-empty-check-available';
    step3: 'not-email-pattern';
  }
>>;

// ============================================================================
// SANITIZATION TYPE TESTS
// ============================================================================

// Test: Sanitization result type
type SanitizedString<T extends string> = string & { __sanitized: true };

// Test: Sanitization doesn't change string type
type TestSanitizationPreservesStringType = Expect<Equal<
  ReturnType<typeof ValidationUtils.sanitizeString> extends string ? true : false,
  true
>>;

// ============================================================================
// VALIDATION RESULT AGGREGATION TESTS
// ============================================================================

// Test: Aggregate validation results
type ValidationResults<T> = {
  sessionId: T extends string ? ReturnType<typeof ValidationUtils.validateSessionId> : false;
  agentName: T extends string ? ReturnType<typeof ValidationUtils.validateAgentName> : false;
  email: T extends string ? ReturnType<typeof ValidationUtils.validateEmail> : false;
  url: T extends string ? ReturnType<typeof ValidationUtils.validateUrl> : false;
  port: T extends number ? ReturnType<typeof ValidationUtils.validatePort> : false;
  timeout: T extends number ? ReturnType<typeof ValidationUtils.validateTimeout> : false;
  isNonEmpty: ReturnType<typeof ValidationUtils.isNonEmptyString>;
};

type TestValidationResults = Expect<Equal<
  ValidationResults<string>,
  {
    sessionId: boolean;
    agentName: boolean;
    email: boolean;
    url: boolean;
    port: false;
    timeout: false;
    isNonEmpty: boolean;
  }
>>;

// ============================================================================
// ERROR HANDLING TYPE TESTS
// ============================================================================

// Test: Validation error types
type ValidationError<Field extends string, Value, ExpectedType extends string> = {
  field: Field;
  value: Value;
  expectedType: ExpectedType;
  message: `Invalid ${Field}: expected ${ExpectedType}, got ${Value extends string ? 'string' : Value extends number ? 'number' : 'unknown'}`;
};

type TestValidationError = Expect<Equal<
  ValidationError<'sessionId', 'invalid@id', 'alphanumeric-with-hyphens'>,
  {
    field: 'sessionId';
    value: 'invalid@id';
    expectedType: 'alphanumeric-with-hyphens';
    message: 'Invalid sessionId: expected alphanumeric-with-hyphens, got string';
  }
>>;

// ============================================================================
// BRANDED TYPE TESTS FOR VALIDATED VALUES
// ============================================================================

// Test: Branded types for validated inputs
type Brand<T, B> = T & { __brand: B };

type ValidSessionId = Brand<string, 'ValidSessionId'>;
type ValidAgentName = Brand<string, 'ValidAgentName'>;
type ValidEmail = Brand<string, 'ValidEmail'>;
type ValidUrl = Brand<string, 'ValidUrl'>;
type ValidPort = Brand<number, 'ValidPort'>;
type ValidTimeout = Brand<number, 'ValidTimeout'>;

// Test: Validation with branding
type ValidateWithBranding<T, Validator extends (x: T) => boolean, Brand> = 
  Validator extends (x: T) => boolean
    ? T & { __validated: Brand }
    : never;

type TestValidateSessionIdWithBrand = ValidateWithBranding<
  string,
  typeof ValidationUtils.validateSessionId,
  'SessionId'
>;

// ============================================================================
// FUNCTION COMPOSITION TESTS
// ============================================================================

// Test: Compose validation functions
type ComposeValidations<T, V1 extends (x: T) => boolean, V2 extends (x: T) => boolean> = 
  (value: T) => V1 extends (x: T) => boolean 
    ? V2 extends (x: T) => boolean 
      ? boolean 
      : never
    : never;

type TestComposeStringValidations = ComposeValidations<
  string,
  typeof ValidationUtils.isNonEmptyString,
  typeof ValidationUtils.validateEmail
>;

// ============================================================================
// COMPLEX VALIDATION SCENARIO TESTS
// ============================================================================

// Test: Multi-field validation scenario
type ValidateUserInput<T extends Record<string, any>> = {
  sessionId: 'sessionId' extends keyof T 
    ? T['sessionId'] extends string 
      ? ReturnType<typeof ValidationUtils.validateSessionId>
      : false
    : false;
  email: 'email' extends keyof T
    ? T['email'] extends string
      ? ReturnType<typeof ValidationUtils.validateEmail>
      : false
    : false;
  port: 'port' extends keyof T
    ? T['port'] extends number
      ? ReturnType<typeof ValidationUtils.validatePort>
      : false
    : false;
};

type TestValidateUserInput = ValidateUserInput<{
  sessionId: string;
  email: string;
  port: number;
}>;

type TestValidateUserInputResult = Expect<Equal<
  TestValidateUserInput,
  {
    sessionId: boolean;
    email: boolean;
    port: boolean;
  }
>>;

// ============================================================================
// INTEGRATION WITH OTHER VALIDATION LIBRARIES
// ============================================================================

// Test: Integration with other validation patterns
type IntegrateValidation<T, Schema extends Record<string, any>> = {
  [K in keyof Schema]: K extends keyof T
    ? Schema[K] extends 'string'
      ? T[K] extends string
        ? ReturnType<typeof ValidationUtils.isNonEmptyString>
        : false
      : Schema[K] extends 'email'
      ? T[K] extends string
        ? ReturnType<typeof ValidationUtils.validateEmail>
        : false
      : Schema[K] extends 'url'
      ? T[K] extends string
        ? ReturnType<typeof ValidationUtils.validateUrl>
        : false
      : unknown
    : false;
};

type TestIntegrateValidation = IntegrateValidation<
  { name: string; email: string; website: string },
  { name: 'string'; email: 'email'; website: 'url' }
>;

type TestIntegrateValidationResult = Expect<Equal<
  TestIntegrateValidation,
  {
    name: boolean;
    email: boolean;
    website: boolean;
  }
>>;

// ============================================================================
// FINAL COMPREHENSIVE VALIDATION
// ============================================================================

// Test: All ValidationUtils methods have correct signatures
type ValidationUtilsMethodValidation = {
  validateSessionId: typeof ValidationUtils.validateSessionId extends (sessionId: string) => boolean ? true : false;
  validateAgentName: typeof ValidationUtils.validateAgentName extends (agentName: string) => boolean ? true : false;
  validateEmail: typeof ValidationUtils.validateEmail extends (email: string) => boolean ? true : false;
  validateUrl: typeof ValidationUtils.validateUrl extends (url: string) => boolean ? true : false;
  validatePort: typeof ValidationUtils.validatePort extends (port: number) => boolean ? true : false;
  validateTimeout: typeof ValidationUtils.validateTimeout extends (timeout: number) => boolean ? true : false;
  sanitizeString: typeof ValidationUtils.sanitizeString extends (input: string) => string ? true : false;
  isNonEmptyString: typeof ValidationUtils.isNonEmptyString extends TypeGuard<string> ? true : false;
  isValidJson: typeof ValidationUtils.isValidJson extends (jsonString: string) => boolean ? true : false;
};

type TestValidationUtilsComplete = Expect<Equal<
  ValidationUtilsMethodValidation,
  {
    validateSessionId: true;
    validateAgentName: true;
    validateEmail: true;
    validateUrl: true;
    validatePort: true;
    validateTimeout: true;
    sanitizeString: true;
    isNonEmptyString: true;
    isValidJson: true;
  }
>>;

// If this file compiles without errors, all validation utils type tests pass!
export type ValidationUtilsTypeTestsComplete = 'All validation utils compile-time type tests completed successfully! ✅';