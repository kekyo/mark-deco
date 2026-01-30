// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type {
  MarkdownProcessorPlugin,
  MarkdownProcessorPluginContext,
} from '../../types';
import { escapeHtml } from '../../utils';
import type { BeautifulMermaidPluginOptions } from './types';
import type { AsciiRenderOptions, RenderOptions } from 'beautiful-mermaid';

/**
 * Lazy-load beautiful-mermaid to support both ESM/CJS builds.
 */
type BeautifulMermaidModule = {
  renderMermaid: (text: string, options?: RenderOptions) => Promise<string>;
  renderMermaidAscii: (text: string, options?: AsciiRenderOptions) => string;
};

let cachedModule: BeautifulMermaidModule | undefined;
let modulePromise: Promise<BeautifulMermaidModule> | undefined;

const loadBeautifulMermaid = async (): Promise<BeautifulMermaidModule> => {
  if (cachedModule) {
    return cachedModule;
  }

  if (!modulePromise) {
    modulePromise = import('beautiful-mermaid').then((mod) => {
      const resolved =
        typeof (mod as BeautifulMermaidModule).renderMermaid === 'function'
          ? (mod as BeautifulMermaidModule)
          : ((mod as { default?: BeautifulMermaidModule }).default ?? mod);
      return resolved as BeautifulMermaidModule;
    });
  }

  cachedModule = await modulePromise;
  return cachedModule;
};

const renderFallbackCodeBlock = (content: string): string => {
  return `<pre><code class="language-mermaid">${escapeHtml(content)}</code></pre>`;
};

const resolveAsciiOptions = (
  options?: AsciiRenderOptions
): AsciiRenderOptions => {
  return {
    ...options,
    useAscii: options?.useAscii ?? false,
  };
};

/**
 * Create a beautiful-mermaid plugin instance for rendering Mermaid diagrams.
 * This plugin uses beautiful-mermaid to generate SVG/ASCII outputs directly.
 */
export const createBeautifulMermaidPlugin = (
  options: BeautifulMermaidPluginOptions = {}
): MarkdownProcessorPlugin => {
  const {
    output = 'svg',
    classPrefix = 'beautiful-mermaid',
    includeId = true,
    svgOptions,
    asciiOptions,
  } = options;

  const wrapperClass = `${classPrefix}-wrapper`;
  const svgClass = `${classPrefix}-svg`;
  const asciiClass = `${classPrefix}-ascii`;
  const codeClass = `${classPrefix}-code`;

  const processBlock = async (
    content: string,
    context: MarkdownProcessorPluginContext
  ): Promise<string> => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      context.logger.warn('Beautiful Mermaid plugin received empty content');
      return renderFallbackCodeBlock(content);
    }

    const idAttribute = includeId ? ` id="${context.getUniqueId()}"` : '';

    try {
      const module = await loadBeautifulMermaid();

      if (output === 'ascii') {
        const ascii = module.renderMermaidAscii(
          trimmedContent,
          resolveAsciiOptions(asciiOptions)
        );
        const escapedAscii = escapeHtml(ascii);
        return `<pre class="${wrapperClass} ${asciiClass}"${idAttribute}><code class="${codeClass}">${escapedAscii}</code></pre>`;
      }

      const svg = await module.renderMermaid(trimmedContent, svgOptions);
      return `<div class="${wrapperClass} ${svgClass}"${idAttribute}>${svg}</div>`;
    } catch (error) {
      context.logger.warn(
        'Beautiful Mermaid plugin failed to render diagram:',
        error
      );
      return renderFallbackCodeBlock(content);
    }
  };

  return {
    name: 'mermaid',
    processBlock,
  };
};
