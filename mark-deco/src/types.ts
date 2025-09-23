// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { HTMLBeautifyOptions } from 'js-beautify';
import type { Options as RemarkGfmOptions } from 'remark-gfm';
import type { PluggableList } from 'unified';

// Re-export HTMLBeautifyOptions for external use
export type { HTMLBeautifyOptions };

// Re-export RemarkGfmOptions for external use
export type { RemarkGfmOptions };

/**
 * Frontmatter data extracted from markdown
 */
export interface FrontmatterData {
  readonly [key: string]: unknown;
}

/**
 * Context supplied to a frontmatter transform callback
 */
export interface FrontmatterTransformContext {
  /** Frontmatter extracted from the original markdown (shared reference) */
  readonly originalFrontmatter: FrontmatterData;
  /** Markdown content body without the frontmatter block */
  readonly markdownContent: string;
  /** Unique ID prefix requested by the caller */
  readonly uniqueIdPrefix: string;
}

/**
 * Result returned from a frontmatter transform callback
 */
export interface FrontmatterTransformResult {
  /** Frontmatter data that will be used for rendering */
  readonly frontmatter: FrontmatterData;
  /** Unique ID prefix applied to generated nodes */
  readonly uniqueIdPrefix: string;
}

/**
 * Function signature for frontmatter transformation
 */
export type FrontmatterTransform = (
  ctx: FrontmatterTransformContext
) => FrontmatterTransformResult | undefined;

/**
 * Heading node (representing a hierarchical structure)
 */
export interface HeadingNode {
  /** Heading levels (1-6) */
  readonly level: number;
  /** Heading text */
  readonly text: string;
  /** Auto-generated ID (for links) */
  readonly id: string;
  /** Child headings (hierarchy) */
  readonly children: HeadingNode[];
}

/**
 * Fetcher interface that encapsulates both fetching function and metadata
 */
export interface FetcherType {
  /** The actual fetcher function */
  readonly rawFetcher: (
    url: string,
    accept: string,
    signal: AbortSignal | undefined,
    logger?: Logger
  ) => Promise<Response>;
  /** User-Agent string used for fetcher HTTP requests */
  readonly userAgent: string;
}

/**
 * Context provided to plugins during processing
 */
export interface PluginContext {
  /** Logger instance for output */
  readonly logger: Logger;
  /** AbortSignal for cancelling the operation */
  readonly signal: AbortSignal | undefined;
  /** Frontmatter data extracted from the markdown */
  readonly frontmatter: FrontmatterData;
  /** Generate unique ID with consistent prefix+counter approach */
  readonly getUniqueId: () => string;
  /** Fetch function for HTTP requests */
  readonly fetcher: FetcherType;
}

/**
 * Plugin interface for processing custom blocks
 */
export interface Plugin {
  /** Unique plugin identifier */
  readonly name: string;

  /**
   * Process a custom code block
   * @param content - The content inside the code block
   * @param context - Plugin context containing logger and signal
   * @returns Promise resolving to HTML string or modified AST node
   */
  readonly processBlock: (
    content: string,
    context: PluginContext
  ) => Promise<string>;
}

/**
 * Options for creating a markdown processor
 */
export interface MarkdownProcessorOptions {
  /** Plugin instances for processing custom blocks */
  plugins?: Plugin[];
  /** Logger instance for customizable logging (automatically defaults to getNoOpLogger if not specified) */
  logger?: Logger;
  /** Fetch function for HTTP requests (required) */
  fetcher: FetcherType;
}

/**
 * For advanced markdown processing configuration
 */
export interface AdvancedOptions {
  /** Whether to allow dangerous HTML in the markdown (default: true) */
  allowDangerousHtml?: boolean;
  /** HTML beautification options (js-beautify HTMLBeautifyOptions) */
  htmlOptions?: HTMLBeautifyOptions;
  /** remark-gfm plugin options */
  gfmOptions?: RemarkGfmOptions;
  /** Additional remark plugins to use (processed before remark-gfm) */
  remarkPlugins?: PluggableList;
  /** Additional rehype plugins to use (processed after rehype-stringify) */
  rehypePlugins?: PluggableList;
}

/**
 * Options for markdown processing
 */
export interface ProcessOptions {
  /** AbortSignal for cancelling the processing */
  signal?: AbortSignal;
  /** Whether to use content string for header ID generation (default: false) */
  useContentStringHeaderId?: boolean;
  /** Whether to use hierarchical numbering for heading IDs (e.g., id-1, id-1-1, id-1-2, id-2) (default: true) */
  useHierarchicalHeadingId?: boolean;
  /** For advanced configuration */
  advancedOptions?: AdvancedOptions;
}

/**
 * Result of markdown processing
 */
export interface ProcessResult {
  /** Generated HTML content */
  readonly html: string;
  /** Extracted frontmatter data */
  readonly frontmatter: FrontmatterData;
  /** Heading node tree (representing a hierarchical structure) */
  readonly headingTree: HeadingNode[];
}

/**
 * Result of markdown processing
 */
export interface ProcessResultWithFrontmatterTransform extends ProcessResult {
  /** Indicates whether frontmatter was modified by the transform */
  readonly changed: boolean;
  /** Compose markdown string using the current frontmatter and content */
  readonly composeMarkdown: () => string;
}

/**
 * Main processor interface
 */
export interface MarkdownProcessor {
  /**
   * Process markdown content
   * @param markdown - Raw markdown content with frontmatter
   * @param uniqueIdPrefix - ID prefix for generating unique IDs within this processing scope
   * @param options - Processing options
   * @returns Promise resolving to processed result
   */
  readonly process: (
    markdown: string,
    uniqueIdPrefix: string,
    options?: ProcessOptions
  ) => Promise<ProcessResult>;
  /**
   * Process markdown content with frontmatter transformation control
   * @param markdown - Raw markdown content with frontmatter
   * @param uniqueIdPrefix - ID prefix for generating unique IDs within this processing scope
   * @param frontmatterTransform - Callback that can mutate or replace frontmatter and override the unique ID prefix
   * @param options - Processing options excluding transform
   * @returns Promise resolving to processed result or undefined when transformation cancels processing
   */
  readonly processWithFrontmatterTransform: (
    markdown: string,
    uniqueIdPrefix: string,
    frontmatterTransform: FrontmatterTransform,
    options?: ProcessOptions
  ) => Promise<ProcessResultWithFrontmatterTransform | undefined>;
}

/**
 * Log levels for the logger interface
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface for customizable logging
 */
export interface Logger {
  readonly debug: (message: string, ...args: unknown[]) => void;
  readonly info: (message: string, ...args: unknown[]) => void;
  readonly warn: (message: string, ...args: unknown[]) => void;
  readonly error: (message: string, ...args: unknown[]) => void;
}
