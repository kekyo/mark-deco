import { mkdir, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createMarkdownProcessor, createCachedFetcher } from 'mark-deco';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Markdown Processor', () => {
  const testOutputDir = path.join(__dirname, '../test-output');

  beforeEach(async () => {
    await mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should process basic markdown file', async () => {
    const processor = createMarkdownProcessor({
      plugins: [],
      fetcher: createCachedFetcher('test-userAgent', 10000),
    });

    const markdown = `---
title: "Test Document"
author: "Test Author"
---

# Main Title

This is a test document.

# Another Title

More content here.`;

    const result = await processor.process(markdown, 'id', {
      useContentStringHeaderId: true,
      headerTitleTransform: 'none',
    });

    expect(result.frontmatter).toEqual({
      title: 'Test Document',
      author: 'Test Author',
    });

    expect(result.headingTree).toHaveLength(2);
    expect(result.headingTree[0]?.text).toBe('Main Title');
    expect(result.headingTree[1]?.text).toBe('Another Title');

    expect(result.html).toContain('<h1 id="id-main-title">Main Title</h1>');
    expect(result.html).toContain(
      '<h1 id="id-another-title">Another Title</h1>'
    );
    expect(result.html).toContain('<p>This is a test document.</p>');
  });

  it('should process markdown with no frontmatter', async () => {
    const processor = createMarkdownProcessor({
      plugins: [],
      fetcher: createCachedFetcher('test-userAgent', 10000),
    });

    const markdown = `# Simple Title

Just some content.`;

    const result = await processor.process(markdown, 'id', {
      useContentStringHeaderId: true,
      headerTitleTransform: 'none',
    });

    expect(result.frontmatter).toEqual({});
    expect(result.headingTree).toHaveLength(1);
    expect(result.headingTree[0]?.text).toBe('Simple Title');
    expect(result.html).toContain('<h1 id="id-simple-title">Simple Title</h1>');
  });

  it('should handle empty markdown', async () => {
    const processor = createMarkdownProcessor({
      plugins: [],
      fetcher: createCachedFetcher('test-userAgent', 10000),
    });

    const markdown = '';

    const result = await processor.process(markdown, 'id', {
      headerTitleTransform: 'none',
    });

    expect(result.frontmatter).toEqual({});
    expect(result.headingTree).toEqual([]);
    expect(result.html).toBe('');
  });

  it('should handle markdown with only frontmatter', async () => {
    const processor = createMarkdownProcessor({
      plugins: [],
      fetcher: createCachedFetcher('test-userAgent', 10000),
    });

    const markdown = `---
title: "Only Frontmatter"
tags: ["test"]
---`;

    const result = await processor.process(markdown, 'id', {
      headerTitleTransform: 'none',
    });

    expect(result.frontmatter).toEqual({
      title: 'Only Frontmatter',
      tags: ['test'],
    });
    expect(result.headingTree).toEqual([]);
    expect(result.html).toBe('');
  });

  it('should process markdown with multiple h1 elements', async () => {
    const processor = createMarkdownProcessor({
      plugins: [],
      fetcher: createCachedFetcher('test-userAgent', 10000),
    });

    const markdown = `# First Title

Content 1

# Second Title

Content 2

# Third Title

Content 3`;

    const result = await processor.process(markdown, 'id', {
      useContentStringHeaderId: true,
      headerTitleTransform: 'none',
    });

    expect(result.headingTree).toHaveLength(3);
    expect(result.headingTree[0]?.text).toBe('First Title');
    expect(result.headingTree[1]?.text).toBe('Second Title');
    expect(result.headingTree[2]?.text).toBe('Third Title');

    expect(result.html).toContain('<h1 id="id-first-title">First Title</h1>');
    expect(result.html).toContain('<h1 id="id-second-title">Second Title</h1>');
    expect(result.html).toContain('<h1 id="id-third-title">Third Title</h1>');
  });

  it('should handle complex frontmatter', async () => {
    const processor = createMarkdownProcessor({
      plugins: [],
      fetcher: createCachedFetcher('test-userAgent', 10000),
    });

    const markdown = `---
title: "Complex Test"
date: 2024-01-01
tags:
  - markdown
  - test
  - processor
nested:
  key1: value1
  key2: value2
boolean: true
number: 42
---

# Test Content

This is test content.`;

    const result = await processor.process(markdown, 'id', {
      headerTitleTransform: 'none',
    });

    expect(result.frontmatter).toEqual({
      title: 'Complex Test',
      date: '2024-01-01',
      tags: ['markdown', 'test', 'processor'],
      nested: {
        key1: 'value1',
        key2: 'value2',
      },
      boolean: true,
      number: 42,
    });

    expect(result.headingTree).toHaveLength(1);
    expect(result.headingTree[0]?.text).toBe('Test Content');
  });

  describe('headerTitleTransform behaviour', () => {
    it('applies leading base-level heading to frontmatter and removes heading', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = `# Node Title

Body content.`;

      const result = await processor.process(markdown, 'id');

      expect(result.frontmatter).toEqual({ title: 'Node Title' });
      expect(result.html).not.toContain('<h1');
      expect(result.headingTree).toHaveLength(0);
    });

    it('keeps existing frontmatter title while removing heading', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = `---
title: Existing Node Title
---

# Display Title

Rest of content.`;

      const result = await processor.process(markdown, 'id');

      expect(result.frontmatter).toEqual({ title: 'Existing Node Title' });
      expect(result.html).not.toContain('<h1');
    });

    it('extract keeps heading while applying title', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = `# Visible Title

Still here.`;

      const result = await processor.process(markdown, 'id', {
        headerTitleTransform: 'extract',
      });

      expect(result.frontmatter).toEqual({ title: 'Visible Title' });
      expect(result.html).toContain('<h1');
      expect(result.html).toContain('Visible Title');
      expect(result.headingTree).toHaveLength(1);
    });

    it('supports disabling the behaviour via options', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = `# Keep Heading

More text.`;

      const result = await processor.process(markdown, 'id', {
        headerTitleTransform: 'none',
        useContentStringHeaderId: true,
      });

      expect(result.frontmatter).toEqual({});
      expect(result.html).toContain(
        '<h1 id="id-keep-heading">Keep Heading</h1>'
      );
      expect(result.headingTree).toHaveLength(1);
    });
  });

  describe('headingBaseLevel', () => {
    it('offsets heading levels in output and headingTree', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = `# Title

## Sub

### Detail`;

      const result = await processor.process(markdown, 'id', {
        headerTitleTransform: 'none',
        headingBaseLevel: 2,
      });

      expect(result.html).toContain('<h2 id="id-1">Title</h2>');
      expect(result.html).toContain('<h3 id="id-1-1">Sub</h3>');
      expect(result.html).toContain('<h4 id="id-1-1-1">Detail</h4>');
      expect(result.headingTree[0]?.level).toBe(2);
      expect(result.headingTree[0]?.children[0]?.level).toBe(3);
      expect(result.headingTree[0]?.children[0]?.children[0]?.level).toBe(4);
    });

    it('clamps heading levels at h6', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = `# Top

### Deep

#### Deeper`;

      const result = await processor.process(markdown, 'id', {
        headerTitleTransform: 'none',
        headingBaseLevel: 5,
      });

      expect(result.html).toContain('<h5 id="id-1">Top</h5>');
      expect(result.html).toContain('<h6 id="id-1-1">Deep</h6>');
      expect(result.html).toContain('<h6 id="id-1-2">Deeper</h6>');
      expect(result.headingTree[0]?.level).toBe(5);
      expect(result.headingTree[0]?.children[0]?.level).toBe(6);
    });

    it('extracts title from base-level heading', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = `# Visible Title

Body text.`;

      const result = await processor.process(markdown, 'id', {
        headerTitleTransform: 'extract',
        headingBaseLevel: 2,
      });

      expect(result.frontmatter).toEqual({ title: 'Visible Title' });
      expect(result.html).toContain('<h2 id="id-1">Visible Title</h2>');
      expect(result.headingTree[0]?.level).toBe(2);
    });
  });

  describe('processWithFrontmatterTransform', () => {
    it('should return undefined when transform cancels processing', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = '# Heading\n\nBody';

      const result = await processor.processWithFrontmatterTransform(
        markdown,
        'id',
        {
          preTransform: async () => undefined,
        }
      );

      expect(result).toBeUndefined();
    });

    it('should treat returning original frontmatter reference as unchanged', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = `---
title: "Same"
---

# Heading`;

      let receivedPrefix: string | undefined;

      const result = await processor.processWithFrontmatterTransform(
        markdown,
        'id',
        {
          preTransform: async ({ originalFrontmatter, uniqueIdPrefix }) => {
            receivedPrefix = uniqueIdPrefix;
            return {
              frontmatter: originalFrontmatter,
              uniqueIdPrefix: 'id',
              headerTitleTransform: 'none',
            };
          },
          useContentStringHeaderId: true,
        }
      );

      expect(result).not.toBeUndefined();
      expect(result?.changed).toBe(false);
      expect(result?.html).toContain('<h1 id="id-heading">Heading</h1>');
      expect(result?.composeMarkdown()).toBe(markdown);
      expect(receivedPrefix).toBe('id');
      expect(result?.uniqueIdPrefix).toBe('id');
    });

    it('should apply changes when transform returns modified frontmatter', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = `---
title: "Original"
---

# Heading`;

      let receivedPrefix: string | undefined;

      const result = await processor.processWithFrontmatterTransform(
        markdown,
        'id',
        {
          preTransform: async ({ originalFrontmatter, uniqueIdPrefix }) => {
            receivedPrefix = uniqueIdPrefix;
            return {
              frontmatter: {
                ...originalFrontmatter,
                category: 'news',
              },
              uniqueIdPrefix: 'id',
              headerTitleTransform: 'none',
            };
          },
        }
      );

      expect(result).not.toBeUndefined();
      expect(result?.changed).toBe(true);
      expect(result?.frontmatter).toEqual({
        title: 'Original',
        category: 'news',
      });
      expect(result?.composeMarkdown()).toBe(`---
title: Original
category: news
---

# Heading`);
      expect(receivedPrefix).toBe('id');
      expect(result?.uniqueIdPrefix).toBe('id');
    });

    it('should allow transform to override uniqueIdPrefix', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = '# Heading';

      let receivedPrefix: string | undefined;

      const result = await processor.processWithFrontmatterTransform(
        markdown,
        'id',
        {
          preTransform: async ({ originalFrontmatter, uniqueIdPrefix }) => {
            receivedPrefix = uniqueIdPrefix;
            return {
              frontmatter: originalFrontmatter,
              uniqueIdPrefix: 'custom',
              headerTitleTransform: 'none',
            };
          },
          useContentStringHeaderId: true,
        }
      );

      expect(result).not.toBeUndefined();
      expect(result?.headingTree[0]?.id.startsWith('custom-')).toBe(true);
      expect(receivedPrefix).toBe('id');
      expect(result?.uniqueIdPrefix).toBe('custom');
    });

    it('should allow post transform to annotate frontmatter', async () => {
      const processor = createMarkdownProcessor({
        plugins: [],
        fetcher: createCachedFetcher('test-userAgent', 10000),
      });

      const markdown = '# Heading';

      const result = await processor.processWithFrontmatterTransform(
        markdown,
        'id',
        {
          preTransform: async ({ originalFrontmatter, uniqueIdPrefix }) => ({
            frontmatter: originalFrontmatter,
            uniqueIdPrefix,
            headerTitleTransform: 'none',
          }),
          postTransform: async ({ frontmatter, headingTree }) => ({
            ...frontmatter,
            summary: `headings:${headingTree.length}`,
          }),
        }
      );

      expect(result).not.toBeUndefined();
      expect(result?.frontmatter).toEqual({ summary: 'headings:1' });
      expect(result?.changed).toBe(true);
    });
  });
});
