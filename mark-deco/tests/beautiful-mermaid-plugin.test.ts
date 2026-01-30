// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { getNoOpLogger } from '../src/logger';
import { escapeHtml } from '../src/utils';
import type { AsciiRenderOptions } from 'beautiful-mermaid';
import type {
  MarkdownProcessorPlugin,
  MarkdownProcessorPluginContext,
} from '../src/types';
import { createBeautifulMermaidPlugin } from '../src/plugins/beautiful-mermaid-plugin';

const createMockContext = () => {
  const mockGetUniqueId: Mock<() => string> = vi.fn(() => 'test-id-123');

  const mockContext: MarkdownProcessorPluginContext = {
    logger: getNoOpLogger(),
    signal: new AbortController().signal,
    frontmatter: {},
    fetcher: {
      rawFetcher: vi.fn(),
      userAgent: 'test-user-agent',
    },
    getUniqueId: mockGetUniqueId,
  };

  return { mockContext, mockGetUniqueId };
};

describe('BeautifulMermaidPlugin', () => {
  let plugin: MarkdownProcessorPlugin;
  let mockContext: MarkdownProcessorPluginContext;

  beforeEach(() => {
    const setup = createMockContext();
    mockContext = setup.mockContext;
  });

  it('should render SVG output with wrapper classes', async () => {
    plugin = createBeautifulMermaidPlugin();

    const result = await plugin.processBlock('graph TD\nA --> B', mockContext);

    expect(result).toContain(
      'class="beautiful-mermaid-wrapper beautiful-mermaid-svg"'
    );
    expect(result).toContain('<svg');
    expect(result).toContain('id="test-id-123"');
  });
});

describe('BeautifulMermaidPlugin options', () => {
  it('should default to box-drawing mode for ASCII output', async () => {
    vi.resetModules();

    const renderMermaidAscii = vi.fn(
      (_text: string, _options?: AsciiRenderOptions) => 'ASCII-OUTPUT'
    );
    const renderMermaid = vi.fn(async () => '<svg></svg>');

    vi.doMock('beautiful-mermaid', () => ({
      renderMermaid,
      renderMermaidAscii,
    }));

    const { createBeautifulMermaidPlugin } =
      await import('../src/plugins/beautiful-mermaid');
    const plugin = createBeautifulMermaidPlugin({ output: 'ascii' });

    const { mockContext } = createMockContext();
    const result = await plugin.processBlock('graph TD\nA --> B', mockContext);

    expect(renderMermaidAscii).toHaveBeenCalledOnce();
    const optionsArg = renderMermaidAscii.mock.calls[0]?.[1];
    expect(optionsArg?.useAscii).toBe(false);
    expect(result).toContain(
      'class="beautiful-mermaid-wrapper beautiful-mermaid-ascii"'
    );
    expect(result).toContain('ASCII-OUTPUT');

    vi.doUnmock('beautiful-mermaid');
  });
});

describe('BeautifulMermaidPlugin fallback', () => {
  it('should fall back to the original code block on render errors', async () => {
    vi.resetModules();

    vi.doMock('beautiful-mermaid', () => ({
      renderMermaid: vi.fn(async () => {
        throw new Error('render failed');
      }),
      renderMermaidAscii: vi.fn(() => 'ASCII-OUTPUT'),
    }));

    const { createBeautifulMermaidPlugin } =
      await import('../src/plugins/beautiful-mermaid');
    const plugin = createBeautifulMermaidPlugin();

    const content = 'graph TD\nA --> B';
    const { mockContext } = createMockContext();
    const result = await plugin.processBlock(content, mockContext);

    const expected = `<pre><code class="language-mermaid">${escapeHtml(content)}</code></pre>`;
    expect(result).toBe(expected);

    vi.doUnmock('beautiful-mermaid');
  });
});
