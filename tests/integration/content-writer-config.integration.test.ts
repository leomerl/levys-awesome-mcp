import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { readFile, mkdir } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { handleContentWriterTool } from '../../src/handlers/content-writer.js';
import type { ContentWriterConfig } from '../../src/config/content-writer-config.js';

describe('Content Writer Configuration Integration Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let testFiles: string[] = [];
  let testDirs: string[] = [];

  // Helper to create a temporary config file
  const createTempConfig = (config: ContentWriterConfig): string => {
    const configPath = path.join(tempDir, 'content-writer.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return configPath;
  };

  // Helper to clean up test files and directories
  const cleanup = () => {
    // Clean up test files
    testFiles.forEach(file => {
      if (existsSync(file)) {
        rmSync(file, { force: true });
      }
    });
    testFiles.length = 0;

    // Clean up test directories
    testDirs.forEach(dir => {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    });
    testDirs.length = 0;
  };

  beforeEach(() => {
    // Store original working directory
    originalCwd = process.cwd();

    // Create temporary directory and switch to it
    tempDir = mkdirSync(path.join(os.tmpdir(), `content-writer-test-${Date.now()}`), { recursive: true }) || '';
    tempDir = path.resolve(tempDir);
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Clean up and restore original working directory
    cleanup();
    process.chdir(originalCwd);
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('backend_write with configuration', () => {
    it('should write to backend folder when configured with single backend directory', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);
      const testContent = 'console.log("Hello from backend");';
      const testFile = 'backend/test-file.js';
      const fullPath = path.join(tempDir, testFile);
      testFiles.push(fullPath);

      // Act
      const result = await handleContentWriterTool('backend_write', {
        file_path: testFile,
        content: testContent
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('File written successfully');
      expect(existsSync(fullPath)).toBe(true);

      const writtenContent = await readFile(fullPath, 'utf8');
      expect(writtenContent).toBe(testContent);
    });

    it('should write to multiple backend folders when configured', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/', 'src/', 'server/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config with multiple backend dirs',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Test writing to each configured backend folder
      const testCases = [
        { path: 'backend/file1.js', content: 'backend content' },
        { path: 'src/file2.js', content: 'src content' },
        { path: 'server/file3.js', content: 'server content' }
      ];

      for (const testCase of testCases) {
        const fullPath = path.join(tempDir, testCase.path);
        testFiles.push(fullPath);

        // Act
        const result = await handleContentWriterTool('backend_write', {
          file_path: testCase.path,
          content: testCase.content
        });

        // Assert
        expect(result.isError).toBeUndefined();
        expect(existsSync(fullPath)).toBe(true);

        const writtenContent = await readFile(fullPath, 'utf8');
        expect(writtenContent).toBe(testCase.content);
      }
    });

    it('should reject paths outside configured backend folders', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Act - Try to write to a non-configured folder
      const result = await handleContentWriterTool('backend_write', {
        file_path: 'other-folder/file.js',
        content: 'should not be written'
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(existsSync(path.join(tempDir, 'other-folder/file.js'))).toBe(false);
    });

    it('should handle nested directories within backend folders', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/', 'src/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'src/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);
      const testContent = 'nested content';
      const testFile = 'src/deep/nested/directory/file.js';
      const fullPath = path.join(tempDir, testFile);
      testFiles.push(fullPath);
      testDirs.push(path.join(tempDir, 'src/deep'));

      // Act
      const result = await handleContentWriterTool('backend_write', {
        file_path: testFile,
        content: testContent
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(existsSync(fullPath)).toBe(true);

      const writtenContent = await readFile(fullPath, 'utf8');
      expect(writtenContent).toBe(testContent);
    });
  });

  describe('frontend_write with configuration', () => {
    it('should write to frontend folder when configured', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);
      const testContent = 'const App = () => <div>Hello</div>;';
      const testFile = 'frontend/App.tsx';
      const fullPath = path.join(tempDir, testFile);
      testFiles.push(fullPath);

      // Act
      const result = await handleContentWriterTool('frontend_write', {
        file_path: testFile,
        content: testContent
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('File written successfully');
      expect(existsSync(fullPath)).toBe(true);

      const writtenContent = await readFile(fullPath, 'utf8');
      expect(writtenContent).toBe(testContent);
    });

    it('should write to custom frontend folders when configured', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['client/', 'web/', 'ui/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'client/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config with custom frontend folders',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Test writing to each configured frontend folder
      const testCases = [
        { path: 'client/app.js', content: 'client app' },
        { path: 'web/index.html', content: '<html></html>' },
        { path: 'ui/components/button.tsx', content: 'button component' }
      ];

      for (const testCase of testCases) {
        const fullPath = path.join(tempDir, testCase.path);
        testFiles.push(fullPath);

        // Act
        const result = await handleContentWriterTool('frontend_write', {
          file_path: testCase.path,
          content: testCase.content
        });

        // Assert
        expect(result.isError).toBeUndefined();
        expect(existsSync(fullPath)).toBe(true);

        const writtenContent = await readFile(fullPath, 'utf8');
        expect(writtenContent).toBe(testCase.content);
      }
    });

    it('should reject frontend writes to backend folders', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/', 'src/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Act - Try to write to backend folder using frontend_write
      const result = await handleContentWriterTool('frontend_write', {
        file_path: 'backend/file.js',
        content: 'should not be written'
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(existsSync(path.join(tempDir, 'backend/file.js'))).toBe(false);
    });
  });

  describe('Fallback behavior without configuration', () => {
    it('should use hardcoded paths when config file is missing', async () => {
      // Arrange - No config file created
      const testContent = 'fallback content';

      // Test backend_write fallback
      const backendFile = 'backend/fallback-backend.js';
      const backendPath = path.join(tempDir, backendFile);
      testFiles.push(backendPath);

      // Act
      const backendResult = await handleContentWriterTool('backend_write', {
        file_path: backendFile,
        content: testContent
      });

      // Assert
      expect(backendResult.isError).toBeUndefined();
      expect(existsSync(backendPath)).toBe(true);

      // Test frontend_write fallback
      const frontendFile = 'frontend/fallback-frontend.js';
      const frontendPath = path.join(tempDir, frontendFile);
      testFiles.push(frontendPath);

      // Act
      const frontendResult = await handleContentWriterTool('frontend_write', {
        file_path: frontendFile,
        content: testContent
      });

      // Assert
      expect(frontendResult.isError).toBeUndefined();
      expect(existsSync(frontendPath)).toBe(true);
    });

    it('should handle src folder in backend_write fallback mode', async () => {
      // Arrange - No config file
      const testContent = 'src fallback content';
      const srcFile = 'src/utils/helper.js';
      const srcPath = path.join(tempDir, srcFile);
      testFiles.push(srcPath);
      testDirs.push(path.join(tempDir, 'src'));

      // Act
      const result = await handleContentWriterTool('backend_write', {
        file_path: srcFile,
        content: testContent
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(existsSync(srcPath)).toBe(true);

      const writtenContent = await readFile(srcPath, 'utf8');
      expect(writtenContent).toBe(testContent);
    });

    it('should reject invalid paths in fallback mode', async () => {
      // Act - Try path traversal without config
      const result = await handleContentWriterTool('backend_write', {
        file_path: '../outside/malicious.js',
        content: 'malicious content'
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Path traversal not allowed');
    });
  });

  describe('Invalid configuration handling', () => {
    it('should fall back to hardcoded paths with invalid JSON config', async () => {
      // Arrange - Create invalid JSON config
      const configPath = path.join(tempDir, 'src', 'content-writer.json');
      const srcDir = path.join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(configPath, '{ invalid json }');

      const testContent = 'content with invalid config';
      const testFile = 'backend/test.js';
      const fullPath = path.join(tempDir, testFile);
      testFiles.push(fullPath);

      // Act
      const result = await handleContentWriterTool('backend_write', {
        file_path: testFile,
        content: testContent
      });

      // Assert - Should still work with fallback
      expect(result.isError).toBeUndefined();
      expect(existsSync(fullPath)).toBe(true);
    });

    it('should fall back when config has missing required fields', async () => {
      // Arrange - Create config with missing fields
      const invalidConfig = {
        folderMappings: {
          backend: ['backend/']
          // Missing other required fields
        }
      };

      const configPath = path.join(tempDir, 'src', 'content-writer.json');
      const srcDir = path.join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(configPath, JSON.stringify(invalidConfig));

      const testContent = 'content with incomplete config';
      const testFile = 'frontend/test.js';
      const fullPath = path.join(tempDir, testFile);
      testFiles.push(fullPath);

      // Act
      const result = await handleContentWriterTool('frontend_write', {
        file_path: testFile,
        content: testContent
      });

      // Assert - Should still work with fallback
      expect(result.isError).toBeUndefined();
      expect(existsSync(fullPath)).toBe(true);
    });
  });

  describe('Path validation with different configurations', () => {
    it('should respect allowPathTraversal setting when true', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: true, // Allow path traversal
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Create a nested structure
      const nestedDir = path.join(tempDir, 'backend', 'nested');
      mkdirSync(nestedDir, { recursive: true });

      const testContent = 'traversal test';
      const testFile = 'backend/nested/../test.js'; // Path with traversal
      const expectedPath = path.join(tempDir, 'backend', 'test.js');
      testFiles.push(expectedPath);

      // Act
      const result = await handleContentWriterTool('backend_write', {
        file_path: testFile,
        content: testContent
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('should reject path traversal when allowPathTraversal is false', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false, // Disallow path traversal
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Act - Try path with traversal
      const result = await handleContentWriterTool('backend_write', {
        file_path: 'backend/../outside/file.js',
        content: 'should not be written'
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Path traversal not allowed');
    });

    it('should create directories when createDirectoriesIfNotExist is true', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true // Should create dirs
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      const testContent = 'auto-create test';
      const testFile = 'backend/new/deeply/nested/file.js';
      const fullPath = path.join(tempDir, testFile);
      testFiles.push(fullPath);
      testDirs.push(path.join(tempDir, 'backend/new'));

      // Act
      const result = await handleContentWriterTool('backend_write', {
        file_path: testFile,
        content: testContent
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(existsSync(fullPath)).toBe(true);
      expect(existsSync(path.dirname(fullPath))).toBe(true);
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle empty folder mappings gracefully', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: [], // Empty array
          frontend: [],
          agents: [],
          docs: [],
          reports: [],
          plans: []
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config with empty mappings',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Act - Try to write when no folders are configured
      const result = await handleContentWriterTool('backend_write', {
        file_path: 'backend/file.js',
        content: 'test content'
      });

      // Assert - Should be rejected since no folders are allowed
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should handle Windows-style paths correctly', async () => {
      // Skip on non-Windows platforms
      if (process.platform !== 'win32') {
        return;
      }

      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend\\'],
          frontend: ['frontend\\'],
          agents: ['agents\\'],
          docs: ['docs\\'],
          reports: ['reports\\'],
          plans: ['plan_and_progress\\']
        },
        defaultPaths: {
          backend: 'backend\\',
          frontend: 'frontend\\',
          agents: 'agents\\',
          docs: 'docs\\',
          reports: 'reports\\',
          plans: 'plan_and_progress\\'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config with Windows paths',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      const testContent = 'windows path test';
      const testFile = 'backend\\subdir\\file.js';
      const fullPath = path.join(tempDir, 'backend', 'subdir', 'file.js');
      testFiles.push(fullPath);

      // Act
      const result = await handleContentWriterTool('backend_write', {
        file_path: testFile,
        content: testContent
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(existsSync(fullPath)).toBe(true);
    });

    it('should handle files with special characters in names', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      const testContent = 'special chars test';
      const specialFiles = [
        'backend/file-with-dashes.js',
        'backend/file_with_underscores.js',
        'backend/file.test.spec.js',
        'frontend/@components/Button.tsx',
        'frontend/#temp/draft.js'
      ];

      for (const file of specialFiles) {
        const fullPath = path.join(tempDir, file);
        testFiles.push(fullPath);

        // Act
        const tool = file.startsWith('backend') ? 'backend_write' : 'frontend_write';
        const result = await handleContentWriterTool(tool, {
          file_path: file,
          content: testContent
        });

        // Assert
        expect(result.isError).toBeUndefined();
        expect(existsSync(fullPath)).toBe(true);
      }
    });

    it('should handle very long file paths', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Create a very long path (but within filesystem limits)
      const longPath = 'backend/' +
        'very/long/path/with/many/subdirectories/that/goes/deep/into/the/structure/' +
        'and/continues/even/further/down/the/tree/until/we/reach/the/final/file.js';

      const fullPath = path.join(tempDir, longPath);
      testFiles.push(fullPath);
      testDirs.push(path.join(tempDir, 'backend/very'));

      // Act
      const result = await handleContentWriterTool('backend_write', {
        file_path: longPath,
        content: 'long path content'
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(existsSync(fullPath)).toBe(true);
    });

    it('should handle concurrent writes to different files', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/', 'src/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Create multiple write operations
      const writeOperations = [
        { tool: 'backend_write', path: 'backend/file1.js', content: 'content1' },
        { tool: 'backend_write', path: 'src/file2.js', content: 'content2' },
        { tool: 'frontend_write', path: 'frontend/file3.js', content: 'content3' },
        { tool: 'backend_write', path: 'backend/subdir/file4.js', content: 'content4' },
        { tool: 'frontend_write', path: 'frontend/components/file5.js', content: 'content5' }
      ];

      // Act - Execute all writes concurrently
      const results = await Promise.all(
        writeOperations.map(op =>
          handleContentWriterTool(op.tool, {
            file_path: op.path,
            content: op.content
          })
        )
      );

      // Assert - All operations should succeed
      results.forEach((result, index) => {
        expect(result.isError).toBeUndefined();
        const fullPath = path.join(tempDir, writeOperations[index].path);
        testFiles.push(fullPath);
        expect(existsSync(fullPath)).toBe(true);
      });

      // Verify content
      for (const op of writeOperations) {
        const fullPath = path.join(tempDir, op.path);
        const content = await readFile(fullPath, 'utf8');
        expect(content).toBe(op.content);
      }
    });

    it('should handle config with different default paths than folder mappings', async () => {
      // Arrange
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['server/', 'api/', 'src/'],
          frontend: ['client/', 'web/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'api/', // Different from first in array
          frontend: 'web/', // Different from first in array
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config with different defaults',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      createTempConfig(config);

      // Test writing without folder prefix (should use default)
      const testContent = 'default path test';
      const backendFile = 'service.js'; // No folder prefix
      const frontendFile = 'app.js'; // No folder prefix

      // Act - Backend write without prefix
      const backendResult = await handleContentWriterTool('backend_write', {
        file_path: backendFile,
        content: testContent
      });

      // Assert - Should write to default backend path (api/)
      expect(backendResult.isError).toBeUndefined();
      const backendPath = path.join(tempDir, 'api', backendFile);
      testFiles.push(backendPath);
      expect(existsSync(backendPath)).toBe(true);

      // Act - Frontend write without prefix
      const frontendResult = await handleContentWriterTool('frontend_write', {
        file_path: frontendFile,
        content: testContent
      });

      // Assert - Should write to default frontend path (web/)
      expect(frontendResult.isError).toBeUndefined();
      const frontendPath = path.join(tempDir, 'web', frontendFile);
      testFiles.push(frontendPath);
      expect(existsSync(frontendPath)).toBe(true);
    });
  });

  describe('Config file location variations', () => {
    it('should load config from custom location if specified', async () => {
      // This test would require modifying the implementation to accept custom config paths
      // Currently the implementation looks for content-writer.json by default
      // Skipping as it would require implementation changes
    });

    it('should handle config file with UTF-8 BOM', async () => {
      // Arrange - Add BOM to config file
      const config: ContentWriterConfig = {
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          agents: ['agents/'],
          docs: ['docs/'],
          reports: ['reports/'],
          plans: ['plan_and_progress/']
        },
        defaultPaths: {
          backend: 'backend/',
          frontend: 'frontend/',
          agents: 'agents/',
          docs: 'docs/',
          reports: 'reports/',
          plans: 'plan_and_progress/'
        },
        pathValidation: {
          allowPathTraversal: false,
          restrictToConfiguredFolders: true,
          createDirectoriesIfNotExist: true
        },
        metadata: {
          version: '1.0.0',
          description: 'Test config with BOM',
          createdBy: 'test',
          lastModified: '2024-01-01'
        }
      };

      const configPath = path.join(tempDir, 'src', 'content-writer.json');
      const srcDir = path.join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });

      // Add UTF-8 BOM
      const bom = '\ufeff';
      const configWithBom = bom + JSON.stringify(config, null, 2);
      writeFileSync(configPath, configWithBom, 'utf8');

      const testContent = 'BOM test content';
      const testFile = 'backend/bom-test.js';
      const fullPath = path.join(tempDir, testFile);
      testFiles.push(fullPath);

      // Act
      const result = await handleContentWriterTool('backend_write', {
        file_path: testFile,
        content: testContent
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(existsSync(fullPath)).toBe(true);
    });
  });
});