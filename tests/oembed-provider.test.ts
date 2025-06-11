import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMemoryCacheStorage } from '../src/cache/index.js';
import { getConsoleLogger } from '../src/logger.js';
import { createOEmbedPlugin } from '../src/plugins/oembed-plugin.js';
import { createMarkdownProcessor } from '../src/processor.js';
import { createCachedFetcher } from '../src/utils.js';

describe('OEmbed Provider Tests', () => {
  let processor: ReturnType<typeof createMarkdownProcessor>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;

    // Create test providers with mock domains
    const customProviders = [
      {
        provider_name: 'MockTube',
        provider_url: 'https://test-tube.mock/',
        endpoints: [
          {
            schemes: [
              'https://test-tube.mock/watch*',
              'https://test-tube.mock/v/*',
              'https://short-tube.mock/*'
            ],
            url: 'https://test-tube.mock/oembed',
            discovery: true
          }
        ]
      },
      {
        provider_name: 'MockPhoto',
        provider_url: 'https://test-photo.mock/',
        endpoints: [
          {
            schemes: [
              'https://test-photo.mock/photos/*'
            ],
            url: 'https://test-photo.mock/oembed',
            discovery: true
          }
        ]
      }
    ];

    // Mock fetch to return test data
    const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();
    mockFetch.mockImplementation(async (url: string | URL | Request) => {
      const urlString = url.toString();

      // MockTube oEmbed API mock
      if (urlString.includes('test-tube.mock/oembed')) {
        const params = new URLSearchParams(urlString.split('?')[1]);
        const videoUrl = params.get('url') || '';

        if (videoUrl.includes('video1')) {
          return new Response(JSON.stringify({
            type: 'video',
            version: '1.0',
            title: 'Test Video 1 - HD Sample',
            author_name: 'Test Author',
            author_url: 'https://test-tube.mock/@testauthor',
            provider_name: 'MockTube',
            provider_url: 'https://test-tube.mock/',
            thumbnail_url: 'https://test-tube.mock/thumbs/video1.jpg',
            thumbnail_width: 480,
            thumbnail_height: 360,
            html: '<iframe width="560" height="315" src="https://test-tube.mock/embed/video1" frameborder="0" allowfullscreen title="Test Video 1 - HD Sample"></iframe>',
            width: 560,
            height: 315
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        } else if (videoUrl.includes('video2')) {
          return new Response(JSON.stringify({
            type: 'video',
            version: '1.0',
            title: 'Test Video 2 - 4:3 Aspect Ratio',
            author_name: 'Test Creator',
            author_url: 'https://test-tube.mock/@testcreator',
            provider_name: 'MockTube',
            provider_url: 'https://test-tube.mock/',
            thumbnail_url: 'https://test-tube.mock/thumbs/video2.jpg',
            thumbnail_width: 480,
            thumbnail_height: 360,
            html: '<iframe width="400" height="300" src="https://test-tube.mock/embed/video2" frameborder="0" allowfullscreen title="Test Video 2 - 4:3 Aspect Ratio"></iframe>',
            width: 400,
            height: 300
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
      }

      // MockPhoto oEmbed API mock
      if (urlString.includes('test-photo.mock/oembed')) {
        return new Response(JSON.stringify({
          type: 'photo',
          title: 'Test Photo Sample',
          author_name: 'Test Photographer',
          author_url: 'https://test-photo.mock/users/testphotographer',
          width: 1024,
          height: 768,
          url: 'https://test-photo.mock/images/sample.jpg',
          web_page: 'https://test-photo.mock/photos/sample123',
          thumbnail_url: 'https://test-photo.mock/thumbs/sample.jpg',
          thumbnail_width: 150,
          thumbnail_height: 150,
          version: '1.0',
          cache_age: 3600,
          provider_name: 'MockPhoto',
          provider_url: 'https://test-photo.mock/',
          html: '<a href="https://test-photo.mock/photos/sample123" title="Test Photo Sample"><img src="https://test-photo.mock/images/sample.jpg" width="1024" height="768" alt="Test Photo Sample"></a>'
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }

      // Mock unsupported provider (no oEmbed endpoint available)
      if (urlString.includes('unsupported-provider.mock')) {
        throw new Error(`No oEmbed provider found for URL: ${urlString}`);
      }

      // Handle redirect resolution for test URLs
      if (urlString.includes('short-tube.mock/video1') || urlString.includes('test-tube.mock/watch?v=video1')) {
        return new Response('', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        });
      }
      if (urlString.includes('short-tube.mock/video2')) {
        return new Response('', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        });
      }
      if (urlString.includes('test-photo.mock/photos/sample123')) {
        return new Response('', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        });
      }
      // Handle nonexistent URLs for timeout testing
      if (urlString.includes('short-tube.mock/nonexistent123')) {
        return new Response('Not Found', {
          status: 404,
          statusText: 'Not Found'
        });
      }

      // For test-tube.mock or test-photo.mock URLs that don't match any video/photo, return 404
      if (urlString.includes('test-tube.mock') || urlString.includes('test-photo.mock')) {
        return new Response('Not Found', {
          status: 404,
          statusText: 'Not Found'
        });
      }

      // For other URLs, throw an error to ensure no external requests
      throw new Error(`Unexpected fetch call to: ${urlString}`);
    });

    global.fetch = mockFetch;

    // Create cached fetcher for testing
    const cacheStorage = createMemoryCacheStorage();
    const cachedFetcher = createCachedFetcher(
      'test-oembed-provider/1.0',
      15000, // 15 second timeout
      cacheStorage,
      {
        cache: true,
        cacheTTL: 60 * 60 * 1000 // 1 hour cache
      }
    );

    // Use oEmbed plugin with custom providers
    const oembedPlugin = createOEmbedPlugin(customProviders);

    processor = createMarkdownProcessor({
      plugins: [oembedPlugin],
      logger: getConsoleLogger(),
      fetcher: cachedFetcher
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('MockTube oEmbed Provider', () => {
    it('should fetch mock oEmbed data for test video 1', async () => {
      const markdown = `\`\`\`oembed
https://short-tube.mock/video1
\`\`\``;

      const result = await processor.process(markdown, "id", { useContentStringHeaderId: true, useHierarchicalHeadingId: false });

      // Verify that mock oEmbed data can be retrieved
      expect(result.html).toContain('oembed-container');
      expect(result.html).toContain('oembed-video');

      // Verify it's not a fallback
      expect(result.html).not.toContain('oembed-fallback');

      // Verify MockTube iframe is included
      expect(result.html).toContain('test-tube.mock/embed');
      expect(result.html).toContain('video1');
    }, 5000);

    it('should fetch mock oEmbed data for test video (regular URL)', async () => {
      const markdown = `\`\`\`oembed
https://test-tube.mock/watch?v=video1
\`\`\``;

      const result = await processor.process(markdown, "id", { useContentStringHeaderId: true, useHierarchicalHeadingId: false });

      // Verify that mock oEmbed data can be retrieved
      expect(result.html).toContain('oembed-container');
      expect(result.html).toContain('oembed-video');

      // Verify it's not a fallback
      expect(result.html).not.toContain('oembed-fallback');

      // Verify MockTube iframe is included
      expect(result.html).toContain('test-tube.mock/embed');
      expect(result.html).toContain('video1');
    }, 5000);

    it('should fetch mock oEmbed data for 4:3 aspect ratio video', async () => {
      const markdown = `\`\`\`oembed
https://short-tube.mock/video2
\`\`\``;

      const result = await processor.process(markdown, "id", { useContentStringHeaderId: true, useHierarchicalHeadingId: false });

      // Verify that mock oEmbed data can be retrieved
      expect(result.html).toContain('oembed-container');
      expect(result.html).toContain('oembed-video');

      // Verify it's not a fallback
      expect(result.html).not.toContain('oembed-fallback');

      // Verify MockTube iframe is included
      expect(result.html).toContain('test-tube.mock/embed');
      expect(result.html).toContain('video2');
    }, 5000);
  });

  describe('MockPhoto oEmbed Provider', () => {
    it('should fetch mock oEmbed data for test photo', async () => {
      const markdown = `\`\`\`oembed
https://test-photo.mock/photos/sample123
\`\`\``;

      const result = await processor.process(markdown, "id", { useContentStringHeaderId: true, useHierarchicalHeadingId: false });

      // Verify that MockPhoto provider matches correctly
      expect(result.html).toContain('oembed-container');
      expect(result.html).toContain('oembed-photo');

      // Verify it's not a fallback
      expect(result.html).not.toContain('oembed-fallback');

      // Verify MockPhoto content is included
      expect(result.html).toContain('test-photo.mock');
      expect(result.html).toContain('sample123');
    }, 5000);
  });

  describe('Unsupported Provider', () => {
    it('should return fallback HTML for unsupported provider', async () => {
      const markdown = `\`\`\`oembed
https://unsupported-provider.mock/some-content
\`\`\``;

      const result = await processor.process(markdown, "id", { useContentStringHeaderId: true, useHierarchicalHeadingId: false });

      // Verify that fallback HTML is returned for unsupported providers
      expect(result.html).toContain('oembed-container');
      expect(result.html).toContain('oembed-fallback');
      expect(result.html).toContain('External Content');
      expect(result.html).toContain('unsupported-provider.mock');
      expect(result.html).toContain('some-content');
    }, 5000); // Reduced timeout since we're mocking the network call
  });

  describe('Multiple oEmbed URLs from demo.js sample', () => {
    it('should process multiple oEmbed URLs from demo markdown sample', async () => {
      // Extract oEmbed parts from demo.js sample
      const sampleMarkdown = `---
title: Sample Article
author: Test User
date: 2024-01-01
tags: [markdown, test]
description: Test page for MarkDeco
---

# Sample Article

This is a test page for **MarkDeco**.

### MockTube Video (Short URL)

\`\`\`oembed
https://short-tube.mock/video1
\`\`\`

## MockTube Video (Regular URL)

\`\`\`oembed
https://test-tube.mock/watch?v=video1
\`\`\`

### 4:3 Aspect Ratio Test

\`\`\`oembed
https://short-tube.mock/video2
\`\`\`

### MockPhoto 

\`\`\`oembed
https://test-photo.mock/photos/sample123
\`\`\`

### Unsupported Provider (Fallback Display)

\`\`\`oembed
https://unsupported-provider.mock/some-content
\`\`\``;

      const result = await processor.process(sampleMarkdown, "id", { useContentStringHeaderId: true, useHierarchicalHeadingId: false });

      // Verify that frontmatter is parsed correctly
      expect(Object.keys(result.frontmatter)).toContain('title');
      expect(result.frontmatter.title).toBe('Sample Article');

      // Verify that HTML is generated (with content-based IDs)
      expect(result.html).toContain('<h1 id="id-sample-article">Sample Article</h1>');

      // Verify that MockTube URLs are processed
      const mocktubeEmbeds = (result.html.match(/test-tube\.mock\/embed/g) || []).length;
      expect(mocktubeEmbeds).toBeGreaterThanOrEqual(2); // At least 2 MockTube videos

      // Verify that MockPhoto URL is processed
      expect(result.html).toContain('test-photo.mock');
      expect(result.html).toContain('sample123');

      // Verify that unsupported provider fallback is included
      expect(result.html).toContain('External Content');
      expect(result.html).toContain('unsupported-provider.mock');

      // Verify that multiple oembed-containers are included
      const oembedContainers = (result.html.match(/oembed-container/g) || []).length;
      expect(oembedContainers).toBeGreaterThanOrEqual(5); // 5 oEmbed blocks
    }, 5000); // Reduced timeout since we're mocking the network call
  });

  describe('Network error handling', () => {
    it('should handle network timeout gracefully', async () => {
      // Test for when timeout occurs by using a video ID not handled by mock
      const markdown = `\`\`\`oembed
https://short-tube.mock/nonexistent123
\`\`\``;

      const result = await processor.process(markdown, "id", { useContentStringHeaderId: true, useHierarchicalHeadingId: false });

      // For network errors or 404, verify that fallback HTML is returned
      expect(result.html).toContain('oembed-container');

      // Error cases should display fallback
      expect(result.html).toContain('oembed-fallback');
    }, 5000);
  });
});
