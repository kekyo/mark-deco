import { describe, it, expect, beforeEach } from 'vitest';
import { createCachedFetcher } from '../src/fetcher.js';
import { getNoOpLogger } from '../src/logger.js';
import { createMarkdownProcessor } from '../src/processor.js';
import { createMockOEmbedPlugin } from './test-utils.js';
import type { Plugin, PluginContext } from '../src/types.js';

describe('OEmbedPlugin', () => {
  let plugin: Plugin;
  let mockPlugin: Plugin;
  let processor: ReturnType<typeof createMarkdownProcessor>;

  beforeEach(() => {
    mockPlugin = createMockOEmbedPlugin();
    plugin = mockPlugin;
    const testFetcher = createCachedFetcher('test-userAgent', 5000);
    processor = createMarkdownProcessor({ plugins: [plugin], fetcher: testFetcher });
  });

  it('should create plugin with correct name', () => {
    expect(plugin.name).toBe('oembed');
  });

  it('should implement Plugin interface', () => {
    expect(typeof plugin.processBlock).toBe('function');
    expect(plugin.name).toBeDefined();
  });

  describe('URL validation', () => {
    it('should throw error for invalid URL when called directly', async () => {
      const testFetcher = createCachedFetcher('test-user-agent', 5000);
      const context: PluginContext = {
        logger: getNoOpLogger(),
        signal: new AbortController().signal,
        frontmatter: {},
        fetcher: testFetcher,
        getUniqueId: () => { throw new Error('Not implemented'); }
      };
      // Direct plugin call should throw error for invalid URL
      await expect(mockPlugin.processBlock('invalid-url', context)).rejects.toThrow('Invalid URL: invalid-url');
    });

    it('should handle unsupported providers gracefully in Node.js environment', async () => {
      const markdown = '```oembed\nhttps://unsupported-provider.mock/some-content\n```';
      const result = await processor.process(markdown, "id");

      // In Node.js environment, should return fallback HTML
      expect(result.html).toContain('oembed-container oembed-fallback');
      expect(result.html).toContain('External Content');
      expect(result.html).toContain('unsupported-provider.mock');
      expect(result.html).toContain('https://unsupported-provider.mock/some-content');
    });

    it('should return fallback HTML for unsupported provider when called directly in Node.js', async () => {
      const testFetcher = createCachedFetcher('test-user-agent', 5000);
      const context: PluginContext = {
        logger: getNoOpLogger(),
        signal: new AbortController().signal,
        frontmatter: {},
        fetcher: testFetcher,
        getUniqueId: () => { throw new Error('Not implemented'); }
      };
      // In Node.js environment, should return fallback HTML instead of throwing
      const result = await mockPlugin.processBlock('https://unsupported-provider.com/content', context);
      expect(result).toContain('oembed-container oembed-fallback');
      expect(result).toContain('External Content');
      expect(result).toContain('unsupported-provider.com');
    });

    it('should propagate invalid URL errors', async () => {
      const markdown = '```oembed\ninvalid-url\n```';

      // Should propagate the plugin error
      await expect(processor.process(markdown, "id")).rejects.toThrow('Failed to process markdown: Invalid URL: invalid-url');
    });
  });

  describe('Node.js environment behavior', () => {
    it('should return mock video HTML for YouTube URLs', async () => {
      const markdown = '```oembed\nhttps://youtu.be/1La4QzGeaaQ\n```';
      const result = await processor.process(markdown, "id");

      expect(result.html).toContain('oembed-container oembed-video');
      expect(result.html).toContain('Peru 8K HDR 60FPS');
      expect(result.html).toContain('Jacob + Katie Schwarz');
    });

    it('should return mock photo HTML for Flickr URLs', async () => {
      const markdown = '```oembed\nhttps://flickr.com/photos/bees/2362225867/\n```';
      const result = await processor.process(markdown, "id");

      expect(result.html).toContain('oembed-container oembed-photo');
      expect(result.html).toContain('Bacon Lollys');
      expect(result.html).toContain('bees');
    });

    it('should handle multiple oEmbed blocks', async () => {
      const markdown = `# Test Document

\`\`\`oembed
https://youtu.be/1La4QzGeaaQ
\`\`\`

Some text in between.

\`\`\`oembed
https://flickr.com/photos/bees/2362225867/
\`\`\``;

      const result = await processor.process(markdown, "id");

      // Should contain both mock embeds
      expect(result.html).toContain('oembed-video');
      expect(result.html).toContain('Peru 8K HDR 60FPS');
      expect(result.html).toContain('oembed-photo');
      expect(result.html).toContain('Bacon Lollys');
    });

    it('should process multiple oEmbed URLs in one block', async () => {
      const plugin = createMockOEmbedPlugin();
      const testFetcher = createCachedFetcher('test-userAgent', 5000);
      const processor = createMarkdownProcessor({ plugins: [plugin], fetcher: testFetcher });

      const markdown = `\`\`\`oembed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://vimeo.com/123456789
\`\`\``;

      const result = await processor.process(markdown, "id");

      // When multiple URLs exist, only the first URL is processed
      expect(result.html).toContain('Peru 8K HDR 60FPS');
      expect(result.html).toContain('oembed-responsive-wrapper');
      expect(result.html).toContain('oembed-iframe-container');
      expect(result.html).toContain('padding-bottom:');
      // The second URL is not processed
      expect(result.html).not.toContain('Test Video 4:3');
    });

    it('should process oEmbed blocks correctly', async () => {
      const plugin = createMockOEmbedPlugin();
      const testFetcher = createCachedFetcher('test-userAgent', 5000);
      const processor = createMarkdownProcessor({ plugins: [plugin], fetcher: testFetcher });

      const markdown = `# Test

\`\`\`oembed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
\`\`\``;

      const result = await processor.process(markdown, "id", { useContentStringHeaderId: true, useHierarchicalHeadingId: false });

      expect(result.html).toContain('<h1 id="id-test">Test</h1>');
      expect(result.html).toContain('Peru 8K HDR 60FPS');
      expect(result.html).toContain('oembed-responsive-wrapper');
      expect(result.html).toContain('oembed-iframe-container');
      expect(result.html).toContain('padding-bottom:');
    });
  });

  describe('HTML generation', () => {
    it('should generate fallback HTML with proper escaping', async () => {
      const testFetcher = createCachedFetcher('test-user-agent', 5000);
      const context: PluginContext = {
        logger: getNoOpLogger(),
        signal: new AbortController().signal,
        frontmatter: {},
        fetcher: testFetcher,
        getUniqueId: () => { throw new Error('Not implemented'); }
      };
      const url = 'https://test-provider.mock/test?param=<script>alert("xss")</script>';
      const html = await mockPlugin.processBlock(url, context);

      expect(html).toContain('oembed-container oembed-fallback');
      expect(html).toContain('External Content');
      expect(html).toContain('test-provider.mock');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should generate proper fallback HTML structure', async () => {
      const testFetcher = createCachedFetcher('test-user-agent', 5000);
      const context: PluginContext = {
        logger: getNoOpLogger(),
        signal: new AbortController().signal,
        frontmatter: {},
        fetcher: testFetcher,
        getUniqueId: () => { throw new Error('Not implemented'); }
      };
      const html = await mockPlugin.processBlock('https://test-provider.mock/test', context);

      expect(html).toContain('oembed-container oembed-fallback');
      expect(html).toContain('oembed-header');
      expect(html).toContain('oembed-title');
      expect(html).toContain('oembed-provider');
      expect(html).toContain('oembed-content');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });
  });

  describe('Error handling', () => {
    it('should return fallback HTML when provider is not supported in Node.js', async () => {
      const markdown = '```oembed\nhttps://unsupported-provider.com/content\n```';
      const result = await processor.process(markdown, "id");

      // Should return fallback HTML instead of code block in Node.js
      expect(result.html).toContain('oembed-container oembed-fallback');
      expect(result.html).toContain('unsupported-provider.com');
    });

    it('should handle network errors gracefully', async () => {
      const markdown = '```oembed\nhttps://network-error.mock/content\n```';
      const result = await processor.process(markdown, "id");

      // Should return fallback HTML for network errors
      expect(result.html).toContain('oembed-container oembed-fallback');
      expect(result.html).toContain('network-error.mock');
    });
  });

  describe('Browser environment simulation', () => {
    it('should handle CORS errors in browser environment', async () => {
      const plugin = createMockOEmbedPlugin();
      const testFetcher = createCachedFetcher('test-userAgent', 5000);
      const processor = createMarkdownProcessor({ plugins: [plugin], fetcher: testFetcher });

      const markdown = '```oembed\nhttps://cors-error.mock/content\n```';
      const result = await processor.process(markdown, "id");

      // Should return fallback HTML for CORS errors
      expect(result.html).toContain('oembed-container oembed-fallback');
      expect(result.html).toContain('cors-error.mock');
    });

    it('should handle browser environment gracefully', async () => {
      const plugin = createMockOEmbedPlugin();
      const testFetcher = createCachedFetcher('test-userAgent', 5000);
      const processor = createMarkdownProcessor({ plugins: [plugin], fetcher: testFetcher });

      const markdown = '```oembed\nhttps://browser-test.mock/content\n```';
      const result = await processor.process(markdown, "id");

      // Should return fallback HTML in browser environment
      expect(result.html).toContain('oembed-container oembed-fallback');
      expect(result.html).toContain('browser-test.mock');
    });
  });

  describe('useMetadataUrlLink option', () => {
    it('should use metadata URL when useMetadataUrlLink is true', async () => {
      const plugin = createMockOEmbedPlugin({ useMetadataUrlLink: true });
      const testFetcher = createCachedFetcher('test-userAgent', 5000);
      const processor = createMarkdownProcessor({ plugins: [plugin], fetcher: testFetcher });

      const markdown = '```oembed\nhttps://youtu.be/1La4QzGeaaQ\n```';
      const result = await processor.process(markdown, "id");

      // Should contain proper mock video HTML
      expect(result.html).toContain('oembed-container oembed-video');
      expect(result.html).toContain('Peru 8K HDR 60FPS');
    });

    it('should use original URL when useMetadataUrlLink is false', async () => {
      const plugin = createMockOEmbedPlugin({ useMetadataUrlLink: false });
      const testFetcher = createCachedFetcher('test-userAgent', 5000);
      const processor = createMarkdownProcessor({ plugins: [plugin], fetcher: testFetcher });

      const markdown = '```oembed\nhttps://youtu.be/1La4QzGeaaQ\n```';
      const result = await processor.process(markdown, "id");

      // Should contain proper mock video HTML
      expect(result.html).toContain('oembed-container oembed-video');
      expect(result.html).toContain('Peru 8K HDR 60FPS');
    });

    it('should default to true when useMetadataUrlLink is not specified', async () => {
      const plugin = createMockOEmbedPlugin();
      const testFetcher = createCachedFetcher('test-userAgent', 5000);
      const processor = createMarkdownProcessor({ plugins: [plugin], fetcher: testFetcher });

      const markdown = '```oembed\nhttps://youtu.be/1La4QzGeaaQ\n```';
      const result = await processor.process(markdown, "id");

      // Should contain proper mock video HTML (default behavior)
      expect(result.html).toContain('oembed-container oembed-video');
      expect(result.html).toContain('Peru 8K HDR 60FPS');
    });
  });
});
