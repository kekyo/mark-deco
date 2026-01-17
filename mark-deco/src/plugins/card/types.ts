// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

/**
 * Card plugin display fields configuration
 *
 * Maps field names to their display order (lower numbers appear first).
 * Fields with undefined order are not displayed.
 * Fields not defined in this config but present in metadata will be
 * displayed after all defined fields in an unstable order.
 */
export type CardPluginDisplayFields = Record<string, number>;

/**
 * Card plugin options
 */
export interface CardPluginOptions {
  /** Whether to use metadata URL (from fetched/canonical URL) for links instead of provided URL (default: false) */
  useMetadataUrlLink?: boolean;
  /** Control which metadata fields to display in the generated HTML */
  displayFields?: CardPluginDisplayFields;
  /** Custom scraping rules to apply before OGP fallback rules (OGP rules are always appended) */
  scrapingRules?: ScrapingRule[];
}

/**
 * Rule-based scraping system types
 */

/**
 * Processor context passed to processor functions
 */
export interface ProcessorContext {
  /** Cheerio instance for the current page */
  $: ReturnType<typeof import('cheerio').load>;
  /** Cheerio instance for the HTML head section */
  $head: ReturnType<typeof import('cheerio').load>;
  /** Current URL being processed */
  url: string;
  /** Locale information (from rule or extracted from META tags) */
  locale?: string;
}

/**
 * Declarative processor rule for common transformations
 */
export interface ProcessorRule {
  /** Type of processing to apply */
  type: 'regex' | 'filter' | 'slice' | 'first' | 'currency';
  /** Parameters for the processor */
  params?: any;
}

/**
 * Function-based processor for complex logic
 */
export interface ProcessorFunction {
  (values: string[], context: ProcessorContext): string | string[] | undefined;
}

/**
 * Processor can be either a rule or a function
 */
export type Processor = ProcessorRule | ProcessorFunction;

/**
 * Field extraction rule
 */
export interface FieldRule {
  /** CSS selector(s) to extract data */
  selector: string | string[];
  /** Extraction method */
  method?: 'text' | 'attr' | 'html';
  /** Attribute name for 'attr' method */
  attr?: string;
  /** Whether to extract multiple elements */
  multiple?: boolean;
  /** Post-processing logic */
  processor?: Processor;
}

/**
 * Field configuration with multiple extraction strategies
 */
export interface FieldConfig {
  /** Whether this field is required for the rule to be considered successful */
  required?: boolean;
  /** Array of extraction rules to try in order (first successful match is used) */
  rules: FieldRule[];
}

/**
 * Site-specific scraping rule
 */
export interface ScrapingRule {
  /** Regex patterns to match URLs */
  patterns: string[];
  /** Regex patterns to match the post-redirect URL */
  postFilters?: string[];
  /** Locale/region identifier (optional, if not specified, extracted from META tags) */
  locale?: string;
  /** Site name (automatically added to metadata as 'siteName') */
  siteName?: string;
  /** Field extraction configurations */
  fields: {
    [key: string]: FieldConfig;
  };
}

/**
 * Extracted metadata result
 */
export type ExtractedMetadata = Record<string, string | string[]>;
