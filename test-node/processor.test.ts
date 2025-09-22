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

    const result = await processor.process(markdown, 'id');

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

    const result = await processor.process(markdown, 'id');

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

    const result = await processor.process(markdown, 'id');

    expect(result.frontmatter).toEqual({
      title: 'Complex Test',
      date: new Date('2024-01-01T00:00:00.000Z'),
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
});
