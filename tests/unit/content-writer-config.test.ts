import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadContentWriterConfig,
  loadContentWriterConfigSync,
  getFolderMappings,
  getDefaultPath,
  isPathAllowed,
  ConfigNotFoundError,
  ConfigValidationError,
  type ContentWriterConfig
} from '../../src/config/content-writer-config';

describe('Content Writer Config Loader - Real Implementation Tests', () => {
  let tempDir: string;
  let testConfigPath: string;

  const validConfig: ContentWriterConfig = {
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
      description: 'Test configuration',
      createdBy: 'test-suite',
      lastModified: '2024-01-01'
    }
  };

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    testConfigPath = path.join(tempDir, 'test-config.json');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadContentWriterConfig (async)', () => {
    it('should successfully load and parse a valid configuration file', async () => {
      // Arrange
      fs.writeFileSync(testConfigPath, JSON.stringify(validConfig));

      // Act
      const result = await loadContentWriterConfig(testConfigPath);

      // Assert
      expect(result).toEqual(validConfig);
      expect(result.folderMappings.backend).toEqual(['backend/', 'src/']);
      expect(result.defaultPaths.backend).toBe('backend/');
      expect(result.pathValidation.allowPathTraversal).toBe(false);
      expect(result.metadata.version).toBe('1.0.0');
    });

    it('should use default path when no configPath is provided', async () => {
      // Act & Assert
      // This will try to load from the real .content-writer.json file
      const result = await loadContentWriterConfig();

      // Verify it loads the actual configuration
      expect(result).toBeDefined();
      expect(result.folderMappings).toBeDefined();
      expect(result.defaultPaths).toBeDefined();
      expect(result.pathValidation).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should throw ConfigNotFoundError when configuration file does not exist', async () => {
      // Arrange
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');

      // Act & Assert
      await expect(loadContentWriterConfig(nonExistentPath)).rejects.toThrow(ConfigNotFoundError);
      await expect(loadContentWriterConfig(nonExistentPath)).rejects.toThrow(
        `Configuration file not found: ${nonExistentPath}`
      );
    });

    it('should throw SyntaxError when JSON is invalid', async () => {
      // Arrange
      const invalidJson = '{ "invalid": json }';
      fs.writeFileSync(testConfigPath, invalidJson);

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(SyntaxError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'Invalid JSON syntax in configuration file'
      );
    });

    it('should handle file permission errors gracefully', async () => {
      // Arrange
      fs.writeFileSync(testConfigPath, JSON.stringify(validConfig));

      // Skip this test on Windows as chmod doesn't work the same way
      if (process.platform === 'win32') {
        return;
      }

      // Make file unreadable (Unix-like systems only)
      try {
        fs.chmodSync(testConfigPath, 0o000);

        // Act & Assert
        await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
          'Failed to load configuration'
        );
      } finally {
        // Restore permissions for cleanup
        fs.chmodSync(testConfigPath, 0o644);
      }
    });
  });

  describe('loadContentWriterConfigSync (sync)', () => {
    it('should successfully load and parse a valid configuration file synchronously', () => {
      // Arrange
      fs.writeFileSync(testConfigPath, JSON.stringify(validConfig));

      // Act
      const result = loadContentWriterConfigSync(testConfigPath);

      // Assert
      expect(result).toEqual(validConfig);
      expect(result.folderMappings.backend).toEqual(['backend/', 'src/']);
      expect(result.defaultPaths.backend).toBe('backend/');
      expect(result.pathValidation.allowPathTraversal).toBe(false);
      expect(result.metadata.version).toBe('1.0.0');
    });

    it('should throw ConfigNotFoundError when configuration file does not exist', () => {
      // Arrange
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');

      // Act & Assert
      expect(() => loadContentWriterConfigSync(nonExistentPath)).toThrow(ConfigNotFoundError);
      expect(() => loadContentWriterConfigSync(nonExistentPath)).toThrow(
        `Configuration file not found: ${nonExistentPath}`
      );
    });

    it('should throw SyntaxError when JSON is invalid', () => {
      // Arrange
      const invalidJson = '{ invalid json }';
      fs.writeFileSync(testConfigPath, invalidJson);

      // Act & Assert
      expect(() => loadContentWriterConfigSync(testConfigPath)).toThrow(SyntaxError);
      expect(() => loadContentWriterConfigSync(testConfigPath)).toThrow(
        'Invalid JSON syntax in configuration file'
      );
    });
  });

  describe('Configuration Structure Validation', () => {
    it('should throw ConfigValidationError when configuration is not an object', async () => {
      // Arrange
      fs.writeFileSync(testConfigPath, 'null');

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'Configuration must be a valid object'
      );
    });

    it('should throw ConfigValidationError when configuration is an array', async () => {
      // Arrange
      fs.writeFileSync(testConfigPath, '[]');

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'Configuration must be a valid object'
      );
    });

    it('should throw ConfigValidationError when folderMappings is missing', async () => {
      // Arrange
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).folderMappings;
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'folderMappings is required and must be an object'
      );
    });

    it('should throw ConfigValidationError when folderMappings has missing required folders', async () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        folderMappings: {
          backend: ['backend/'],
          frontend: ['frontend/'],
          // Missing agents, docs, reports, plans
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'folderMappings.agents must be an array of strings'
      );
    });

    it('should throw ConfigValidationError when folderMappings contains non-string values', async () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        folderMappings: {
          ...validConfig.folderMappings,
          backend: ['backend/', 123] // Invalid: contains number
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'folderMappings.backend must contain only strings'
      );
    });

    it('should throw ConfigValidationError when defaultPaths is missing', async () => {
      // Arrange
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).defaultPaths;
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'defaultPaths is required and must be an object'
      );
    });

    it('should throw ConfigValidationError when defaultPaths has non-string values', async () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        defaultPaths: {
          ...validConfig.defaultPaths,
          backend: 123 // Invalid: should be string
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'defaultPaths.backend must be a string'
      );
    });

    it('should throw ConfigValidationError when pathValidation is missing', async () => {
      // Arrange
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).pathValidation;
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'pathValidation is required and must be an object'
      );
    });

    it('should throw ConfigValidationError when pathValidation has non-boolean values', async () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        pathValidation: {
          ...validConfig.pathValidation,
          allowPathTraversal: 'false' // Invalid: should be boolean
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'pathValidation.allowPathTraversal must be a boolean'
      );
    });

    it('should throw ConfigValidationError when metadata is missing', async () => {
      // Arrange
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).metadata;
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'metadata is required and must be an object'
      );
    });

    it('should throw ConfigValidationError when metadata has missing or non-string fields', async () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        metadata: {
          version: '1.0.0',
          description: 'Test',
          createdBy: 'test',
          // Missing lastModified
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
      await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
        'metadata.lastModified must be a string'
      );
    });

    it('should validate all required folder categories', async () => {
      const requiredCategories = ['backend', 'frontend', 'agents', 'docs', 'reports', 'plans'];

      for (const category of requiredCategories) {
        // Arrange
        const incompleteConfig = {
          ...validConfig,
          folderMappings: { ...validConfig.folderMappings }
        };
        delete (incompleteConfig.folderMappings as any)[category];
        fs.writeFileSync(testConfigPath, JSON.stringify(incompleteConfig));

        // Act & Assert
        await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
        await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
          `folderMappings.${category} must be an array of strings`
        );
      }
    });

    it('should validate all required pathValidation fields', async () => {
      const requiredFields = ['allowPathTraversal', 'restrictToConfiguredFolders', 'createDirectoriesIfNotExist'];

      for (const field of requiredFields) {
        // Arrange
        const incompleteConfig = {
          ...validConfig,
          pathValidation: { ...validConfig.pathValidation }
        };
        delete (incompleteConfig.pathValidation as any)[field];
        fs.writeFileSync(testConfigPath, JSON.stringify(incompleteConfig));

        // Act & Assert
        await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
        await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
          `pathValidation.${field} must be a boolean`
        );
      }
    });

    it('should validate all required metadata fields', async () => {
      const requiredFields = ['version', 'description', 'createdBy', 'lastModified'];

      for (const field of requiredFields) {
        // Arrange
        const incompleteConfig = {
          ...validConfig,
          metadata: { ...validConfig.metadata }
        };
        delete (incompleteConfig.metadata as any)[field];
        fs.writeFileSync(testConfigPath, JSON.stringify(incompleteConfig));

        // Act & Assert
        await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(ConfigValidationError);
        await expect(loadContentWriterConfig(testConfigPath)).rejects.toThrow(
          `metadata.${field} must be a string`
        );
      }
    });
  });

  describe('Utility Functions', () => {
    describe('getFolderMappings', () => {
      it('should return the correct folder mappings for a given category', () => {
        // Act & Assert
        expect(getFolderMappings(validConfig, 'backend')).toEqual(['backend/', 'src/']);
        expect(getFolderMappings(validConfig, 'frontend')).toEqual(['frontend/']);
        expect(getFolderMappings(validConfig, 'agents')).toEqual(['agents/']);
        expect(getFolderMappings(validConfig, 'docs')).toEqual(['docs/']);
        expect(getFolderMappings(validConfig, 'reports')).toEqual(['reports/']);
        expect(getFolderMappings(validConfig, 'plans')).toEqual(['plan_and_progress/']);
      });

      it('should handle empty arrays in folder mappings', () => {
        // Arrange
        const configWithEmptyArrays = {
          ...validConfig,
          folderMappings: {
            ...validConfig.folderMappings,
            backend: []
          }
        };

        // Act & Assert
        expect(getFolderMappings(configWithEmptyArrays, 'backend')).toEqual([]);
      });
    });

    describe('getDefaultPath', () => {
      it('should return the correct default path for a given category', () => {
        // Act & Assert
        expect(getDefaultPath(validConfig, 'backend')).toBe('backend/');
        expect(getDefaultPath(validConfig, 'frontend')).toBe('frontend/');
        expect(getDefaultPath(validConfig, 'agents')).toBe('agents/');
        expect(getDefaultPath(validConfig, 'docs')).toBe('docs/');
        expect(getDefaultPath(validConfig, 'reports')).toBe('reports/');
        expect(getDefaultPath(validConfig, 'plans')).toBe('plan_and_progress/');
      });
    });

    describe('isPathAllowed', () => {
      it('should allow paths within configured folders', () => {
        // Act & Assert
        expect(isPathAllowed(validConfig, 'backend/file.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'src/utils.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'frontend/App.tsx', 'frontend')).toBe(true);
        expect(isPathAllowed(validConfig, 'agents/test.ts', 'agents')).toBe(true);
        expect(isPathAllowed(validConfig, 'docs/README.md', 'docs')).toBe(true);
        expect(isPathAllowed(validConfig, 'reports/summary.json', 'reports')).toBe(true);
        expect(isPathAllowed(validConfig, 'plan_and_progress/plan.json', 'plans')).toBe(true);
      });

      it('should reject paths outside configured folders', () => {
        // Act & Assert
        expect(isPathAllowed(validConfig, 'other/file.ts', 'backend')).toBe(false);
        expect(isPathAllowed(validConfig, 'backend/file.ts', 'frontend')).toBe(false);
        expect(isPathAllowed(validConfig, 'frontend/file.ts', 'backend')).toBe(false);
        expect(isPathAllowed(validConfig, 'tests/test.ts', 'backend')).toBe(false);
      });

      it('should reject paths with traversal when allowPathTraversal is false', () => {
        // Act & Assert
        expect(isPathAllowed(validConfig, 'backend/../secret.ts', 'backend')).toBe(false);
        expect(isPathAllowed(validConfig, '../backend/file.ts', 'backend')).toBe(false);
        expect(isPathAllowed(validConfig, 'frontend/../../../etc/passwd', 'frontend')).toBe(false);
        expect(isPathAllowed(validConfig, 'docs/../../sensitive.md', 'docs')).toBe(false);
      });

      it('should handle paths with traversal when allowPathTraversal is true', () => {
        // Arrange
        const configWithTraversal = {
          ...validConfig,
          pathValidation: {
            ...validConfig.pathValidation,
            allowPathTraversal: true
          }
        };

        // Act & Assert
        // Path with traversal that still resolves to allowed folder
        expect(isPathAllowed(configWithTraversal, 'backend/../backend/file.ts', 'backend')).toBe(true);
        expect(isPathAllowed(configWithTraversal, 'src/../src/utils.ts', 'backend')).toBe(true);

        // Path that traverses outside allowed folders
        expect(isPathAllowed(configWithTraversal, '../secret/file.ts', 'backend')).toBe(false);
        expect(isPathAllowed(configWithTraversal, 'backend/../../other/file.ts', 'backend')).toBe(false);
      });

      it('should handle nested paths correctly', () => {
        // Act & Assert
        expect(isPathAllowed(validConfig, 'backend/services/api/handler.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'src/utils/helpers/string.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'frontend/components/ui/Button.tsx', 'frontend')).toBe(true);
        expect(isPathAllowed(validConfig, 'docs/api/endpoints/user.md', 'docs')).toBe(true);
        expect(isPathAllowed(validConfig, 'agents/test/helper/util.ts', 'agents')).toBe(true);
      });

      it('should handle Windows-style paths correctly', () => {
        // Note: path.normalize handles cross-platform path conversion
        // Act & Assert
        expect(isPathAllowed(validConfig, 'backend\\file.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'src\\utils\\helper.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'frontend\\App.tsx', 'frontend')).toBe(true);
        expect(isPathAllowed(validConfig, 'docs\\guide.md', 'docs')).toBe(true);
      });

      it('should handle mixed path separators', () => {
        // Act & Assert
        expect(isPathAllowed(validConfig, 'backend/services\\api/handler.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'frontend\\components/Button.tsx', 'frontend')).toBe(true);
      });

      it('should handle paths with dots correctly', () => {
        // Act & Assert
        expect(isPathAllowed(validConfig, 'backend/./file.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'src/./utils/./helper.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'frontend/./components/Button.tsx', 'frontend')).toBe(true);
      });

      it('should handle double slashes in paths', () => {
        // Act & Assert
        expect(isPathAllowed(validConfig, 'backend//file.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'src///utils//helper.ts', 'backend')).toBe(true);
        expect(isPathAllowed(validConfig, 'frontend//components//Button.tsx', 'frontend')).toBe(true);
      });
    });
  });

  describe('Default Fallback Values', () => {
    it('should load from default location when path not provided', async () => {
      // This test uses the actual .content-writer.json file
      const result = await loadContentWriterConfig();

      // Verify the structure matches expected configuration
      expect(result.folderMappings).toHaveProperty('backend');
      expect(result.folderMappings).toHaveProperty('frontend');
      expect(result.folderMappings).toHaveProperty('agents');
      expect(result.folderMappings).toHaveProperty('docs');
      expect(result.folderMappings).toHaveProperty('reports');
      expect(result.folderMappings).toHaveProperty('plans');

      expect(result.defaultPaths).toHaveProperty('backend');
      expect(result.defaultPaths).toHaveProperty('frontend');
      expect(result.defaultPaths).toHaveProperty('agents');
      expect(result.defaultPaths).toHaveProperty('docs');
      expect(result.defaultPaths).toHaveProperty('reports');
      expect(result.defaultPaths).toHaveProperty('plans');

      expect(result.pathValidation).toHaveProperty('allowPathTraversal');
      expect(result.pathValidation).toHaveProperty('restrictToConfiguredFolders');
      expect(result.pathValidation).toHaveProperty('createDirectoriesIfNotExist');

      expect(result.metadata).toHaveProperty('version');
      expect(result.metadata).toHaveProperty('description');
      expect(result.metadata).toHaveProperty('createdBy');
      expect(result.metadata).toHaveProperty('lastModified');
    });

    it('should handle empty arrays in folder mappings correctly', async () => {
      // Arrange
      const configWithEmptyArrays = {
        ...validConfig,
        folderMappings: {
          backend: [],
          frontend: [],
          agents: [],
          docs: [],
          reports: [],
          plans: []
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(configWithEmptyArrays));

      // Act
      const result = await loadContentWriterConfig(testConfigPath);

      // Assert
      expect(result.folderMappings.backend).toEqual([]);
      expect(getFolderMappings(result, 'backend')).toEqual([]);
      expect(isPathAllowed(result, 'backend/file.ts', 'backend')).toBe(false);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle extremely large configuration files', async () => {
      // Arrange - Create a config with many entries
      const largeConfig = {
        ...validConfig,
        folderMappings: {
          ...validConfig.folderMappings,
          backend: Array(1000).fill('backend/')
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(largeConfig));

      // Act
      const result = await loadContentWriterConfig(testConfigPath);

      // Assert
      expect(result.folderMappings.backend).toHaveLength(1000);
    });

    it('should handle configuration with Unicode characters', async () => {
      // Arrange
      const unicodeConfig = {
        ...validConfig,
        metadata: {
          ...validConfig.metadata,
          description: 'Configuration with émojis 🚀 and 中文字符',
          createdBy: 'тест-юзер'
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(unicodeConfig));

      // Act
      const result = await loadContentWriterConfig(testConfigPath);

      // Assert
      expect(result.metadata.description).toBe('Configuration with émojis 🚀 and 中文字符');
      expect(result.metadata.createdBy).toBe('тест-юзер');
    });

    it('should handle configuration with special characters in paths', async () => {
      // Arrange
      const specialPathsConfig = {
        ...validConfig,
        folderMappings: {
          ...validConfig.folderMappings,
          backend: ['backend/', 'src-files/', '@types/', '#temp/']
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(specialPathsConfig));

      // Act
      const result = await loadContentWriterConfig(testConfigPath);

      // Assert
      expect(result.folderMappings.backend).toContain('@types/');
      expect(result.folderMappings.backend).toContain('#temp/');
      expect(isPathAllowed(result, '@types/index.d.ts', 'backend')).toBe(true);
    });

    it('should handle JSON with extra whitespace and formatting', async () => {
      // Arrange - JSON with lots of whitespace
      const formattedJson = `
        {
          "folderMappings"     :     {
            "backend"  :  ["backend/", "src/"],
            "frontend" :  ["frontend/"],
            "agents"   :  ["agents/"],
            "docs"     :  ["docs/"],
            "reports"  :  ["reports/"],
            "plans"    :  ["plan_and_progress/"]
          },
          "defaultPaths": ${JSON.stringify(validConfig.defaultPaths)},
          "pathValidation": ${JSON.stringify(validConfig.pathValidation)},
          "metadata": ${JSON.stringify(validConfig.metadata)}
        }
      `;
      fs.writeFileSync(testConfigPath, formattedJson);

      // Act
      const result = await loadContentWriterConfig(testConfigPath);

      // Assert
      expect(result.folderMappings.backend).toEqual(['backend/', 'src/']);
    });

    it('should handle relative paths that resolve to the same absolute path', () => {
      // Arrange
      const configWithVariousPaths = {
        ...validConfig,
        folderMappings: {
          ...validConfig.folderMappings,
          backend: ['backend/', './backend/', 'backend/./', './backend/.']
        }
      };

      // Act & Assert
      // All these relative paths should work for files in the backend folder
      expect(isPathAllowed(configWithVariousPaths, 'backend/file.ts', 'backend')).toBe(true);
      expect(isPathAllowed(configWithVariousPaths, './backend/file.ts', 'backend')).toBe(true);
    });
  });

  describe('Type Safety and Interfaces', () => {
    it('should correctly type the returned configuration object', async () => {
      // Arrange
      fs.writeFileSync(testConfigPath, JSON.stringify(validConfig));

      // Act
      const result = await loadContentWriterConfig(testConfigPath);

      // Assert - TypeScript will ensure these properties exist
      const backendMappings: string[] = result.folderMappings.backend;
      const defaultBackend: string = result.defaultPaths.backend;
      const allowTraversal: boolean = result.pathValidation.allowPathTraversal;
      const version: string = result.metadata.version;

      expect(backendMappings).toBeDefined();
      expect(defaultBackend).toBeDefined();
      expect(allowTraversal).toBeDefined();
      expect(version).toBeDefined();
    });

    it('should maintain type safety with utility functions', () => {
      // Act
      const backendMappings: string[] = getFolderMappings(validConfig, 'backend');
      const backendDefault: string = getDefaultPath(validConfig, 'backend');
      const pathAllowed: boolean = isPathAllowed(validConfig, 'backend/file.ts', 'backend');

      // Assert
      expect(Array.isArray(backendMappings)).toBe(true);
      expect(typeof backendDefault).toBe('string');
      expect(typeof pathAllowed).toBe('boolean');
    });
  });

  describe('Real File System Integration', () => {
    it('should handle deeply nested directory structures', async () => {
      // Arrange
      const deepPath = path.join(tempDir, 'deep', 'nested', 'folder', 'structure');
      fs.mkdirSync(deepPath, { recursive: true });
      const deepConfigPath = path.join(deepPath, 'config.json');
      fs.writeFileSync(deepConfigPath, JSON.stringify(validConfig));

      // Act
      const result = await loadContentWriterConfig(deepConfigPath);

      // Assert
      expect(result).toEqual(validConfig);
    });

    it('should resolve symlinked configuration files', async () => {
      // Skip on Windows as symlink behavior differs
      if (process.platform === 'win32') {
        return;
      }

      // Arrange
      fs.writeFileSync(testConfigPath, JSON.stringify(validConfig));
      const symlinkPath = path.join(tempDir, 'config-link.json');

      try {
        fs.symlinkSync(testConfigPath, symlinkPath);
      } catch (err) {
        // Skip if symlinks not supported
        return;
      }

      // Act
      const result = await loadContentWriterConfig(symlinkPath);

      // Assert
      expect(result).toEqual(validConfig);
    });

    it('should handle configuration files with BOM (Byte Order Mark)', async () => {
      // Arrange - Add UTF-8 BOM to the beginning of the file
      const bom = '\ufeff';
      const jsonWithBom = bom + JSON.stringify(validConfig);
      fs.writeFileSync(testConfigPath, jsonWithBom, 'utf-8');

      // Act
      const result = await loadContentWriterConfig(testConfigPath);

      // Assert
      expect(result).toEqual(validConfig);
    });
  });
});