// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { AsciiRenderOptions, RenderOptions } from 'beautiful-mermaid';
import type { CodeHighlightTheme, CodeHighlightThemeConfig } from '../../types';

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
  /** Theme name, theme registration, or theme pair for light/dark (Shiki-compatible) */
  theme?: CodeHighlightTheme | CodeHighlightThemeConfig;
  /** Theme mode selection (default: 'auto') */
  themeMode?: 'auto' | 'light' | 'dark';
  /** Theme application strategy (default: auto => 'css-vars', otherwise 'inline') */
  themeStrategy?: 'inline' | 'css-vars';
  /** CSS variable prefix for theme strategy 'css-vars' (default: '--mdc-bm') */
  cssVarPrefix?: string;
}
