// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { MermaidPluginOptions } from './types';
import type {
  MarkdownProcessorPlugin,
  MarkdownProcessorPluginContext,
} from '../../types';

/**
 * Create a mermaid plugin instance for rendering mermaid diagrams
 * @param options - Configuration options for the mermaid plugin
 * @returns Plugin instance for processing mermaid blocks
 */
export const createMermaidPlugin = (
  options: MermaidPluginOptions = {}
): MarkdownProcessorPlugin => {
  const { className = 'mermaid', includeId = true } = options;

  /**
   * Process mermaid code block content
   */
  const processBlock = async (
    content: string,
    context: MarkdownProcessorPluginContext
  ): Promise<string> => {
    // Trim whitespace from content
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      context.logger.warn('Mermaid plugin received empty content');
      // Use the same wrapper structure for consistency, even for empty content
      const idAttribute = includeId ? ` id="${context.getUniqueId()}"` : '';
      return `<div class="${className}-wrapper">
  <style>
    .${className}-wrapper .${className} > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="${className}"${idAttribute}><!-- Empty mermaid content --></div>
</div>`;
    }

    // Generate unique ID if requested
    const idAttribute = includeId ? ` id="${context.getUniqueId()}"` : '';

    // HTML escape the content to prevent XSS and ensure proper rendering
    // Mermaid.js correctly handles HTML entities like &lt; &gt; &amp; &quot;
    // This is safe because mermaid.js documentation explicitly supports HTML entities
    const escapedContent = trimmedContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Create the HTML structure that mermaid.js expects
    // mermaid.js looks for elements with class "mermaid" and renders the text content as diagram
    // Wrap with responsive container to override SVG size constraints
    const html = `<div class="${className}-wrapper">
  <style>
    .${className}-wrapper .${className} > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="${className}"${idAttribute}>${escapedContent}</div>
</div>`;

    context.logger.debug('Mermaid plugin processed content:', {
      contentLength: trimmedContent.length,
      className,
      includeId,
    });

    return html;
  };

  return {
    name: 'mermaid',
    processBlock,
  };
};
