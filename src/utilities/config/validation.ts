/**
 * Input Validation Utilities
 * Centralizes validation logic for various inputs
 */

export class ValidationUtils {
  /**
   * Validate session ID format
   */
  static validateSessionId(sessionId: string): boolean {
    // Basic validation - alphanumeric, hyphens, underscores only
    return /^[a-zA-Z0-9_-]+$/.test(sessionId) && sessionId.length > 0 && sessionId.length <= 100;
  }

  /**
   * Validate agent name format
   */
  static validateAgentName(agentName: string): boolean {
    // Agent names should be alphanumeric with hyphens/underscores
    return /^[a-zA-Z0-9_-]+$/.test(agentName) && agentName.length > 0 && agentName.length <= 50;
  }

  /**
   * Validate email format (basic)
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate port number
   */
  static validatePort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  /**
   * Validate timeout value (milliseconds)
   */
  static validateTimeout(timeout: number): boolean {
    return Number.isInteger(timeout) && timeout > 0 && timeout <= 600000; // Max 10 minutes
  }


  /**
   * Sanitize string for safe usage
   */
  static sanitizeString(input: string): string {
    return input.replace(/[<>\"'&]/g, '');
  }

  /**
   * Check if string is not empty after trimming
   */
  static isNonEmptyString(value: any): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Validate JSON string
   */
  static isValidJson(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }
}