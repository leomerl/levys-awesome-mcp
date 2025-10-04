/**
 * Content Validation Utilities for Orchestrator Tests
 * Provides comprehensive validation of generated files for quality, patterns, and integration
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ValidationRule {
  regex: RegExp;
  description: string;
  required: boolean;
  category: 'typescript' | 'react' | 'nextjs' | 'security' | 'integration' | 'accessibility';
}

export interface QualityCheck {
  check: (content: string) => boolean;
  description: string;
  category: 'typescript' | 'react' | 'nextjs' | 'security';
  weight: number; // 1-10, importance weight
}

export interface IntegrationCheck {
  imports: string[];
  exports: string[];
  apiCalls: string[];
  description: string;
}

export interface ComponentValidator {
  // Basic existence requirements
  required: string[];

  // Pattern validation with regex
  patterns: ValidationRule[];

  // Code quality checks
  quality: QualityCheck[];

  // Integration validation
  integration?: IntegrationCheck;

  // Possible file locations (fallback support)
  possiblePaths: string[];

  // Component type for reporting
  componentType: 'react-component' | 'api-route' | 'utility' | 'config';
}

export interface ValidationResult {
  component: string;
  filePath: string | null;
  exists: boolean;
  basicScore: number; // 0-100
  patternScore: number; // 0-100
  qualityScore: number; // 0-100
  integrationScore: number; // 0-100
  overallScore: number; // 0-100
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: 'missing' | 'pattern' | 'quality' | 'integration';
  severity: 'error' | 'warning' | 'info';
  description: string;
  category: string;
}

export class ContentValidator {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Validate a component against its validation rules
   */
  async validateComponent(
    componentName: string,
    validator: ComponentValidator
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      component: componentName,
      filePath: null,
      exists: false,
      basicScore: 0,
      patternScore: 0,
      qualityScore: 0,
      integrationScore: 0,
      overallScore: 0,
      issues: [],
      recommendations: []
    };

    // Find the file in possible locations
    const filePath = this.findComponentFile(validator.possiblePaths);
    result.filePath = filePath;
    result.exists = filePath !== null;

    if (!result.exists) {
      result.issues.push({
        type: 'missing',
        severity: 'error',
        description: `Component file not found in any expected location`,
        category: 'existence'
      });
      return result;
    }

    // Read file content
    const content = fs.readFileSync(filePath!, 'utf-8');

    // Run validation checks
    result.basicScore = this.validateBasicRequirements(content, validator.required, result.issues);
    result.patternScore = this.validatePatterns(content, validator.patterns, result.issues);
    result.qualityScore = this.validateQuality(content, validator.quality, result.issues);
    result.integrationScore = this.validateIntegration(content, validator.integration, result.issues);

    // Calculate overall score with weights
    result.overallScore = Math.round(
      (result.basicScore * 0.4) + // Basic requirements are foundation
      (result.patternScore * 0.25) + // Patterns are important
      (result.qualityScore * 0.25) + // Quality matters
      (result.integrationScore * 0.1) // Integration is bonus
    );

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result, validator);

    return result;
  }

  /**
   * Find a component file in multiple possible locations
   */
  private findComponentFile(possiblePaths: string[]): string | null {
    for (const relativePath of possiblePaths) {
      const fullPath = path.join(this.baseDir, relativePath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  /**
   * Validate basic string requirements
   */
  private validateBasicRequirements(
    content: string,
    required: string[],
    issues: ValidationIssue[]
  ): number {
    const missing = required.filter(req =>
      !content.toLowerCase().includes(req.toLowerCase())
    );

    missing.forEach(req => {
      issues.push({
        type: 'missing',
        severity: 'error',
        description: `Missing required element: ${req}`,
        category: 'basic'
      });
    });

    return Math.round(((required.length - missing.length) / required.length) * 100);
  }

  /**
   * Validate regex patterns
   */
  private validatePatterns(
    content: string,
    patterns: ValidationRule[],
    issues: ValidationIssue[]
  ): number {
    let totalWeight = 0;
    let scoreWeight = 0;

    patterns.forEach(pattern => {
      const weight = pattern.required ? 2 : 1;
      totalWeight += weight;

      if (pattern.regex.test(content)) {
        scoreWeight += weight;
      } else {
        issues.push({
          type: 'pattern',
          severity: pattern.required ? 'error' : 'warning',
          description: `Pattern not found: ${pattern.description}`,
          category: pattern.category
        });
      }
    });

    return totalWeight > 0 ? Math.round((scoreWeight / totalWeight) * 100) : 100;
  }

  /**
   * Validate code quality
   */
  private validateQuality(
    content: string,
    qualityChecks: QualityCheck[],
    issues: ValidationIssue[]
  ): number {
    let totalWeight = 0;
    let scoreWeight = 0;

    qualityChecks.forEach(check => {
      totalWeight += check.weight;

      if (check.check(content)) {
        scoreWeight += check.weight;
      } else {
        issues.push({
          type: 'quality',
          severity: 'warning',
          description: `Quality issue: ${check.description}`,
          category: check.category
        });
      }
    });

    return totalWeight > 0 ? Math.round((scoreWeight / totalWeight) * 100) : 100;
  }

  /**
   * Validate integration requirements
   */
  private validateIntegration(
    content: string,
    integration: IntegrationCheck | undefined,
    issues: ValidationIssue[]
  ): number {
    if (!integration) return 100; // No integration requirements

    let score = 0;
    let totalChecks = 0;

    // Check imports
    if (integration.imports.length > 0) {
      const foundImports = integration.imports.filter(imp =>
        content.includes(`import`) && content.includes(imp)
      );
      score += (foundImports.length / integration.imports.length) * 30;
      totalChecks += 30;

      if (foundImports.length < integration.imports.length) {
        const missing = integration.imports.filter(imp => !foundImports.includes(imp));
        issues.push({
          type: 'integration',
          severity: 'warning',
          description: `Missing imports: ${missing.join(', ')}`,
          category: 'integration'
        });
      }
    }

    // Check exports
    if (integration.exports.length > 0) {
      const foundExports = integration.exports.filter(exp =>
        content.includes(`export`) && content.includes(exp)
      );
      score += (foundExports.length / integration.exports.length) * 30;
      totalChecks += 30;

      if (foundExports.length < integration.exports.length) {
        const missing = integration.exports.filter(exp => !foundExports.includes(exp));
        issues.push({
          type: 'integration',
          severity: 'warning',
          description: `Missing exports: ${missing.join(', ')}`,
          category: 'integration'
        });
      }
    }

    // Check API calls
    if (integration.apiCalls.length > 0) {
      const foundCalls = integration.apiCalls.filter(call =>
        content.includes(call)
      );
      score += (foundCalls.length / integration.apiCalls.length) * 40;
      totalChecks += 40;

      if (foundCalls.length < integration.apiCalls.length) {
        const missing = integration.apiCalls.filter(call => !foundCalls.includes(call));
        issues.push({
          type: 'integration',
          severity: 'warning',
          description: `Missing API calls: ${missing.join(', ')}`,
          category: 'integration'
        });
      }
    }

    return totalChecks > 0 ? Math.round(score) : 100;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    result: ValidationResult,
    validator: ComponentValidator
  ): string[] {
    const recommendations: string[] = [];

    if (result.basicScore < 80) {
      recommendations.push("Add missing required elements to meet basic functionality requirements");
    }

    if (result.patternScore < 70) {
      recommendations.push("Follow framework conventions and coding patterns");
    }

    if (result.qualityScore < 70) {
      recommendations.push("Improve code quality with better TypeScript usage and error handling");
    }

    if (result.integrationScore < 70 && validator.integration) {
      recommendations.push("Fix integration issues with imports, exports, and API calls");
    }

    if (result.overallScore < 60) {
      recommendations.push("Consider regenerating this component with clearer requirements");
    }

    return recommendations;
  }

  /**
   * Validate multiple components and generate summary report
   */
  async validateAll(validators: Record<string, ComponentValidator>): Promise<{
    results: ValidationResult[];
    summary: ValidationSummary;
  }> {
    const results: ValidationResult[] = [];

    for (const [name, validator] of Object.entries(validators)) {
      const result = await this.validateComponent(name, validator);
      results.push(result);
    }

    const summary = this.generateSummary(results);

    return { results, summary };
  }

  /**
   * Generate overall validation summary
   */
  private generateSummary(results: ValidationResult[]): ValidationSummary {
    const totalComponents = results.length;
    const existingComponents = results.filter(r => r.exists).length;
    const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / totalComponents;

    const issuesByType = results.reduce((acc, r) => {
      r.issues.forEach(issue => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const issuesBySeverity = results.reduce((acc, r) => {
      r.issues.forEach(issue => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      totalComponents,
      existingComponents,
      averageScore: Math.round(averageScore),
      issuesByType,
      issuesBySeverity,
      passed: averageScore >= 70 && existingComponents === totalComponents,
      recommendations: this.generateOverallRecommendations(results)
    };
  }

  private generateOverallRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];

    const avgScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    const missingFiles = results.filter(r => !r.exists).length;
    const lowQuality = results.filter(r => r.qualityScore < 60).length;

    if (missingFiles > 0) {
      recommendations.push(`${missingFiles} components were not created - check agent task completion`);
    }

    if (avgScore < 60) {
      recommendations.push("Overall code quality is low - review agent prompts and requirements");
    }

    if (lowQuality > 0) {
      recommendations.push(`${lowQuality} components have quality issues - improve TypeScript and patterns`);
    }

    return recommendations;
  }
}

export interface ValidationSummary {
  totalComponents: number;
  existingComponents: number;
  averageScore: number;
  issuesByType: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  passed: boolean;
  recommendations: string[];
}