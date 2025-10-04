/**
 * Validation Rules for Different Component Types
 * Defines specific validation criteria for React components, API routes, and utilities
 */

import { ComponentValidator, ValidationRule, QualityCheck } from './content-validation.js';

/**
 * React Component Validation Rules
 */
export const createReactComponentValidator = (componentName: string): ComponentValidator => ({
  required: ['export', 'function', 'return'],

  possiblePaths: [
    `src/app/components/${componentName}.tsx`,
    `app/components/${componentName}.tsx`,
    `src/components/${componentName}.tsx`,
    `components/${componentName}.tsx`,
    `frontend/app/components/${componentName}.tsx`,
    `frontend/src/components/${componentName}.tsx`,
    `frontend/components/${componentName}.tsx`
  ],

  componentType: 'react-component',

  patterns: [
    {
      regex: /^'use client'|^"use client"/m,
      description: "Client directive for interactive components",
      required: true,
      category: 'nextjs'
    },
    {
      regex: /import.*React/,
      description: "React import statement",
      required: false,
      category: 'react'
    },
    {
      regex: /useState|useEffect|useCallback|useMemo/,
      description: "React hooks usage",
      required: true,
      category: 'react'
    },
    {
      regex: /interface\s+\w+/,
      description: "TypeScript interfaces",
      required: true,
      category: 'typescript'
    },
    {
      regex: /export\s+(default\s+)?function|const\s+\w+.*=.*=>/,
      description: "Proper component export",
      required: true,
      category: 'react'
    },
    {
      regex: /onClick|onSubmit|onChange/,
      description: "Event handlers",
      required: true,
      category: 'react'
    },
    {
      regex: /aria-\w+|role=|htmlFor=/,
      description: "Accessibility attributes",
      required: false,
      category: 'accessibility'
    }
  ],

  quality: [
    {
      check: (content) => !content.includes('any'),
      description: "No 'any' types used",
      category: 'typescript',
      weight: 8
    },
    {
      check: (content) => content.includes('try') && content.includes('catch'),
      description: "Error handling implemented",
      category: 'react',
      weight: 6
    },
    {
      check: (content) => /preventDefault|stopPropagation/.test(content),
      description: "Proper event handling",
      category: 'react',
      weight: 5
    },
    {
      check: (content) => content.includes('loading') || content.includes('Loading'),
      description: "Loading states implemented",
      category: 'react',
      weight: 7
    },
    {
      check: (content) => content.includes('error') || content.includes('Error'),
      description: "Error states implemented",
      category: 'react',
      weight: 7
    },
    {
      check: (content) => /disabled.*loading|disabled.*isLoading/.test(content),
      description: "UI disabled during loading",
      category: 'react',
      weight: 4
    }
  ]
});

/**
 * Login Form Specific Validation
 */
export const loginFormValidator: ComponentValidator = {
  ...createReactComponentValidator('LoginForm'),

  required: ['email', 'password', 'submit', 'form', 'useState'],

  patterns: [
    ...createReactComponentValidator('LoginForm').patterns,
    {
      regex: /type=['"]email['"]|type="email"/,
      description: "Email input with proper type",
      required: true,
      category: 'react'
    },
    {
      regex: /type=['"]password['"]|type="password"/,
      description: "Password input with proper type",
      required: true,
      category: 'react'
    },
    {
      regex: /fetch\(['"`][^'"`]*\/api\/auth[^'"`]*['"`]/,
      description: "API call to auth endpoint",
      required: true,
      category: 'integration'
    },
    {
      regex: /onSubmit|handleSubmit/,
      description: "Form submission handler",
      required: true,
      category: 'react'
    },
    {
      regex: /validation|validate/i,
      description: "Form validation logic",
      required: true,
      category: 'react'
    }
  ],

  integration: {
    imports: [],
    exports: ['LoginForm', 'default'],
    apiCalls: ['/api/auth'],
    description: "Login form integration requirements"
  }
};

/**
 * Next.js API Route Validation Rules
 */
export const createApiRouteValidator = (routeName: string): ComponentValidator => ({
  required: ['export', 'async', 'function', 'NextRequest', 'NextResponse'],

  possiblePaths: [
    `src/app/api/${routeName}/route.ts`,
    `app/api/${routeName}/route.ts`,
    `api/${routeName}/route.ts`,
    `src/api/${routeName}.ts`,
    `api/${routeName}.ts`
  ],

  componentType: 'api-route',

  patterns: [
    {
      regex: /import.*NextRequest.*from.*['"]next\/server['"]/,
      description: "Next.js server imports",
      required: true,
      category: 'nextjs'
    },
    {
      regex: /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/,
      description: "HTTP method export",
      required: true,
      category: 'nextjs'
    },
    {
      regex: /NextResponse\.json\(/,
      description: "Proper JSON response",
      required: true,
      category: 'nextjs'
    },
    {
      regex: /status:\s*\d+/,
      description: "HTTP status codes",
      required: true,
      category: 'nextjs'
    },
    {
      regex: /interface\s+\w+/,
      description: "TypeScript interfaces for request/response",
      required: true,
      category: 'typescript'
    }
  ],

  quality: [
    {
      check: (content) => content.includes('try') && content.includes('catch'),
      description: "Error handling with try-catch",
      category: 'nextjs',
      weight: 9
    },
    {
      check: (content) => /status:\s*(400|401|404|500)/.test(content),
      description: "Proper error status codes",
      category: 'nextjs',
      weight: 8
    },
    {
      check: (content) => content.includes('request.json()'),
      description: "Request body parsing",
      category: 'nextjs',
      weight: 7
    },
    {
      check: (content) => !content.includes('any'),
      description: "No 'any' types used",
      category: 'typescript',
      weight: 6
    },
    {
      check: (content) => /if\s*\(!.*\)\s*{/.test(content),
      description: "Input validation",
      category: 'security',
      weight: 8
    },
    {
      check: (content) => content.includes('console.error') || content.includes('console.log'),
      description: "Logging for debugging",
      category: 'nextjs',
      weight: 3
    }
  ]
});

/**
 * Auth API Route Specific Validation
 */
export const authApiRouteValidator: ComponentValidator = {
  ...createApiRouteValidator('auth'),

  required: ['POST', 'email', 'password', 'validateUser', 'NextRequest', 'NextResponse'],

  patterns: [
    ...createApiRouteValidator('auth').patterns,
    {
      regex: /validateUser.*createSession/s,
      description: "Uses auth utility functions",
      required: true,
      category: 'integration'
    },
    {
      regex: /status:\s*401/,
      description: "Unauthorized status for invalid credentials",
      required: true,
      category: 'security'
    },
    {
      regex: /status:\s*400/,
      description: "Bad request status for missing data",
      required: true,
      category: 'security'
    }
  ],

  integration: {
    imports: ['NextRequest', 'NextResponse', 'validateUser', 'createSession'],
    exports: ['POST'],
    apiCalls: [],
    description: "Auth API route integration requirements"
  }
};

/**
 * Utility Function Validation Rules
 */
export const createUtilityValidator = (utilityName: string): ComponentValidator => ({
  required: ['export', 'function'],

  possiblePaths: [
    `lib/${utilityName}.ts`,
    `src/lib/${utilityName}.ts`,
    `utils/${utilityName}.ts`,
    `src/utils/${utilityName}.ts`,
    `utilities/${utilityName}.ts`
  ],

  componentType: 'utility',

  patterns: [
    {
      regex: /export\s+(async\s+)?function|export\s+const\s+\w+\s*=/,
      description: "Exported functions",
      required: true,
      category: 'typescript'
    },
    {
      regex: /interface\s+\w+|type\s+\w+/,
      description: "Type definitions",
      required: true,
      category: 'typescript'
    },
    {
      regex: /Promise<\w+>|\sasync\s/,
      description: "Async function support",
      required: true,
      category: 'typescript'
    }
  ],

  quality: [
    {
      check: (content) => !content.includes('any'),
      description: "No 'any' types used",
      category: 'typescript',
      weight: 9
    },
    {
      check: (content) => content.includes('try') && content.includes('catch'),
      description: "Error handling implemented",
      category: 'typescript',
      weight: 7
    },
    {
      check: (content) => /\/\*\*[\s\S]*?\*\//.test(content),
      description: "JSDoc documentation",
      category: 'typescript',
      weight: 5
    },
    {
      check: (content) => /@param|@returns|@throws/.test(content),
      description: "Parameter and return documentation",
      category: 'typescript',
      weight: 4
    }
  ]
});

/**
 * Auth Utility Specific Validation
 */
export const authUtilityValidator: ComponentValidator = {
  ...createUtilityValidator('auth'),

  required: ['validateUser', 'createSession', 'export', 'interface', 'Promise'],

  patterns: [
    ...createUtilityValidator('auth').patterns,
    {
      regex: /export\s+async\s+function\s+validateUser/,
      description: "validateUser function export",
      required: true,
      category: 'typescript'
    },
    {
      regex: /export\s+async\s+function\s+createSession/,
      description: "createSession function export",
      required: true,
      category: 'typescript'
    },
    {
      regex: /interface\s+User|type\s+User/,
      description: "User type definition",
      required: true,
      category: 'typescript'
    },
    {
      regex: /interface\s+Session|type\s+Session/,
      description: "Session type definition",
      required: false,
      category: 'typescript'
    }
  ],

  integration: {
    imports: [],
    exports: ['validateUser', 'createSession', 'User'],
    apiCalls: [],
    description: "Auth utility integration requirements"
  }
};

/**
 * Complete validation configuration for the auth feature
 */
export const authFeatureValidators = {
  'LoginForm': loginFormValidator,
  'AuthAPI': authApiRouteValidator,
  'AuthUtils': authUtilityValidator
};