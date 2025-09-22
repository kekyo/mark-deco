// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

/**
 * Options for configuring the mermaid plugin
 */
export interface MermaidPluginOptions {
  /** Custom CSS class name for the mermaid container (default: 'mermaid') */
  className?: string;
  /** Whether to include ID attributes for containers (default: true) */
  includeId?: boolean;
}
