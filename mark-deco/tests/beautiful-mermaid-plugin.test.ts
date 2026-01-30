// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { getNoOpLogger } from '../src/logger';
import { escapeHtml } from '../src/utils';
import type { AsciiRenderOptions, RenderOptions } from 'beautiful-mermaid';
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
    const renderMermaid: Mock<
      (text: string, options?: RenderOptions) => Promise<string>
    > = vi.fn(async () => '<svg></svg>');

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

describe('BeautifulMermaidPlugin theme options', () => {
  it('should apply css-vars strategy with Shiki theme input', async () => {
    vi.resetModules();

    const renderMermaid = vi.fn(async () => '<svg></svg>');
    const renderMermaidAscii = vi.fn(() => 'ASCII-OUTPUT');
    const fromShikiTheme = vi.fn(() => ({
      bg: '#ffffff',
      fg: '#111111',
      line: '#222222',
      accent: '#333333',
      muted: '#444444',
      surface: '#555555',
      border: '#666666',
    }));

    vi.doMock('beautiful-mermaid', () => ({
      renderMermaid,
      renderMermaidAscii,
      fromShikiTheme,
      THEMES: {},
    }));

    const { createBeautifulMermaidPlugin } =
      await import('../src/plugins/beautiful-mermaid');
    const plugin = createBeautifulMermaidPlugin({
      theme: {
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#111111',
        },
        tokenColors: [],
      } as unknown as Record<string, unknown>,
      themeMode: 'light',
      themeStrategy: 'css-vars',
      cssVarPrefix: '--mdc-bm',
    });

    const { mockContext } = createMockContext();
    const result = await plugin.processBlock('graph TD\nA --> B', mockContext);

    expect(fromShikiTheme).toHaveBeenCalled();
    expect(renderMermaid).toHaveBeenCalledOnce();
    const optionsArg = (
      renderMermaid.mock.calls[0] as [string, RenderOptions?] | undefined
    )?.[1];
    expect(optionsArg?.bg).toBe('var(--mdc-bm-bg)');
    expect(result).toContain(
      'style="--mdc-bm-bg: #ffffff; --mdc-bm-fg: #111111; --mdc-bm-line: #222222; --mdc-bm-accent: #333333; --mdc-bm-muted: #444444; --mdc-bm-surface: #555555; --mdc-bm-border: #666666"'
    );

    vi.doUnmock('beautiful-mermaid');
  });

  it('should emit light/dark css-vars rules when themeMode is auto', async () => {
    vi.resetModules();

    const renderMermaid = vi.fn(async () => '<svg></svg>');
    const renderMermaidAscii = vi.fn(() => 'ASCII-OUTPUT');

    vi.doMock('beautiful-mermaid', () => ({
      renderMermaid,
      renderMermaidAscii,
      THEMES: {
        'test-light': {
          bg: '#ffffff',
          fg: '#111111',
          line: '#222222',
          accent: '#333333',
          muted: '#444444',
        },
        'test-dark': {
          bg: '#000000',
          fg: '#eeeeee',
          line: '#cccccc',
          accent: '#bbbbbb',
          muted: '#aaaaaa',
        },
      },
    }));

    const { createBeautifulMermaidPlugin } =
      await import('../src/plugins/beautiful-mermaid');
    const plugin = createBeautifulMermaidPlugin({
      theme: {
        light: 'test-light',
        dark: 'test-dark',
      },
      themeMode: 'auto',
      themeStrategy: 'css-vars',
      cssVarPrefix: '--mdc-bm',
    });

    const { mockContext } = createMockContext();
    const result = await plugin.processBlock('graph TD\nA --> B', mockContext);

    expect(renderMermaid).toHaveBeenCalledOnce();
    const optionsArg = (
      renderMermaid.mock.calls[0] as [string, RenderOptions?] | undefined
    )?.[1];
    expect(optionsArg?.bg).toBe('var(--mdc-bm-bg)');
    expect(result).not.toContain('style="--mdc-bm-bg');
    expect(result).toContain('#test-id-123');
    expect(result).toContain('--mdc-bm-bg: #ffffff');
    expect(result).toContain('--mdc-bm-bg: #000000');
    expect(result).toContain('@media (prefers-color-scheme: dark)');

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
