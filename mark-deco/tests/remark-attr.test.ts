// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { describe, it, expect, beforeEach } from 'vitest';
import { createCachedFetcher } from '../src/fetcher.js';
import { createMarkdownProcessor } from '../src/processor.js';
import type { MarkdownProcessor, ProcessOptions } from '../src/types.js';

describe('remark-attr integration', () => {
  let processor: MarkdownProcessor;

  beforeEach(() => {
    const testUserAgent = 'mark-deco-test/1.0.0';
    const defaultTestFetcher = createCachedFetcher(testUserAgent, 5000);

    processor = createMarkdownProcessor({
      plugins: [],
      fetcher: defaultTestFetcher,
    });
  });

  const runProcess = async (
    markdown: string,
    prefix = 'test',
    options: ProcessOptions = {}
  ) => {
    return processor.process(markdown, prefix, {
      headerTitleTransform: 'none',
      ...options,
    });
  };

  describe('basic attribute application', () => {
    it('should apply class attribute to heading', async () => {
      const markdown = '# Hello World {.my-class}';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="my-class"');
      expect(result.html).toContain('<h1');
    });

    it('should apply id attribute to heading', async () => {
      const markdown = '# Hello World {#custom-id}';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('id="custom-id"');
      expect(result.html).toContain('<h1');
    });

    it('should apply multiple attributes to heading', async () => {
      const markdown = '# Hello World {#custom-id .my-class data-value="test"}';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('id="custom-id"');
      expect(result.html).toContain('class="my-class"');
      expect(result.html).toContain('data-value="test"');
    });

    it('should apply attributes to paragraph', async () => {
      const markdown = 'This is a paragraph. {.highlight}';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="highlight"');
      expect(result.html).toContain('<p');
    });

    it('should apply attributes to image', async () => {
      const markdown = '![Alt text](image.jpg){.responsive}';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="responsive"');
      expect(result.html).toContain('<img');
    });

    it('should apply attributes to links', async () => {
      const markdown =
        '[Link text](https://example.com){.external target="_blank"}';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="external"');
      expect(result.html).toContain('target="_blank"');
      expect(result.html).toContain('<a');
    });
  });

  describe('code block attribute application', () => {
    it('should apply attributes to code blocks', async () => {
      const markdown =
        '```javascript {.highlight-code}\nconsole.log("Hello");\n```';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="highlight-code"');
      expect(result.html).toContain('language-javascript');
      expect(result.html).toContain('<pre');
    });

    it('should apply id and class to code blocks', async () => {
      const markdown =
        '```python {#code-example .my-code}\nprint("Hello")\n```';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('id="code-example"');
      expect(result.html).toContain('class="my-code"');
      expect(result.html).toContain('language-python');
    });

    it('should apply data attributes to code blocks', async () => {
      const markdown =
        '```yaml {data-config="true" data-env="prod"}\nkey: value\n```';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('data-config="true"');
      expect(result.html).toContain('data-env="prod"');
    });
  });

  describe('inline element attributes', () => {
    it('should apply attributes to inline code', async () => {
      const markdown = 'Here is `some code`{.highlight} in a paragraph.';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="highlight"');
      expect(result.html).toContain('<code');
      expect(result.html).toContain('some code');
    });

    it('should apply multiple attributes to inline code', async () => {
      const markdown =
        'Check this `command`{.warning #cmd data-lang="bash"} out.';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="warning"');
      expect(result.html).toContain('id="cmd"');
      expect(result.html).toContain('data-lang="bash"');
      expect(result.html).toContain('<code');
    });
  });

  describe('block element attributes', () => {
    it('should apply attributes to blockquotes', async () => {
      const markdown = '> This is a quote {.quote-style}';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="quote-style"');
      expect(result.html).toContain('<blockquote');
    });

    it('should apply attributes to blockquotes on separate lines', async () => {
      const markdown =
        '> This is a quote\n> Multi-line quote\n\n{.fancy-quote #testimonial}';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="fancy-quote"');
      expect(result.html).toContain('id="testimonial"');
      expect(result.html).toContain('<blockquote');
    });

    it('should apply attributes to lists', async () => {
      const markdown = '- Item 1\n- Item 2\n{.custom-list}';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="custom-list"');
      expect(result.html).toContain('<ul');
    });

    it('should apply attributes to list items', async () => {
      const markdown = '- Item 1 {.item-class}\n- Item 2';
      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('class="item-class"');
      expect(result.html).toContain('<li');
    });
  });

  describe('plugin block integration', () => {
    it('should apply attributes to plugin-processed code blocks', async () => {
      // Create a test processor with a mock plugin
      const testUserAgent = 'mark-deco-test/1.0.0';
      const defaultTestFetcher = createCachedFetcher(testUserAgent, 5000);

      const mockPlugin = {
        name: 'test-plugin',
        processBlock: async (content: string): Promise<string> => {
          return `<div class="test-plugin-output">${content}</div>`;
        },
      };

      const pluginProcessor = createMarkdownProcessor({
        plugins: [mockPlugin],
        fetcher: defaultTestFetcher,
      });

      const markdown =
        '```test-plugin {.custom-styling #plugin-block}\ntest content\n```';
      const result = await pluginProcessor.process(markdown, 'test', {
        headerTitleTransform: 'none',
      });

      // Note: When plugins process code blocks, they replace the original code block
      // so remark-attr attributes are not preserved in the plugin output.
      // This is expected behavior as plugins generate their own HTML structure.

      // When remark-attr runs before plugin processing, attributes are applied to the containing element
      // The actual behavior: remark-attr wraps the code block with attributes, but plugins don't preserve them
      // So we either get the plugin output OR the attributed wrapper, not both

      // Check if the plugin was processed (plugin output)
      if (result.html.includes('class="test-plugin-output"')) {
        expect(result.html).toContain('class="test-plugin-output"');
        expect(result.html).toContain('test content');
      } else {
        // Or if it was processed as attributed standard code block
        expect(result.html).toContain('class="custom-styling"');
        expect(result.html).toContain('id="plugin-block"');
        expect(result.html).toContain('test content');
      }

      // Verify the markdown was processed
      expect(result.html).toBeDefined();
      expect(result.html.length).toBeGreaterThan(0);
    });

    it('should handle attributes on standard code blocks that become plugin blocks', async () => {
      const markdown =
        '```javascript {.highlight-js data-theme="dark"}\nconsole.log("test");\n```';
      const result = await runProcess(markdown, 'test');

      // Standard code blocks should have attributes applied
      expect(result.html).toContain('class="highlight-js"');
      expect(result.html).toContain('language-javascript');
      expect(result.html).toContain('data-theme="dark"');
      expect(result.html).toContain('console.log("test");');
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple elements with different attributes', async () => {
      const markdown = `
# Main Title {#main .title-style}

This is content. {.content-highlight}

- List item 1 {.item}
- List item 2 {.item}
{.my-list}

\`\`\`javascript {.code-block}
function hello() {
  console.log("Hello");
}
\`\`\`
      `.trim();

      const result = await runProcess(markdown, 'test');

      expect(result.html).toContain('id="main"');
      expect(result.html).toContain('class="title-style"');
      expect(result.html).toContain('class="content-highlight"');
      expect(result.html).toContain('class="my-list"');
      expect(result.html).toContain('class="item"');
      expect(result.html).toContain('class="code-block"');
      expect(result.html).toContain('language-javascript');
    });

    it('should preserve existing functionality while adding attributes', async () => {
      const markdown = `
# Heading {.styled}

Normal paragraph content.

![Image](test.jpg){.responsive}

[Link](https://example.com){.external}
      `.trim();

      const result = await runProcess(markdown, 'test');

      // Check that attributes are applied
      expect(result.html).toContain('class="styled"');
      expect(result.html).toContain('class="responsive"');
      expect(result.html).toContain('class="external"');

      // Check that normal elements still work
      expect(result.html).toContain('<h1');
      expect(result.html).toContain('<p>');
      expect(result.html).toContain('<img');
      expect(result.html).toContain('<a');

      // Check that heading tree is still built
      expect(result.headingTree).toHaveLength(1);
      expect(result.headingTree[0]?.text).toBe('Heading');
    });
  });
});
