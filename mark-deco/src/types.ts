// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { HTMLBeautifyOptions } from 'js-beautify';
import type { Options as RemarkGfmOptions } from 'remark-gfm';
import type { LanguageRegistration, ThemeRegistrationRaw } from 'shiki';
import type { PluggableList } from 'unified';

///////////////////////////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////////////////////////

// Re-export HTMLBeautifyOptions for external use
export type { HTMLBeautifyOptions };

// Re-export RemarkGfmOptions for external use
export type { RemarkGfmOptions };

/**
 * Control how the leading base-level heading affects frontmatter.title
 */
export type HeaderTitleTransform = 'extract' | 'extractAndRemove' | 'none';

/**
 * Frontmatter data extracted from markdown
 */
export interface FrontmatterData {
  readonly [key: string]: unknown;
}

/**
 * Context supplied to a frontmatter transform callback
 */
export interface FrontmatterPreTransformContext {
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
  /** How to treat the first base-level heading for `frontmatter.title` (default: extractAndRemove) */
  readonly headerTitleTransform?: HeaderTitleTransform;
}

/**
 * Function signature for frontmatter transformation
 */
export type FrontmatterPreTransform = (
  ctx: FrontmatterPreTransformContext
) => Promise<FrontmatterTransformResult | undefined>;

/**
 * Context supplied to a frontmatter post transform callback
 */
export interface FrontmatterPostTransformContext {
  /** Frontmatter produced after preprocessing */
  readonly frontmatter: FrontmatterData;
  /** Heading structure generated during HTML conversion */
  readonly headingTree: readonly HeadingNode[];
}

/**
 * Function signature for frontmatter post transformation
 */
export type FrontmatterPostTransform = (
  ctx: FrontmatterPostTransformContext
) => Promise<FrontmatterData>;

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

///////////////////////////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////////////////////////

/**
 * Context provided to plugins during processing
 */
export interface MarkdownProcessorPluginContext {
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
export interface MarkdownProcessorPlugin {
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
    context: MarkdownProcessorPluginContext
  ) => Promise<string>;
}

///////////////////////////////////////////////////////////////////////////////////

/**
 * Options for creating a markdown processor
 */
export interface MarkdownProcessorOptions {
  /** Plugin instances for processing custom blocks */
  plugins?: MarkdownProcessorPlugin[];
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
 * Theme config for code highlighting
 */
export type CodeHighlightTheme = string | ThemeRegistrationRaw;

/**
 * Theme config for code highlighting
 */
export interface CodeHighlightThemeConfig {
  /** Theme to use in light mode */
  light?: CodeHighlightTheme;
  /** Theme to use in dark mode */
  dark?: CodeHighlightTheme;
}

/**
 * Options for built-in code highlighting
 */
export interface CodeHighlightOptions {
  /** Custom language definitions to register with Shiki */
  languageDefinitions?: LanguageRegistration[];
  /** Additional language alias mappings */
  languageAliases?: Record<string, string>;
  /** Theme name, theme registration, or theme pair for light/dark */
  theme?: CodeHighlightTheme | CodeHighlightThemeConfig;
  /** Whether to show line numbers for code blocks */
  lineNumbers?: boolean;
  /** Default language for code blocks without an explicit language */
  defaultLanguage?: string;
}

/**
 * Context information for resolveUrl hook
 */
export interface ResolveUrlContext {
  /** Source of the URL */
  readonly kind: 'link' | 'image' | 'definition' | 'html';
  /** HTML tag name (only for raw HTML) */
  readonly tagName?: string;
  /** HTML attribute name (only for raw HTML) */
  readonly attrName?: string;
}

/**
 * Options for markdown processing
 */
export interface ProcessOptions {
  /** AbortSignal for cancelling the processing */
  signal?: AbortSignal;
  /** Base heading level for markdown headings (default: 1) */
  headingBaseLevel?: number;
  /** Whether to use content string for header ID generation (default: false) */
  useContentStringHeaderId?: boolean;
  /** Whether to use hierarchical numbering for heading IDs (e.g., id-1, id-1-1, id-1-2, id-2) (default: true) */
  useHierarchicalHeadingId?: boolean;
  /** How to treat the first base-level heading for `frontmatter.title` (default: extractAndRemove) */
  headerTitleTransform?: HeaderTitleTransform;
  /** Default CSS class name(s) to apply to the parent paragraph of images (space-separated) */
  defaultImageOuterClassName?: string;
  /** Options for built-in code highlighting (enable when provided) */
  codeHighlight?: CodeHighlightOptions;
  /** Optional URL resolver hook for links, images, and raw HTML attributes */
  resolveUrl?: (url: string, context: ResolveUrlContext) => string;
  /** Default target attribute for markdown links */
  linkTarget?: string;
  /** Default rel attribute for markdown links (used when linkTarget is applied) */
  linkRel?: string;
  /** For advanced configuration */
  advancedOptions?: AdvancedOptions;
}

/**
 * Options for markdown processing
 */
export interface ProcessWithFrontmatterTransformOptions {
  /** Callback that can mutate or replace frontmatter and override the unique ID prefix before rendering */
  preTransform: FrontmatterPreTransform;
  /** Callback that can adjust frontmatter after rendering using generated heading information (default: ignore handling) */
  postTransform?: FrontmatterPostTransform;
  /** AbortSignal for cancelling the processing */
  signal?: AbortSignal;
  /** Base heading level for markdown headings (default: 1) */
  headingBaseLevel?: number;
  /** Whether to use content string for header ID generation (default: false) */
  useContentStringHeaderId?: boolean;
  /** Whether to use hierarchical numbering for heading IDs (e.g., id-1, id-1-1, id-1-2, id-2) (default: true) */
  useHierarchicalHeadingId?: boolean;
  /** How to treat the first base-level heading for `frontmatter.title` (default: extractAndRemove) */
  headerTitleTransform?: HeaderTitleTransform;
  /** Default CSS class name(s) to apply to the parent paragraph of images (space-separated) */
  defaultImageOuterClassName?: string;
  /** Options for built-in code highlighting (enable when provided) */
  codeHighlight?: CodeHighlightOptions;
  /** Optional URL resolver hook for links, images, and raw HTML attributes */
  resolveUrl?: (url: string, context: ResolveUrlContext) => string;
  /** Default target attribute for markdown links */
  linkTarget?: string;
  /** Default rel attribute for markdown links (used when linkTarget is applied) */
  linkRel?: string;
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
  readonly headingTree: readonly HeadingNode[];
}

/**
 * Result of markdown processing
 */
export interface ProcessResultWithFrontmatterTransform extends ProcessResult {
  /** Indicates whether frontmatter was modified by the transform */
  readonly changed: boolean;
  /** Compose markdown string using the current frontmatter and content */
  readonly composeMarkdown: () => string;
  /** Unique ID prefix applied during rendering (after any transform override) */
  readonly uniqueIdPrefix: string;
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
   * @param options - Processing options excluding transform
   * @returns Promise resolving to processed result or undefined when transformation cancels processing
   */
  readonly processWithFrontmatterTransform: (
    markdown: string,
    uniqueIdPrefix: string,
    options: ProcessWithFrontmatterTransformOptions
  ) => Promise<ProcessResultWithFrontmatterTransform | undefined>;
}
