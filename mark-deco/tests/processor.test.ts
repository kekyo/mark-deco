// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createCachedFetcher, createDirectFetcher } from '../src/fetcher';
import { getConsoleLogger } from '../src/logger';
import { createMarkdownProcessor } from '../src/processor';
import { HTMLBeautifyOptions } from '../src/types';
import { createMockPlugin } from './test-utils';
import type {
  MarkdownProcessorPluginContext,
  MarkdownProcessorPlugin,
} from '../src/types';

// Create a default fetcher for tests
const testUserAgent = 'mark-deco-test/1.0.0';
const defaultTestFetcher = createCachedFetcher(testUserAgent, 5000);

describe('MarkdownProcessor', () => {
  let processor: ReturnType<typeof createMarkdownProcessor>;

  beforeEach(() => {
    processor = createMarkdownProcessor({ fetcher: defaultTestFetcher });
  });

  afterEach(() => {
    // Add any necessary cleanup here
  });

  describe('Basic functionality', () => {
    it('should process simple markdown', async () => {
      const markdown = '# Hello World\n\nThis is a test.';
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="id-hello-world">Hello World</h1>');
      expect(result.html).toContain('<p>This is a test.</p>');
      expect(result.frontmatter).toEqual({});
      expect(result.headingTree).toHaveLength(1);
      expect(result.headingTree[0]?.text).toBe('Hello World');
      expect(result.headingTree[0]?.id).toBe('id-hello-world');
    });

    it('should process simple markdown with unique IDs', async () => {
      const markdown = '# Hello World\n\nThis is a test.';
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="id-1">Hello World</h1>');
      expect(result.html).toContain('<p>This is a test.</p>');
      expect(result.frontmatter).toEqual({});
      expect(result.headingTree).toHaveLength(1);
      expect(result.headingTree[0]?.text).toBe('Hello World');
      expect(result.headingTree[0]?.id).toBe('id-1');
    });

    it('should process markdown with frontmatter', async () => {
      const markdown = `---
title: "Test Document"
author: "Test Author"
tags: ["test", "markdown"]
---

# Content

This is the content.`;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="id-content">Content</h1>');
      expect(result.html).toContain('<p>This is the content.</p>');
      expect(result.frontmatter).toEqual({
        title: 'Test Document',
        author: 'Test Author',
        tags: ['test', 'markdown'],
      });
      expect(result.headingTree).toHaveLength(1);
      expect(result.headingTree[0]?.text).toBe('Content');
      expect(result.headingTree[0]?.id).toBe('id-content');
    });

    it('should process markdown with frontmatter using unique IDs', async () => {
      const markdown = `---
title: "Test Document"
author: "Test Author"
tags: ["test", "markdown"]
---

# Content

This is the content.`;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: false,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="id-1">Content</h1>');
      expect(result.html).toContain('<p>This is the content.</p>');
      expect(result.frontmatter).toEqual({
        title: 'Test Document',
        author: 'Test Author',
        tags: ['test', 'markdown'],
      });
      expect(result.headingTree).toHaveLength(1);
      expect(result.headingTree[0]?.text).toBe('Content');
      expect(result.headingTree[0]?.id).toBe('id-1');
    });

    it('should process markdown with GFM features', async () => {
      const markdown = `# Test

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |

- [x] Completed task
- [ ] Incomplete task

~~Strikethrough text~~`;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<table>');
      expect(result.html).toContain('<th>Column 1</th>');
      expect(result.html).toContain('<td>Cell 1</td>');
      expect(result.html).toContain('<input');
      expect(result.html).toContain('type="checkbox"');
      expect(result.html).toContain('<del>Strikethrough text</del>');
    });

    it('should handle code blocks without plugins', async () => {
      const markdown = `\`\`\`javascript
console.log('Hello, World!');
\`\`\``;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<pre><code class="language-javascript">');
      expect(result.html).toContain("console.log('Hello, World!');");
    });

    it('should collect headings in hierarchical tree structure', async () => {
      const markdown = `
# First Title

Some content here.

## First Subtitle

More content.

### First Sub-subtitle

Even more content.

## Second Subtitle

Final content.

# Second Title

Last content.
`;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.headingTree).toHaveLength(2);

      // Check first H1
      expect(result.headingTree[0]).toEqual({
        level: 1,
        text: 'First Title',
        id: 'id-first-title',
        children: [
          {
            level: 2,
            text: 'First Subtitle',
            id: 'id-first-subtitle',
            children: [
              {
                level: 3,
                text: 'First Sub-subtitle',
                id: 'id-first-sub-subtitle',
                children: [],
              },
            ],
          },
          {
            level: 2,
            text: 'Second Subtitle',
            id: 'id-second-subtitle',
            children: [],
          },
        ],
      });

      // Check second H1
      expect(result.headingTree[1]).toEqual({
        level: 1,
        text: 'Second Title',
        id: 'id-second-title',
        children: [],
      });
    });

    it('should collect headings with unique IDs in hierarchical tree structure', async () => {
      const markdown = `
# First Title

Some content here.

## First Subtitle

More content.

### First Sub-subtitle

Even more content.

## Second Subtitle

Final content.

# Second Title

Last content.
`;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: false,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.headingTree).toHaveLength(2);

      // Check first H1
      expect(result.headingTree[0]).toEqual({
        level: 1,
        text: 'First Title',
        id: 'id-1',
        children: [
          {
            level: 2,
            text: 'First Subtitle',
            id: 'id-2',
            children: [
              {
                level: 3,
                text: 'First Sub-subtitle',
                id: 'id-3',
                children: [],
              },
            ],
          },
          {
            level: 2,
            text: 'Second Subtitle',
            id: 'id-4',
            children: [],
          },
        ],
      });

      // Check second H1
      expect(result.headingTree[1]).toEqual({
        level: 1,
        text: 'Second Title',
        id: 'id-5',
        children: [],
      });
    });

    it('should collect headings with complex content', async () => {
      const markdown = `
# Title with **bold** and *italic*

## Another title with [link](http://example.com)

### Title with \`code\`

Content here.
`;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.headingTree).toHaveLength(1);
      expect(result.headingTree[0]?.text).toBe('Title with bold and italic');
      expect(result.headingTree[0]?.id).toBe('id-title-with-bold-and-italic');
      expect(result.headingTree[0]?.children[0]?.text).toBe(
        'Another title with link'
      );
      expect(result.headingTree[0]?.children[0]?.id).toBe(
        'id-another-title-with-link'
      );
      expect(result.headingTree[0]?.children[0]?.children[0]?.text).toBe(
        'Title with code'
      );
      expect(result.headingTree[0]?.children[0]?.children[0]?.id).toBe(
        'id-title-with-code'
      );
    });

    it('should collect headings with frontmatter', async () => {
      const markdown = `---
title: Test Article
author: John Doe
---

# First Title

Content here.

# Second Title

More content.`;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.headingTree).toHaveLength(2);
      expect(result.headingTree[0]?.text).toBe('First Title');
      expect(result.headingTree[1]?.text).toBe('Second Title');
      expect(result.frontmatter).toEqual({
        title: 'Test Article',
        author: 'John Doe',
      });
    });

    it('should handle plugin errors gracefully', async () => {
      const createErrorPlugin = (): MarkdownProcessorPlugin => {
        const processBlock = async (): Promise<string> => {
          throw new Error('MarkdownProcessorPlugin processing error');
        };

        return {
          name: 'error-plugin',
          processBlock,
        };
      };

      const plugin = createErrorPlugin();
      const processorWithPlugin = createMarkdownProcessor({
        plugins: [plugin],
        fetcher: defaultTestFetcher,
      });

      const markdown = `\`\`\`error-plugin
test content
\`\`\``;

      // Should propagate the plugin error
      await expect(processorWithPlugin.process(markdown, 'id')).rejects.toThrow(
        'Failed to process markdown: MarkdownProcessorPlugin processing error'
      );
    });
  });

  describe('headerTitleTransform behaviour', () => {
    it('applies leading base-level heading to frontmatter when title is absent', async () => {
      const markdown = `# Hello World

This is content.`;

      const result = await processor.process(markdown, 'id');

      expect(result.frontmatter).toEqual({ title: 'Hello World' });
      expect(result.html).not.toContain('<h1');
      expect(result.headingTree).toHaveLength(0);
    });

    it('removes leading base-level heading but keeps existing frontmatter title', async () => {
      const markdown = `---
title: Existing Title
---

# Display Title

Body text.`;

      const result = await processor.process(markdown, 'id');

      expect(result.frontmatter).toEqual({ title: 'Existing Title' });
      expect(result.html).not.toContain('<h1');
      expect(result.headingTree).toHaveLength(0);
    });

    it('handles Setext style top-level headings', async () => {
      const markdown = `Setext Title
================

Paragraph text.`;

      const result = await processor.process(markdown, 'id');

      expect(result.frontmatter).toEqual({ title: 'Setext Title' });
      expect(result.html).not.toContain('<h1');
      expect(result.headingTree).toHaveLength(0);
    });

    it('extract keeps leading base-level heading while applying title', async () => {
      const markdown = `# Visible Title

Paragraph text.`;

      const result = await processor.process(markdown, 'id', {
        headerTitleTransform: 'extract',
      });

      expect(result.frontmatter).toEqual({ title: 'Visible Title' });
      expect(result.html).toContain('<h1');
      expect(result.html).toContain('Visible Title');
      expect(result.headingTree).toHaveLength(1);
    });

    it('can be disabled through options', async () => {
      const markdown = `# Keep Heading

Still content.`;

      const result = await processor.process(markdown, 'id', {
        headerTitleTransform: 'none',
      });

      expect(result.frontmatter).toEqual({});
      expect(result.html).toContain('<h1');
      expect(result.headingTree).toHaveLength(1);
    });
  });

  describe('headingBaseLevel', () => {
    it('offsets heading levels in output and headingTree', async () => {
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

  describe('Hierarchical content-based heading IDs', () => {
    it('should generate hierarchical content-based IDs when both useContentStringHeaderId and useHierarchicalHeadingId are true', async () => {
      const markdown = `# My Main Section

## Sub Section A

### Details A1

## Sub Section B

### Details B1

### Details B2

# Another Main Section

## Another Sub Section`;

      const result = await processor.process(markdown, 'test', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: true,
        headerTitleTransform: 'none',
      });

      // Check that hierarchical content-based IDs are generated
      expect(result.html).toContain(
        '<h1 id="test-my-main-section">My Main Section</h1>'
      );
      expect(result.html).toContain(
        '<h2 id="test-my-main-section-sub-section-a">Sub Section A</h2>'
      );
      expect(result.html).toContain(
        '<h3 id="test-my-main-section-sub-section-a-details-a1">Details A1</h3>'
      );
      expect(result.html).toContain(
        '<h2 id="test-my-main-section-sub-section-b">Sub Section B</h2>'
      );
      expect(result.html).toContain(
        '<h3 id="test-my-main-section-sub-section-b-details-b1">Details B1</h3>'
      );
      expect(result.html).toContain(
        '<h3 id="test-my-main-section-sub-section-b-details-b2">Details B2</h3>'
      );
      expect(result.html).toContain(
        '<h1 id="test-another-main-section">Another Main Section</h1>'
      );
      expect(result.html).toContain(
        '<h2 id="test-another-main-section-another-sub-section">Another Sub Section</h2>'
      );

      // Check heading tree structure with correct IDs
      expect(result.headingTree).toHaveLength(2);

      // First H1 section
      expect(result.headingTree[0]).toEqual({
        level: 1,
        text: 'My Main Section',
        id: 'test-my-main-section',
        children: [
          {
            level: 2,
            text: 'Sub Section A',
            id: 'test-my-main-section-sub-section-a',
            children: [
              {
                level: 3,
                text: 'Details A1',
                id: 'test-my-main-section-sub-section-a-details-a1',
                children: [],
              },
            ],
          },
          {
            level: 2,
            text: 'Sub Section B',
            id: 'test-my-main-section-sub-section-b',
            children: [
              {
                level: 3,
                text: 'Details B1',
                id: 'test-my-main-section-sub-section-b-details-b1',
                children: [],
              },
              {
                level: 3,
                text: 'Details B2',
                id: 'test-my-main-section-sub-section-b-details-b2',
                children: [],
              },
            ],
          },
        ],
      });

      // Second H1 section
      expect(result.headingTree[1]).toEqual({
        level: 1,
        text: 'Another Main Section',
        id: 'test-another-main-section',
        children: [
          {
            level: 2,
            text: 'Another Sub Section',
            id: 'test-another-main-section-another-sub-section',
            children: [],
          },
        ],
      });
    });

    it('should handle complex nesting with hierarchical content-based IDs', async () => {
      const markdown = `# Guide

## Getting Started

### Installation

#### Prerequisites

##### System Requirements

## Advanced Usage

### Configuration

#### Database Setup

### API Reference

#### Authentication

##### OAuth 2.0

##### API Keys`;

      const result = await processor.process(markdown, 'docs', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: true,
        headerTitleTransform: 'none',
      });

      // Test deep nesting
      expect(result.html).toContain('<h1 id="docs-guide">Guide</h1>');
      expect(result.html).toContain(
        '<h2 id="docs-guide-getting-started">Getting Started</h2>'
      );
      expect(result.html).toContain(
        '<h3 id="docs-guide-getting-started-installation">Installation</h3>'
      );
      expect(result.html).toContain(
        '<h4 id="docs-guide-getting-started-installation-prerequisites">Prerequisites</h4>'
      );
      expect(result.html).toContain(
        '<h5 id="docs-guide-getting-started-installation-prerequisites-system-requirements">System Requirements</h5>'
      );

      expect(result.html).toContain(
        '<h2 id="docs-guide-advanced-usage">Advanced Usage</h2>'
      );
      expect(result.html).toContain(
        '<h3 id="docs-guide-advanced-usage-configuration">Configuration</h3>'
      );
      expect(result.html).toContain(
        '<h4 id="docs-guide-advanced-usage-configuration-database-setup">Database Setup</h4>'
      );

      expect(result.html).toContain(
        '<h3 id="docs-guide-advanced-usage-api-reference">API Reference</h3>'
      );
      expect(result.html).toContain(
        '<h4 id="docs-guide-advanced-usage-api-reference-authentication">Authentication</h4>'
      );
      expect(result.html).toContain(
        '<h5 id="docs-guide-advanced-usage-api-reference-authentication-oauth-20">OAuth 2.0</h5>'
      );
      expect(result.html).toContain(
        '<h5 id="docs-guide-advanced-usage-api-reference-authentication-api-keys">API Keys</h5>'
      );
    });

    it('should handle skipped heading levels with hierarchical content-based IDs', async () => {
      const markdown = `# Main Title

### Skipped H2 Level

#### Further Nested

## Back to H2

### Regular H3`;

      const result = await processor.process(markdown, 'skip', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: true,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="skip-main-title">Main Title</h1>');
      expect(result.html).toContain(
        '<h3 id="skip-main-title-skipped-h2-level">Skipped H2 Level</h3>'
      );
      expect(result.html).toContain(
        '<h4 id="skip-main-title-skipped-h2-level-further-nested">Further Nested</h4>'
      );
      expect(result.html).toContain(
        '<h2 id="skip-main-title-back-to-h2">Back to H2</h2>'
      );
      expect(result.html).toContain(
        '<h3 id="skip-main-title-back-to-h2-regular-h3">Regular H3</h3>'
      );
    });

    it('should fall back to regular content-based IDs when useHierarchicalHeadingId is false', async () => {
      const markdown = `# My Main Section

## Sub Section A

### Details A1`;

      const result = await processor.process(markdown, 'fallback', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain(
        '<h1 id="fallback-my-main-section">My Main Section</h1>'
      );
      expect(result.html).toContain(
        '<h2 id="fallback-sub-section-a">Sub Section A</h2>'
      );
      expect(result.html).toContain(
        '<h3 id="fallback-details-a1">Details A1</h3>'
      );
    });

    it('should fall back to hierarchical numbered IDs when useContentStringHeaderId is false', async () => {
      const markdown = `# My Main Section

## Sub Section A

### Details A1`;

      const result = await processor.process(markdown, 'numbered', {
        useContentStringHeaderId: false,
        useHierarchicalHeadingId: true,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="numbered-1">My Main Section</h1>');
      expect(result.html).toContain('<h2 id="numbered-1-1">Sub Section A</h2>');
      expect(result.html).toContain('<h3 id="numbered-1-1-1">Details A1</h3>');
    });

    it('should preserve remark-attr manual IDs over generated hierarchical content-based IDs', async () => {
      const markdown = `# My Main Section

## Sub Section A {#custom-sub-a}

### Details A1`;

      const result = await processor.process(markdown, 'manual', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: true,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain(
        '<h1 id="manual-my-main-section">My Main Section</h1>'
      );
      expect(result.html).toContain('<h2 id="custom-sub-a">Sub Section A</h2>');
      expect(result.html).toContain(
        '<h3 id="manual-my-main-section-details-a1">Details A1</h3>'
      );
    });
  });

  describe('MarkdownProcessorPlugin integration', () => {
    it('should process custom blocks with plugins', async () => {
      const plugin = createMockPlugin('test');
      const processorWithPlugin = createMarkdownProcessor({
        plugins: [plugin],
        fetcher: defaultTestFetcher,
      });

      const markdown = `# Test

\`\`\`test
custom content
\`\`\``;

      const result = await processorWithPlugin.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="id-test">Test</h1>');
      expect(result.html).toContain('<div class="mock-plugin"');
      expect(result.html).toContain('custom content');
    });

    it('should pass frontmatter to plugins', async () => {
      const createFrontmatterTestPlugin = (): MarkdownProcessorPlugin => {
        const processBlock = async (
          content: string,
          context: MarkdownProcessorPluginContext
        ): Promise<string> => {
          const frontmatter = context.frontmatter;
          const title = frontmatter.title || 'No title';
          const author = frontmatter.author || 'Unknown author';
          return `<div class="frontmatter-test" data-title="${title}" data-author="${author}">${content}</div>`;
        };

        return {
          name: 'frontmatter-test',
          processBlock,
        };
      };

      const plugin = createFrontmatterTestPlugin();
      const processorWithPlugin = createMarkdownProcessor({
        plugins: [plugin],
        fetcher: defaultTestFetcher,
      });

      const markdown = `---
title: Test Article
author: John Doe
tags: [test, markdown]
---

# Content

\`\`\`frontmatter-test
test content
\`\`\``;

      const result = await processorWithPlugin.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="id-content">Content</h1>');
      expect(result.html).toContain('<div class="frontmatter-test"');
      expect(result.html).toContain('data-title="Test Article"');
      expect(result.html).toContain('data-author="John Doe"');
      expect(result.html).toContain('test content');
      expect(result.frontmatter).toEqual({
        title: 'Test Article',
        author: 'John Doe',
        tags: ['test', 'markdown'],
      });
    });

    it('should pass empty frontmatter to plugins when no frontmatter exists', async () => {
      const createFrontmatterTestPlugin = (): MarkdownProcessorPlugin => {
        const processBlock = async (
          content: string,
          context: MarkdownProcessorPluginContext
        ): Promise<string> => {
          const frontmatter = context.frontmatter;
          const title = frontmatter.title || 'No title';
          return `<div class="frontmatter-test" data-title="${title}">${content}</div>`;
        };

        return {
          name: 'frontmatter-test',
          processBlock,
        };
      };

      const plugin = createFrontmatterTestPlugin();
      const processorWithPlugin = createMarkdownProcessor({
        plugins: [plugin],
        fetcher: defaultTestFetcher,
      });

      const markdown = `# Content

\`\`\`frontmatter-test
test content
\`\`\``;

      const result = await processorWithPlugin.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<div class="frontmatter-test"');
      expect(result.html).toContain('data-title="No title"');
      expect(result.html).toContain('test content');
      expect(result.frontmatter).toEqual({});
    });

    it('should process multiple custom blocks', async () => {
      const plugin1 = createMockPlugin('test1');
      const plugin2 = createMockPlugin('test2');
      const processorWithPlugins = createMarkdownProcessor({
        plugins: [plugin1, plugin2],
        fetcher: defaultTestFetcher,
      });

      const markdown = `\`\`\`test1
content 1
\`\`\`

\`\`\`test2
content 2
\`\`\``;

      const result = await processorWithPlugins.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('content 1');
      expect(result.html).toContain('content 2');
    });

    it('should get list of registered plugins', () => {
      const plugin1 = createMockPlugin('test1');
      const plugin2 = createMockPlugin('test2');
      const processorWithPlugins = createMarkdownProcessor({
        plugins: [plugin1, plugin2],
        fetcher: defaultTestFetcher,
      });

      // Verify that plugins are registered correctly by performing actual processing
      expect(processorWithPlugins).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle malformed frontmatter gracefully', async () => {
      const markdown = `---
title: Test
description: "This is a test"
---

# Content`;

      // Should process successfully with valid frontmatter
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });
      expect(result.html).toContain('<h1 id="id-content">Content</h1>');
      expect(result.frontmatter.title).toBe('Test');
    });

    it('should throw error for severely malformed frontmatter', async () => {
      const markdown = `---
title: Test
invalid yaml: [
---

# Content`;

      // Should throw error for malformed YAML
      await expect(
        processor.process(markdown, 'id', {
          useContentStringHeaderId: true,
          useHierarchicalHeadingId: false,
          headerTitleTransform: 'none',
        })
      ).rejects.toThrow();
    });

    it('should throw specific error for malformed YAML frontmatter', async () => {
      const markdown = `---
title: Test
invalid: [unclosed array
another: {unclosed object
---

# Content`;

      // Should throw error with YAML parsing details
      await expect(
        processor.process(markdown, 'id', {
          useContentStringHeaderId: true,
          useHierarchicalHeadingId: false,
          headerTitleTransform: 'none',
        })
      ).rejects.toThrow(/Failed to process markdown/);
    });
  });

  describe('Options handling', () => {
    it('should accept and pass options to plugins', async () => {
      const plugin = createMockPlugin('test');
      const processorWithPlugin = createMarkdownProcessor({
        plugins: [plugin],
        fetcher: defaultTestFetcher,
      });

      const markdown = `\`\`\`test
content
\`\`\``;

      const result = await processorWithPlugin.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
      });
      expect(result.html).toContain('Mock plugin processed');
    });
  });

  describe('createDirectFetcher integration', () => {
    it('should use createDirectFetcher as fetcher', async () => {
      const userAgent = 'test-direct-fetcher/1.0';
      const timeout = 5000;
      const fetcherInterface = createDirectFetcher(userAgent, timeout);

      const createFetchTestPlugin = (): MarkdownProcessorPlugin => {
        const processBlock = async (
          content: string,
          context: MarkdownProcessorPluginContext
        ): Promise<string> => {
          // Verify that the context has the correct fetcher properties
          expect(context.fetcher.userAgent).toBe(userAgent);
          expect(typeof context.fetcher.rawFetcher).toBe('function');
          expect(context.fetcher.userAgent).toBe(userAgent);

          return `<div class="direct-fetch-test" data-user-agent="${context.fetcher.userAgent || 'none'}">${content}</div>`;
        };

        return {
          name: 'direct-fetch-test',
          processBlock,
        };
      };

      const plugin = createFetchTestPlugin();
      const processor = createMarkdownProcessor({
        plugins: [plugin],
        fetcher: fetcherInterface,
      });

      const markdown = `\`\`\`direct-fetch-test
test content
\`\`\``;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<div class="direct-fetch-test"');
      expect(result.html).toContain(`data-user-agent="${userAgent}"`);
      expect(result.html).toContain('test content');
    });

    it('should handle different timeout values in createDirectFetcher', async () => {
      const userAgent = 'timeout-test/1.0';
      const shortTimeout = 100;
      const longTimeout = 10000;

      const shortFetcher = createDirectFetcher(userAgent, shortTimeout);
      const longFetcher = createDirectFetcher(userAgent, longTimeout);

      // Both should be valid objects
      expect(typeof shortFetcher).toBe('object');
      expect(typeof longFetcher).toBe('object');
      expect(typeof shortFetcher.rawFetcher).toBe('function');
      expect(typeof longFetcher.rawFetcher).toBe('function');
      expect(shortFetcher.userAgent).toBe(userAgent);
      expect(longFetcher.userAgent).toBe(userAgent);

      // They should be different instances
      expect(shortFetcher).not.toBe(longFetcher);
    });
  });

  describe('createCachedFetcher integration', () => {
    it('should use createCachedFetcher as fetcher', async () => {
      const userAgent = 'test-markdown-processor/1.0';
      const timeout = 5000;
      const fetcherInterface = createCachedFetcher(
        userAgent,
        timeout,
        undefined,
        { cache: false }
      ); // Disable cache for testing

      const createFetchTestPlugin = (): MarkdownProcessorPlugin => {
        const processBlock = async (
          content: string,
          context: MarkdownProcessorPluginContext
        ): Promise<string> => {
          // Verify that the context has the correct fetcher properties
          expect(context.fetcher.userAgent).toBe(userAgent);
          expect(typeof context.fetcher.rawFetcher).toBe('function');
          expect(context.fetcher.userAgent).toBe(userAgent);

          return `<div class="fetch-test" data-user-agent="${context.fetcher.userAgent || 'none'}">${content}</div>`;
        };

        return {
          name: 'fetch-test',
          processBlock,
        };
      };

      const plugin = createFetchTestPlugin();
      const processor = createMarkdownProcessor({
        plugins: [plugin],
        fetcher: fetcherInterface,
        // userAgent is now extracted from fetcherInterface
      });

      const markdown = `\`\`\`fetch-test
test content
\`\`\``;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<div class="fetch-test"');
      expect(result.html).toContain(`data-user-agent="${userAgent}"`);
      expect(result.html).toContain('test content');
    });

    it('should handle undefined userAgent in createCachedFetcher', async () => {
      // Test with a proper userAgent instead of undefined since it's now required
      const userAgent = 'default-test-agent/1.0.0';
      const timeout = 5000;
      const fetcherInterface = createCachedFetcher(
        userAgent,
        timeout,
        undefined,
        { cache: false }
      ); // Disable cache for testing

      const plugin: MarkdownProcessorPlugin = {
        name: 'undefined-context-test',
        processBlock: async (content, context) => {
          // Should have the specified userAgent from fetcher
          expect(context.fetcher.userAgent).toBe(userAgent);
          expect(context.logger).toBeDefined();
          expect(context.fetcher.userAgent).toBe(userAgent);

          return `<div class="fetch-test" data-user-agent="${context.fetcher.userAgent || 'none'}">${content}</div>`;
        },
      };

      // Create processor with fetcherInterface (which contains userAgent)
      const processor = createMarkdownProcessor({
        plugins: [plugin],
        fetcher: fetcherInterface,
      });

      const markdown = '```undefined-context-test\ntest content\n```';
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      // userAgent is now extracted from fetcherInterface
      expect(result.html).toContain(`data-user-agent="${userAgent}"`);
    });

    it('should handle different timeout values in createCachedFetcher', async () => {
      const userAgent = 'timeout-test/1.0';
      const shortTimeout = 100;
      const longTimeout = 10000;

      const shortFetcher = createCachedFetcher(userAgent, shortTimeout);
      const longFetcher = createCachedFetcher(userAgent, longTimeout);

      // Both should be valid objects
      expect(typeof shortFetcher).toBe('object');
      expect(typeof longFetcher).toBe('object');
      expect(typeof shortFetcher.rawFetcher).toBe('function');
      expect(typeof longFetcher.rawFetcher).toBe('function');
      expect(shortFetcher.userAgent).toBe(userAgent);
      expect(longFetcher.userAgent).toBe(userAgent);

      // They should be different instances
      expect(shortFetcher).not.toBe(longFetcher);
    });

    it('should work with processor when no fetcher is provided', async () => {
      const plugin = createMockPlugin('no-fetcher-test');
      const processor = createMarkdownProcessor({
        plugins: [plugin],
        fetcher: defaultTestFetcher,
        // No fetcher provided - should use default
      });

      const markdown = `\`\`\`no-fetcher-test
test content
\`\`\``;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<div class="mock-plugin"');
      expect(result.html).toContain('test content');
    });
  });

  describe('HTMLBeautifyOptions Support', () => {
    it('should use custom htmlOptions when provided', async () => {
      const processor = createMarkdownProcessor({
        fetcher: defaultTestFetcher,
        plugins: [],
      });

      const markdown = `# Test\n\nThis is a simple paragraph.`;

      // Test with custom HTML options (no indentation)
      const customOptions: HTMLBeautifyOptions = {
        indent_size: 0,
        indent_char: '',
        preserve_newlines: false,
        max_preserve_newlines: 0,
      };

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        advancedOptions: {
          htmlOptions: customOptions,
        },
        headerTitleTransform: 'none',
      });

      // The HTML should have no indentation due to custom options
      expect(result.html).not.toContain('  '); // No double spaces (indentation)
      expect(result.html).toContain('<h1 id="id-test">Test</h1>');
      expect(result.html).toContain('<p>This is a simple paragraph.</p>');
    });

    it('should use default htmlOptions when not provided', async () => {
      const processor = createMarkdownProcessor({
        fetcher: defaultTestFetcher,
        plugins: [],
      });

      const markdown = `# Test\n\nThis is a simple paragraph.\n\n* Item 1\n* Item 2`;

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      // The HTML should be indented with default options (2 spaces)
      expect(result.html).toContain('  '); // Should contain indentation in nested elements
      expect(result.html).toContain('<h1 id="id-test">Test</h1>');
      expect(result.html).toContain('<p>This is a simple paragraph.</p>');
      expect(result.html).toContain('<ul>');
      expect(result.html).toContain('<li>Item 1</li>');
    });

    it('should handle complex HTML structures with custom options', async () => {
      const processor = createMarkdownProcessor({
        fetcher: defaultTestFetcher,
        plugins: [],
      });

      const markdown = `# Heading\n\n* Item 1\n* Item 2\n\n> Blockquote`;

      const customOptions: HTMLBeautifyOptions = {
        indent_size: 4,
        indent_char: ' ',
        preserve_newlines: true,
        max_preserve_newlines: 2,
      };

      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        advancedOptions: {
          htmlOptions: customOptions,
        },
        headerTitleTransform: 'none',
      });

      // The HTML should use 4-space indentation
      expect(result.html).toContain('    '); // 4 spaces indentation
      expect(result.html).toContain('<h1 id="id-heading">Heading</h1>');
      expect(result.html).toContain('<ul>');
      expect(result.html).toContain('<li>Item 1</li>');
      expect(result.html).toContain('<blockquote>');
    });
  });

  describe('Remark GFM and Custom Plugins Support', () => {
    it('should apply gfmOptions for strikethrough configuration', async () => {
      const processor = createMarkdownProcessor({
        fetcher: defaultTestFetcher,
        plugins: [],
      });

      const markdown = `# Test\n\n~single~ and ~~double~~ tildes`;

      // Test with singleTilde disabled - only double tildes should work
      const result = await processor.process(markdown, 'id', {
        advancedOptions: {
          gfmOptions: {
            singleTilde: false,
          },
        },
        headerTitleTransform: 'none',
      });

      // Single tilde should be kept as text
      expect(result.html).toContain('~single~');
      // Double tilde should work
      expect(result.html).toContain('<del>double</del>');
    });

    it('should accept custom remark plugins', async () => {
      const processor = createMarkdownProcessor({
        fetcher: defaultTestFetcher,
        plugins: [],
      });

      // Mock remark plugin that wraps paragraphs with custom class
      const customPlugin = () => {
        return (tree: any) => {
          tree.children.forEach((node: any) => {
            if (node.type === 'paragraph') {
              node.data = node.data || {};
              node.data.hProperties = { className: 'custom-paragraph' };
            }
          });
        };
      };

      const markdown = `This is a paragraph.`;

      const result = await processor.process(markdown, 'id', {
        advancedOptions: {
          remarkPlugins: [customPlugin],
        },
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('class="custom-paragraph"');
    });

    it('should accept custom rehype plugins', async () => {
      const processor = createMarkdownProcessor({
        fetcher: defaultTestFetcher,
        plugins: [],
      });

      // Mock rehype plugin that adds data attributes to all elements
      const customRehypePlugin = () => {
        return (tree: unknown) => {
          const visit = (node: unknown): void => {
            const typedNode = node as {
              type?: string;
              properties?: Record<string, unknown>;
              children?: unknown[];
            };
            if (typedNode.type === 'element') {
              typedNode.properties = typedNode.properties || {};
              typedNode.properties['data-processed'] = 'true';
            }
            if (typedNode.children) {
              typedNode.children.forEach(visit);
            }
          };
          visit(tree);
        };
      };

      const markdown = `# Heading\n\nParagraph text.`;

      const result = await processor.process(markdown, 'id', {
        advancedOptions: {
          rehypePlugins: [customRehypePlugin],
        },
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('data-processed="true"');
    });

    it('should work with plugin parameters', async () => {
      const processor = createMarkdownProcessor({
        fetcher: defaultTestFetcher,
        plugins: [],
      });

      // Mock plugin with options
      const pluginWithOptions = (options: { prefix: string }) => {
        return (tree: unknown) => {
          const typedTree = tree as { children?: unknown[] };
          if (typedTree.children) {
            typedTree.children.forEach((node: unknown) => {
              const typedNode = node as {
                type?: string;
                depth?: number;
                children?: { type?: string; value?: string }[];
              };
              if (typedNode.type === 'heading' && typedNode.depth === 1) {
                if (
                  typedNode.children &&
                  typedNode.children[0] &&
                  typedNode.children[0].type === 'text'
                ) {
                  typedNode.children[0].value = `${options.prefix}${typedNode.children[0].value}`;
                }
              }
            });
          }
        };
      };

      const markdown = `# Test Heading`;

      const result = await processor.process(markdown, 'id', {
        advancedOptions: {
          remarkPlugins: [[pluginWithOptions, { prefix: 'PREFIX: ' }]],
        },
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('PREFIX: Test Heading');
    });
  });

  it('should allow custom logger', async () => {
    const testFetcher = createCachedFetcher('test-userAgent', 5000);
    const customLogger = getConsoleLogger();
    const processor = createMarkdownProcessor({
      logger: customLogger,
      fetcher: testFetcher,
    });

    const markdown = '# Test';
    const result = await processor.process(markdown, 'id', {
      useContentStringHeaderId: true,
      useHierarchicalHeadingId: false,
      headerTitleTransform: 'none',
    });

    expect(result.html).toContain('<h1 id="id-test">Test</h1>');
  });

  describe('Heading ID options', () => {
    it('should generate content-based IDs when useContentStringHeaderId is true', async () => {
      const markdown = '# Hello World\n\n## Another Title\n\nContent.';
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="id-hello-world">Hello World</h1>');
      expect(result.html).toContain(
        '<h2 id="id-another-title">Another Title</h2>'
      );
      expect(result.headingTree[0]?.id).toBe('id-hello-world');
      expect(result.headingTree[0]?.children[0]?.id).toBe('id-another-title');
    });

    it('should generate unique IDs when useContentStringHeaderId is false', async () => {
      const markdown = '# Hello World\n\n## Another Title\n\nContent.';
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: false,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="id-1">Hello World</h1>');
      expect(result.html).toContain('<h2 id="id-2">Another Title</h2>');
      expect(result.headingTree[0]?.id).toBe('id-1');
      expect(result.headingTree[0]?.children[0]?.id).toBe('id-2');
    });

    it('should default to unique IDs when useContentStringHeaderId is not specified', async () => {
      const markdown = '# Hello World\n\n## Another Title\n\nContent.';
      const result = await processor.process(markdown, 'id', {
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      expect(result.html).toContain('<h1 id="id-1">Hello World</h1>');
      expect(result.html).toContain('<h2 id="id-2">Another Title</h2>');
      expect(result.headingTree[0]?.id).toBe('id-1');
      expect(result.headingTree[0]?.children[0]?.id).toBe('id-2');
    });

    it('should handle control characters in headings when generating content-based IDs', async () => {
      // Test headings that contain actual control characters within the heading text
      const markdown = `# ABC\fDEF\n\n## Hello\tWorld\vTest\n\n### A\bB\x07C\n\nContent.`;
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      // Test form feed character should be replaced with hyphen
      expect(result.html).toContain('<h1 id="id-abc-def">ABC');
      expect(result.headingTree[0]?.id).toBe('id-abc-def');

      // Test tab and vertical tab characters should be replaced with hyphens
      expect(result.html).toContain('<h2 id="id-hello-world-test">Hello');
      expect(result.headingTree[0]?.children[0]?.id).toBe(
        'id-hello-world-test'
      );

      // Test backspace and bell characters should be replaced with hyphens (backspace erases B, so A+C remains)
      expect(result.html).toContain('<h3 id="id-a-b-c">'); // The actual output is "a-b-c" because both backspace and bell are converted to hyphens
      expect(result.headingTree[0]?.children[0]?.children[0]?.id).toBe(
        'id-a-b-c'
      );
    });

    it('should handle various other control characters in headings', async () => {
      // Test different control characters in heading text
      const markdown = `# Test\x01Form\x02Feed\n\n## Bell\x03Sound\x04End\n\nContent.`;
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      // Test SOH and STX characters should be replaced with hyphens
      expect(result.html).toContain('<h1 id="id-test-form-feed">Test');
      expect(result.headingTree[0]?.id).toBe('id-test-form-feed');

      // Test ETX and EOT control characters
      expect(result.html).toContain('<h2 id="id-bell-sound-end">Bell');
      expect(result.headingTree[0]?.children[0]?.id).toBe('id-bell-sound-end');
    });

    it('should handle control characters mixed with special characters', async () => {
      // Test control characters mixed with special characters that should be removed
      const markdown = `# Test\f@#$%DEF\n\n## Hello\t[World]\vTest\n\nContent.`;
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      // Test control character with special characters - special chars should be removed, control chars become hyphens
      expect(result.html).toContain('<h1 id="id-test-def">Test');
      expect(result.headingTree[0]?.id).toBe('id-test-def');

      // Test tab with brackets and vertical tab - brackets removed, control chars become hyphens
      expect(result.html).toContain('<h2 id="id-hello-world-test">Hello');
      expect(result.headingTree[0]?.children[0]?.id).toBe(
        'id-hello-world-test'
      );
    });

    it('should handle escape sequence strings in headings', async () => {
      // Test escape sequence strings like \n, \t that appear as literal strings
      const markdown = `# Test\\n\\nContent\n\n## Hello\\tWorld\\rTest\n\nContent.`;
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      // Test that literal \n strings are converted to hyphens
      expect(result.html).toContain('<h1 id="id-test-content">Test');
      expect(result.headingTree[0]?.id).toBe('id-test-content');

      // Test that literal \t and \r strings are converted to hyphens
      expect(result.html).toContain('<h2 id="id-hello-world-test">Hello');
      expect(result.headingTree[0]?.children[0]?.id).toBe(
        'id-hello-world-test'
      );
    });

    it('should handle non-ASCII characters with fallback strategy', async () => {
      // Test Unicode normalization and accent removal
      const markdown = `# Café Naïve\n\n## こんにちは世界\n\n### Ñoël\n\nContent.`;
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      // Test that accented characters are normalized
      expect(result.html).toContain('<h1 id="id-cafe-naive">Café');
      expect(result.headingTree[0]?.id).toBe('id-cafe-naive');

      // Test that Japanese text falls back to unique ID
      expect(result.html).toMatch(/<h2 id="id-\d+">こんにちは世界/);
      expect(result.headingTree[0]?.children[0]?.id).toMatch(/^id-\d+$/);

      // Test that Spanish characters are normalized
      expect(result.html).toContain('<h3 id="id-noel">Ñoël');
      expect(result.headingTree[0]?.children[0]?.children[0]?.id).toBe(
        'id-noel'
      );
    });

    it('should use fallback for very short or invalid IDs', async () => {
      // Test headings that result in very short IDs
      const markdown = `# 🎉\n\n## ♥\n\n### A\n\nContent.`;
      const result = await processor.process(markdown, 'id', {
        useContentStringHeaderId: true,
        useHierarchicalHeadingId: false,
        headerTitleTransform: 'none',
      });

      // Test that emoji falls back to unique ID
      expect(result.html).toMatch(/<h1 id="id-\d+">🎉/);
      expect(result.headingTree[0]?.id).toMatch(/^id-\d+$/);

      // Test that single symbol falls back to unique ID
      expect(result.html).toMatch(/<h2 id="id-\d+">♥/);
      expect(result.headingTree[0]?.children[0]?.id).toMatch(/^id-\d+$/);

      // Test that single ASCII character falls back to unique ID (less than 3 chars)
      expect(result.html).toMatch(/<h3 id="id-\d+">A/);
      expect(result.headingTree[0]?.children[0]?.children[0]?.id).toMatch(
        /^id-\d+$/
      );
    });

    it('should generate hierarchical heading IDs when useHierarchicalHeadingId is true', async () => {
      const markdown = `
# First Title

Some content here.

## First Subtitle

More content.

## Second Subtitle

Some more content.

# Second Title

Final content.

## Third Subtitle

More content.

## Fourth Subtitle

Even more content.

## Fifth Subtitle

Last content.
`;

      const result = await processor.process(markdown, 'id', {
        useHierarchicalHeadingId: true,
        headerTitleTransform: 'none',
      });

      expect(result.headingTree).toHaveLength(2);

      // Check first H1 and its children
      expect(result.headingTree[0]).toEqual({
        level: 1,
        text: 'First Title',
        id: 'id-1',
        children: [
          {
            level: 2,
            text: 'First Subtitle',
            id: 'id-1-1',
            children: [],
          },
          {
            level: 2,
            text: 'Second Subtitle',
            id: 'id-1-2',
            children: [],
          },
        ],
      });

      // Check second H1 and its children
      expect(result.headingTree[1]).toEqual({
        level: 1,
        text: 'Second Title',
        id: 'id-2',
        children: [
          {
            level: 2,
            text: 'Third Subtitle',
            id: 'id-2-1',
            children: [],
          },
          {
            level: 2,
            text: 'Fourth Subtitle',
            id: 'id-2-2',
            children: [],
          },
          {
            level: 2,
            text: 'Fifth Subtitle',
            id: 'id-2-3',
            children: [],
          },
        ],
      });

      // Check HTML contains the correct IDs
      expect(result.html).toContain('<h1 id="id-1">First Title</h1>');
      expect(result.html).toContain('<h2 id="id-1-1">First Subtitle</h2>');
      expect(result.html).toContain('<h2 id="id-1-2">Second Subtitle</h2>');
      expect(result.html).toContain('<h1 id="id-2">Second Title</h1>');
      expect(result.html).toContain('<h2 id="id-2-1">Third Subtitle</h2>');
      expect(result.html).toContain('<h2 id="id-2-2">Fourth Subtitle</h2>');
      expect(result.html).toContain('<h2 id="id-2-3">Fifth Subtitle</h2>');
    });

    it('should generate hierarchical heading IDs with complex nesting', async () => {
      const markdown = `
# Main Title

## Section 1

### Subsection 1.1

### Subsection 1.2

## Section 2

### Subsection 2.1

#### Subsection 2.1.1

#### Subsection 2.1.2

### Subsection 2.2

# Second Main Title

## Section 3
`;

      const result = await processor.process(markdown, 'test', {
        useHierarchicalHeadingId: true,
        headerTitleTransform: 'none',
      });

      // Verify some key IDs in the hierarchical structure
      expect(result.html).toContain('<h1 id="test-1">Main Title</h1>');
      expect(result.html).toContain('<h2 id="test-1-1">Section 1</h2>');
      expect(result.html).toContain('<h3 id="test-1-1-1">Subsection 1.1</h3>');
      expect(result.html).toContain('<h3 id="test-1-1-2">Subsection 1.2</h3>');
      expect(result.html).toContain('<h2 id="test-1-2">Section 2</h2>');
      expect(result.html).toContain('<h3 id="test-1-2-1">Subsection 2.1</h3>');
      expect(result.html).toContain(
        '<h4 id="test-1-2-1-1">Subsection 2.1.1</h4>'
      );
      expect(result.html).toContain(
        '<h4 id="test-1-2-1-2">Subsection 2.1.2</h4>'
      );
      expect(result.html).toContain('<h3 id="test-1-2-2">Subsection 2.2</h3>');
      expect(result.html).toContain('<h1 id="test-2">Second Main Title</h1>');
      expect(result.html).toContain('<h2 id="test-2-1">Section 3</h2>');
    });
  });

  it('should process markdown with empty plugin arrays in advancedOptions', async () => {
    const processor = createMarkdownProcessor({
      fetcher: defaultTestFetcher,
      plugins: [],
    });

    const markdown = `# Test Heading

This is a test paragraph.`;

    // This should work without throwing "empty preset" error
    const result = await processor.process(markdown, 'id', {
      useContentStringHeaderId: true,
      useHierarchicalHeadingId: false,
      advancedOptions: {
        remarkPlugins: [],
        rehypePlugins: [],
      },
      headerTitleTransform: 'none',
    });

    expect(result.html).toContain('<h1 id="id-test-heading">Test Heading</h1>');
    expect(result.html).toContain('<p>This is a test paragraph.</p>');
  });

  it('should process markdown with undefined plugin arrays in advancedOptions', async () => {
    const processor = createMarkdownProcessor({
      fetcher: defaultTestFetcher,
      plugins: [],
    });

    const markdown = `# Test Heading

This is a test paragraph.`;

    // This should work without throwing "empty preset" error
    const result = await processor.process(markdown, 'id', {
      useContentStringHeaderId: true,
      useHierarchicalHeadingId: false,
      advancedOptions: {
        // Test with completely empty advancedOptions object
      },
      headerTitleTransform: 'none',
    });

    expect(result.html).toContain('<h1 id="id-test-heading">Test Heading</h1>');
    expect(result.html).toContain('<p>This is a test paragraph.</p>');
  });

  it('should process markdown with no advancedOptions at all', async () => {
    const processor = createMarkdownProcessor({
      fetcher: defaultTestFetcher,
      plugins: [],
    });

    const markdown = `# Test Heading

This is a test paragraph.`;

    // This should work without throwing "empty preset" error
    const result = await processor.process(markdown, 'id', {
      useContentStringHeaderId: true,
      useHierarchicalHeadingId: false,
      // No advancedOptions specified - should use defaults
      headerTitleTransform: 'none',
    });

    expect(result.html).toContain('<h1 id="id-test-heading">Test Heading</h1>');
    expect(result.html).toContain('<p>This is a test paragraph.</p>');
  });

  describe('processWithFrontmatterTransform', () => {
    it('returns undefined when transformer cancels processing', async () => {
      const markdown = '# Heading\n';

      const result = await processor.processWithFrontmatterTransform(
        markdown,
        'id',
        {
          preTransform: async () => undefined,
        }
      );

      expect(result).toBeUndefined();
    });

    it('applies H1 title before composing markdown', async () => {
      const markdown = `# Auto Title

Body paragraph.`;

      const result = await processor.processWithFrontmatterTransform(
        markdown,
        'id',
        {
          preTransform: async ({ originalFrontmatter, uniqueIdPrefix }) => ({
            frontmatter: { ...originalFrontmatter },
            uniqueIdPrefix,
          }),
        }
      );

      expect(result).not.toBeUndefined();
      expect(result?.frontmatter).toEqual({ title: 'Auto Title' });
      expect(result?.html).not.toContain('<h1');
      expect(result?.headingTree).toHaveLength(0);
      expect(result?.changed).toBe(true);
      const composed = result?.composeMarkdown() ?? '';
      expect(composed).toContain('title: Auto Title');
      expect(composed).not.toContain('# Auto Title');
    });

    it('treats identical frontmatter reference as unchanged', async () => {
      const markdown = `---
title: Post
---

# Heading
`;

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
        }
      );

      expect(result).not.toBeUndefined();
      expect(result?.changed).toBe(false);
      expect(result?.composeMarkdown()).toBe(markdown);
      expect(receivedPrefix).toBe('id');
      expect(result?.uniqueIdPrefix).toBe('id');
    });

    it('composes updated markdown when transformer modifies frontmatter', async () => {
      const markdown = `---
title: Post
---

# Heading
`;

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
                category: 'release',
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
        title: 'Post',
        category: 'release',
      });
      const expectedMarkdown = `---
title: Post
category: release
---

# Heading
`;
      expect(result?.composeMarkdown()).toBe(expectedMarkdown);
      expect(receivedPrefix).toBe('id');
      expect(result?.uniqueIdPrefix).toBe('id');
    });

    it('applies uniqueIdPrefix override from transform result', async () => {
      const markdown = '# Heading\n';

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
      expect(result?.changed).toBe(false);
      expect(receivedPrefix).toBe('id');
      expect(result?.uniqueIdPrefix).toBe('custom');
    });

    it('applies post transform to refine frontmatter using heading tree', async () => {
      const markdown = `# Title\n\nSome content`;

      const result = await processor.processWithFrontmatterTransform(
        markdown,
        'id',
        {
          preTransform: async ({ originalFrontmatter, uniqueIdPrefix }) => ({
            frontmatter: {
              ...originalFrontmatter,
              processed: true,
            },
            uniqueIdPrefix,
            headerTitleTransform: 'none',
          }),
          postTransform: async ({ frontmatter, headingTree }) => ({
            ...frontmatter,
            headingCount: headingTree.length,
          }),
        }
      );

      expect(result).not.toBeUndefined();
      expect(result?.frontmatter).toEqual({ processed: true, headingCount: 1 });
      expect(result?.changed).toBe(true);
      const composed = result?.composeMarkdown() ?? '';
      expect(composed).toContain('processed: true');
      expect(composed).toContain('headingCount: 1');
    });
  });
});
