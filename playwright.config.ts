/**
 * Playwright configuration for E2E testing
 * Supports cross-browser testing for dark mode functionality
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Read environment variables
const CI = process.env.CI === 'true';
const HEADED = process.env.HEADED === 'true';
const SLOW_MO = parseInt(process.env.SLOW_MO || '0', 10);

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Test match pattern
  testMatch: '**/*.e2e.test.ts',
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Global timeout for the whole test run
  globalTimeout: 10 * 60 * 1000,
  
  // Number of workers
  workers: CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    
    // Collect trace when test fails
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Slow down actions for debugging
    launchOptions: {
      slowMo: SLOW_MO,
    },
    
    // Custom test id attribute
    testIdAttribute: 'data-testid',
    
    // Emulate timezone
    timezoneId: 'America/New_York',
    
    // Locale
    locale: 'en-US',
    
    // Permissions
    permissions: ['clipboard-read', 'clipboard-write'],
    
    // Color scheme for testing
    colorScheme: 'no-preference',
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Test both light and dark system preferences
        colorScheme: 'light',
      },
    },
    {
      name: 'chromium-dark',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        colorScheme: 'light',
      },
    },
    {
      name: 'firefox-dark',
      use: { 
        ...devices['Desktop Firefox'],
        colorScheme: 'dark',
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        colorScheme: 'light',
      },
    },
    {
      name: 'webkit-dark',
      use: { 
        ...devices['Desktop Safari'],
        colorScheme: 'dark',
      },
    },
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        colorScheme: 'light',
      },
    },
    {
      name: 'mobile-chrome-dark',
      use: { 
        ...devices['Pixel 5'],
        colorScheme: 'dark',
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        colorScheme: 'light',
      },
    },
    {
      name: 'mobile-safari-dark',
      use: { 
        ...devices['iPhone 13'],
        colorScheme: 'dark',
      },
    },
    // Tablet browsers
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
        colorScheme: 'light',
      },
    },
    {
      name: 'tablet-safari',
      use: { 
        ...devices['iPad Pro'],
        colorScheme: 'dark',
      },
    },
    // Edge browser
    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
        colorScheme: 'light',
      },
    },
    {
      name: 'edge-dark',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
        colorScheme: 'dark',
      },
    },
  ],
  
  // Folder for test artifacts
  outputDir: 'test-results',
  
  // Retry configuration
  retries: CI ? 2 : 0,
  
  // Parallel execution
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!CI,
  
  // Opt out of parallel tests on CI
  maxFailures: CI ? 1 : undefined,
  
  // Web server configuration for local development
  webServer: [
    {
      command: 'npm run dev:backend',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: !CI,
      env: {
        NODE_ENV: 'test',
        PORT: '3000',
      },
    },
    {
      command: 'npm run dev:frontend',
      port: 5173,
      timeout: 120 * 1000,
      reuseExistingServer: !CI,
      env: {
        NODE_ENV: 'test',
        VITE_API_URL: 'http://localhost:3000',
      },
    },
  ],
  
  // Global setup and teardown
  globalSetup: path.join(__dirname, 'tests/e2e/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'tests/e2e/global-teardown.ts'),
  
  // Custom expect configuration
  expect: {
    // Maximum time expect() should wait for the condition
    timeout: 5000,
    
    // Custom matchers
    toMatchSnapshot: {
      // Threshold for image comparison
      threshold: 0.2,
      maxDiffPixels: 100,
    },
  },
  
  // Preserve test output
  preserveOutput: 'failures-only',
  
  // Update snapshots
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',
});

// Export custom test fixtures if needed
export { test } from '@playwright/test';

/**
 * Custom configuration for specific test scenarios
 */
export const darkModeTestConfig = {
  // Specific timeouts for dark mode tests
  animationTimeout: 500,
  transitionTimeout: 350,
  
  // Selectors for dark mode elements
  selectors: {
    darkModeToggle: '[aria-label*="Switch to"]',
    htmlElement: 'html',
    sunIcon: '.sun',
    moonIcon: '.moon',
    loginForm: {
      email: '[data-testid="email-input"]',
      password: '[data-testid="password-input"]',
      submit: '[data-testid="login-button"]',
    },
    logout: '[data-testid="logout-button"]',
  },
  
  // Test data
  testUsers: {
    default: {
      email: 'test@example.com',
      password: 'testPassword123',
    },
    admin: {
      email: 'admin@example.com',
      password: 'adminPassword123',
    },
  },
  
  // API endpoints
  api: {
    auth: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      register: '/api/auth/register',
      me: '/api/auth/me',
    },
    preferences: {
      get: '/api/preferences',
      update: '/api/preferences',
      updateTheme: '/api/preferences/theme',
      reset: '/api/preferences/reset',
      export: '/api/preferences/export',
    },
  },
  
  // Theme values
  themes: {
    light: 'light',
    dark: 'dark',
    system: 'system',
  },
  
  // Local storage keys
  localStorage: {
    theme: 'theme',
    preferences: 'user_preferences',
    cacheExpiry: 'preferences_cache_expiry',
  },
  
  // CSS variables to verify
  cssVariables: [
    '--color-background',
    '--color-text',
    '--color-primary',
    '--color-secondary',
    '--color-accent',
    '--color-border',
    '--shadow-sm',
    '--shadow-md',
    '--shadow-lg',
  ],
  
  // Accessibility requirements
  a11y: {
    minContrastRatio: 4.5,
    focusIndicatorMinWidth: 2,
    animationMaxDuration: 1000,
  },
};

/**
 * Helper function to create page object model for dark mode tests
 */
export class DarkModePageModel {
  constructor(private page: any) {}
  
  async login(email: string, password: string) {
    await this.page.fill(darkModeTestConfig.selectors.loginForm.email, email);
    await this.page.fill(darkModeTestConfig.selectors.loginForm.password, password);
    await this.page.click(darkModeTestConfig.selectors.loginForm.submit);
    await this.page.waitForURL(/dashboard|home/);
  }
  
  async logout() {
    await this.page.click(darkModeTestConfig.selectors.logout);
    await this.page.waitForURL(/login|signin/);
  }
  
  async toggleDarkMode() {
    await this.page.click(darkModeTestConfig.selectors.darkModeToggle);
    await this.page.waitForTimeout(darkModeTestConfig.transitionTimeout);
  }
  
  async isDarkMode(): Promise<boolean> {
    return await this.page.locator(darkModeTestConfig.selectors.htmlElement)
      .evaluate((el: HTMLElement) => el.classList.contains('dark'));
  }
  
  async getThemeFromLocalStorage(): Promise<string | null> {
    return await this.page.evaluate((key: string) => localStorage.getItem(key), 
      darkModeTestConfig.localStorage.theme);
  }
  
  async setThemeInLocalStorage(theme: string) {
    await this.page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: darkModeTestConfig.localStorage.theme, value: theme }
    );
  }
  
  async waitForAnimation() {
    await this.page.waitForTimeout(darkModeTestConfig.animationTimeout);
  }
  
  async getCSSVariable(variable: string): Promise<string> {
    return await this.page.evaluate((varName: string) => {
      const styles = getComputedStyle(document.documentElement);
      return styles.getPropertyValue(varName);
    }, variable);
  }
  
  async verifyAccessibility() {
    const toggle = this.page.locator(darkModeTestConfig.selectors.darkModeToggle);
    
    // Check ARIA attributes
    await expect(toggle).toHaveAttribute('role', 'switch');
    await expect(toggle).toHaveAttribute('aria-pressed', /true|false/);
    await expect(toggle).toHaveAttribute('tabindex', '0');
    
    // Check focus indicator
    await toggle.focus();
    const focusStyles = await toggle.evaluate((el: HTMLElement) => {
      const styles = getComputedStyle(el);
      return {
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
      };
    });
    
    expect(parseInt(focusStyles.outlineWidth)).toBeGreaterThanOrEqual(
      darkModeTestConfig.a11y.focusIndicatorMinWidth
    );
  }
}

// Export the page model
export { DarkModePageModel };