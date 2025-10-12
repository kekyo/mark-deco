// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { describe, it, expect, beforeEach } from 'vitest';
import { getNoOpLogger } from '../src/logger.js';
import { createMockPlugin } from './test-utils.js';
import type { Plugin, PluginContext } from '../src/types.js';

describe('MockPlugin', () => {
  let plugin: Plugin;

  beforeEach(() => {
    plugin = createMockPlugin('test-plugin');
  });

  it('should create mock plugin with default values', () => {
    const plugin = createMockPlugin('test');
    expect(plugin.name).toBe('test');
  });

  it('should create mock plugin with custom values', () => {
    const plugin = createMockPlugin('custom');

    expect(plugin.name).toBe('custom');
  });

  it('should process block content correctly', async () => {
    const mockContext: PluginContext = {
      logger: getNoOpLogger(),
      signal: new AbortController().signal,
      frontmatter: {},
      fetcher: {
        rawFetcher: async () => {
          throw new Error('Not implemented');
        },
        userAgent: 'test-user-agent',
      },
      getUniqueId: () => {
        throw new Error('Not implemented');
      },
    };
    const result = await plugin.processBlock('test content', mockContext);
    expect(result).toContain('Mock plugin processed: test content');
    expect(result).toContain('data-plugin="test-plugin"');
  });

  it('should handle empty content', async () => {
    const mockContext: PluginContext = {
      logger: getNoOpLogger(),
      signal: new AbortController().signal,
      frontmatter: {},
      fetcher: {
        rawFetcher: async () => {
          throw new Error('Not implemented');
        },
        userAgent: 'test-user-agent',
      },
      getUniqueId: () => {
        throw new Error('Not implemented');
      },
    };
    const result = await plugin.processBlock('', mockContext);
    expect(result).toContain('Mock plugin processed: ');
  });

  it('should handle special characters in content', async () => {
    const mockContext: PluginContext = {
      logger: getNoOpLogger(),
      signal: new AbortController().signal,
      frontmatter: {},
      fetcher: {
        rawFetcher: async () => {
          throw new Error('Not implemented');
        },
        userAgent: 'test-user-agent',
      },
      getUniqueId: () => {
        throw new Error('Not implemented');
      },
    };
    const content = '<script>alert("xss")</script>';
    const result = await plugin.processBlock(content, mockContext);
    expect(result).toContain(
      'Mock plugin processed: <script>alert("xss")</script>'
    );
  });

  it('should implement Plugin interface correctly', () => {
    const plugin: Plugin = createMockPlugin('interface-test');
    expect(plugin.name).toBe('interface-test');
    expect(typeof plugin.processBlock).toBe('function');
  });

  describe('Custom Plugin Implementation', () => {
    const createTestPlugin = (): Plugin => {
      const processBlock = async (content: string): Promise<string> => {
        return `<div class="test-output">${content.toUpperCase()}</div>`;
      };

      return {
        name: 'test-plugin',
        processBlock,
      };
    };

    it('should create custom plugin with specified properties', () => {
      const plugin = createTestPlugin();

      expect(plugin.name).toBe('test-plugin');
    });

    it('should process content with custom logic', async () => {
      const plugin = createTestPlugin();
      const mockContext: PluginContext = {
        logger: getNoOpLogger(),
        signal: new AbortController().signal,
        frontmatter: {},
        fetcher: {
          rawFetcher: async () => {
            throw new Error('Not implemented');
          },
          userAgent: 'test-user-agent',
        },
        getUniqueId: () => {
          throw new Error('Not implemented');
        },
      };
      const result = await plugin.processBlock('hello world', mockContext);

      expect(result).toBe('<div class="test-output">HELLO WORLD</div>');
    });
  });

  it('should handle basic mock plugin functionality', async () => {
    const mockPlugin: Plugin = {
      name: 'mock-test',
      processBlock: async (content: string, context: PluginContext) => {
        return `<div class="mock-plugin">${content}</div>`;
      },
    };

    const mockContext: PluginContext = {
      logger: getNoOpLogger(),
      signal: new AbortController().signal,
      frontmatter: {},
      fetcher: {
        rawFetcher: async () => {
          throw new Error('Not implemented');
        },
        userAgent: 'test-user-agent',
      },
      getUniqueId: () => 'mock-id-1',
    };

    const result = await mockPlugin.processBlock('test content', mockContext);
    expect(result).toBe('<div class="mock-plugin">test content</div>');
  });

  it('should handle mock plugin with context properties', async () => {
    const mockContext: PluginContext = {
      logger: getNoOpLogger(),
      signal: new AbortController().signal,
      frontmatter: {},
      fetcher: {
        rawFetcher: async () => {
          throw new Error('Not implemented');
        },
        userAgent: 'test-user-agent',
      },
      getUniqueId: () => 'mock-id-2',
    };

    expect(mockContext.logger).toBeDefined();
    expect(mockContext.signal).toBeDefined();
    expect(mockContext.frontmatter).toBeDefined();
    expect(mockContext.fetcher).toBeDefined();
    expect(mockContext.getUniqueId).toBeDefined();
    expect(mockContext.getUniqueId()).toBe('mock-id-2');
  });

  it('should handle mock plugin with frontmatter data', async () => {
    const mockContext: PluginContext = {
      logger: getNoOpLogger(),
      signal: new AbortController().signal,
      frontmatter: {},
      fetcher: {
        rawFetcher: async () => {
          throw new Error('Not implemented');
        },
        userAgent: 'test-user-agent',
      },
      getUniqueId: () => 'mock-id-3',
    };

    const mockPlugin: Plugin = {
      name: 'mock-frontmatter',
      processBlock: async (content: string, context: PluginContext) => {
        const frontmatterKeys = Object.keys(context.frontmatter).length;
        return `<div class="mock-plugin" data-frontmatter-keys="${frontmatterKeys}">${content}</div>`;
      },
    };

    const result = await mockPlugin.processBlock(
      'test with frontmatter',
      mockContext
    );
    expect(result).toContain('data-frontmatter-keys="0"');
    expect(result).toContain('test with frontmatter');
  });

  describe('Advanced mock functionality', () => {
    it('should handle mock plugin with complex context usage', async () => {
      const mockPlugin: Plugin = {
        name: 'complex-mock',
        processBlock: async (content: string, context: PluginContext) => {
          const uniqueId = context.getUniqueId();
          const hasSignal = context.signal !== undefined;
          const userAgent = context.fetcher.userAgent;

          return `<div class="complex-mock" id="${uniqueId}" data-has-signal="${hasSignal}" data-user-agent="${userAgent}">${content}</div>`;
        },
      };

      const mockContext: PluginContext = {
        logger: getNoOpLogger(),
        signal: new AbortController().signal,
        frontmatter: {},
        fetcher: {
          rawFetcher: async () => {
            throw new Error('Not implemented');
          },
          userAgent: 'test-user-agent',
        },
        getUniqueId: () => 'complex-mock-id',
      };

      const result = await mockPlugin.processBlock('complex test', mockContext);
      expect(result).toContain('id="complex-mock-id"');
      expect(result).toContain('data-has-signal="true"');
      expect(result).toContain('data-user-agent="test-user-agent"');
      expect(result).toContain('complex test');
    });
  });
});
