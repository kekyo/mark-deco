// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { AsciiRenderOptions, RenderOptions } from 'beautiful-mermaid';

/**
 * Output formats for the beautiful-mermaid plugin
 */
export type BeautifulMermaidOutput = 'svg' | 'ascii';

/**
 * Options for configuring the beautiful-mermaid plugin
 */
export interface BeautifulMermaidPluginOptions {
  /** Output format for diagrams (default: 'svg') */
  output?: BeautifulMermaidOutput;
  /** CSS class prefix for wrapper and format elements (default: 'beautiful-mermaid') */
  classPrefix?: string;
  /** Whether to include ID attributes for containers (default: true) */
  includeId?: boolean;
  /** Render options forwarded to beautiful-mermaid SVG renderer */
  svgOptions?: RenderOptions;
  /** Render options forwarded to beautiful-mermaid ASCII renderer */
  asciiOptions?: AsciiRenderOptions;
}
