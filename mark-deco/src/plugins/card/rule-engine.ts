// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import * as cheerio from 'cheerio';
import type {
  ScrapingRule,
  FieldRule,
  Processor,
  ProcessorRule,
  ProcessorFunction,
  ProcessorContext,
  ExtractedMetadata,
} from './types';
import type { Logger } from '../../types';

/**
 * Extract locale from HTML meta tags
 */
const extractLocaleFromHTML = (
  $: ReturnType<typeof import('cheerio').load>
): string | undefined => {
  // <html lang="ja">
  const htmlLang = $('html').attr('lang');
  if (htmlLang) return htmlLang;

  // <meta http-equiv="content-language" content="ja-JP">
  const metaLang = $('meta[http-equiv="content-language"]').attr('content');
  if (metaLang) return metaLang;

  // <meta name="language" content="ja">
  const languageMeta = $('meta[name="language"]').attr('content');
  if (languageMeta) return languageMeta;

  return undefined;
};

const normalizePatternList = (value?: string[]): string[] => {
  if (!value) return [];
  return value.map((pattern) => pattern.trim()).filter(Boolean);
};

const getRulePatterns = (rule: ScrapingRule): string[] => {
  return normalizePatternList(rule.patterns);
};

const getRulePostFilters = (rule: ScrapingRule): string[] => {
  return normalizePatternList(rule.postFilters);
};

/**
 * Built-in processor rules
 */
const executeProcessorRule = (
  rule: ProcessorRule,
  values: string[],
  _context: ProcessorContext
): string | string[] | undefined => {
  const params = rule.params || {};

  switch (rule.type) {
    case 'regex': {
      const replace = params.replace as any;
      const match = params.match as any;
      if (replace) {
        return values
          .map((value) => {
            let result = value;
            for (const r of Array.isArray(replace) ? replace : [replace]) {
              result = result.replace(
                new RegExp(r.pattern, r.flags || 'g'),
                r.replacement || ''
              );
            }
            return result.trim();
          })
          .filter(Boolean);
      }
      if (match) {
        const regex = new RegExp(match.pattern, match.flags || '');
        return values
          .map((value) => {
            const matches = value.match(regex);
            return matches?.[match.group || 0] || '';
          })
          .filter(Boolean);
      }
      return values;
    }

    case 'filter': {
      const contains = params.contains as string;
      const excludeContains = params.excludeContains as string | string[];
      const minLength = params.minLength as number;
      const maxLength = params.maxLength as number;
      return values.filter((value) => {
        if (minLength && value.length < minLength) return false;
        if (maxLength && value.length > maxLength) return false;
        if (contains && !value.includes(contains)) return false;
        if (excludeContains) {
          for (const exclude of Array.isArray(excludeContains)
            ? excludeContains
            : [excludeContains]) {
            if (value.includes(exclude)) return false;
          }
        }
        return true;
      });
    }

    case 'slice': {
      const start = (params.start as number) || 0;
      const end = params.end as number;
      return values.slice(start, end);
    }

    case 'first': {
      return values.length > 0 ? values[0] : undefined;
    }

    case 'currency': {
      const symbol = (params.symbol as string) || '$';
      const locale = (params.locale as string) || 'en-US';
      return values
        .map((value) => {
          const numbers = value.match(/[\d,\.]+/g);
          if (numbers && numbers.length > 0) {
            const cleanPrice = numbers[0].replace(/,/g, '');
            if (/^\d+(\.\d+)?$/.test(cleanPrice)) {
              const amount = parseFloat(cleanPrice);
              // Use simple formatting for consistent test results
              if (locale === 'de-DE') {
                return `${symbol}${amount.toLocaleString('de-DE')}`;
              } else {
                return `${symbol}${amount.toLocaleString('en-US')}`;
              }
            }
          }
          return value;
        })
        .filter(Boolean);
    }

    default:
      return values;
  }
};

/**
 * Execute a processor (rule or function)
 */
const executeProcessor = (
  processor: Processor,
  values: string[],
  context: ProcessorContext
): string | string[] | undefined => {
  if (typeof processor === 'function') {
    return (processor as ProcessorFunction)(values, context);
  } else {
    return executeProcessorRule(processor as ProcessorRule, values, context);
  }
};

/**
 * Extract field data based on field rule
 */
const extractField = (
  rule: FieldRule,
  $: ReturnType<typeof cheerio.load>,
  context: ProcessorContext,
  logger?: Logger
): string | string[] | undefined => {
  const selectors = Array.isArray(rule.selector)
    ? rule.selector
    : [rule.selector];
  const method = rule.method || 'text';
  let values: string[] = [];

  logger?.debug('extractField: Attempting field extraction', {
    selectors,
    method,
    attr: rule.attr,
    multiple: rule.multiple,
  });

  // Extract values using selectors
  for (const selector of selectors) {
    const elements = $(selector);
    logger?.debug(
      `extractField: Found ${elements.length} elements for selector "${selector}"`
    );

    elements.each((_, elem) => {
      let value: string;
      switch (method) {
        case 'attr':
          value = $(elem).attr(rule.attr || 'href') || '';
          break;
        case 'html':
          value = $(elem).html() || '';
          break;
        case 'text':
        default:
          value = $(elem).text().trim();
          break;
      }
      if (value) {
        values.push(value);
      }
    });

    // If not extracting multiple and we have values, break early
    if (!rule.multiple && values.length > 0) {
      break;
    }
  }

  logger?.debug('extractField: Raw extraction results', {
    valuesCount: values.length,
    hasProcessor: !!rule.processor,
  });

  // Apply processor if specified
  if (rule.processor && values.length > 0) {
    logger?.debug('extractField: Applying processor to extracted values');
    const processed = executeProcessor(rule.processor, values, context);
    if (processed !== undefined) {
      // If processor returns a single value and we're not in multiple mode, use it directly
      if (!rule.multiple && !Array.isArray(processed)) {
        logger?.debug('extractField: Processor returned single value');
        return processed;
      }
      values = Array.isArray(processed) ? processed : [processed];
      logger?.debug('extractField: Processor applied successfully', {
        processedValuesCount: values.length,
      });
    }
  }

  // Return result based on multiple flag
  if (rule.multiple) {
    const result = values.length > 0 ? values : undefined;
    logger?.debug('extractField: Multiple mode result', {
      resultCount: result?.length || 0,
    });
    return result;
  } else {
    const result = values.length > 0 ? values[0] : undefined;
    logger?.debug('extractField: Single mode result', { hasResult: !!result });
    return result;
  }
};

/**
 * Extract field data using multiple rules (try in order until one succeeds)
 */
const extractFieldWithRules = (
  rules: FieldRule[],
  $: ReturnType<typeof cheerio.load>,
  context: ProcessorContext,
  fieldName: string,
  logger?: Logger
): string | string[] | undefined => {
  logger?.debug(
    `extractFieldWithRules: Trying ${rules.length} rules for field "${fieldName}"`
  );

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule) continue;

    logger?.debug(
      `extractFieldWithRules: Attempting rule ${i + 1}/${rules.length} for field "${fieldName}"`
    );

    const value = extractField(rule, $, context, logger);
    if (value !== undefined) {
      logger?.debug(
        `extractFieldWithRules: Successfully extracted field "${fieldName}" using rule ${i + 1}`
      );
      return value;
    } else {
      logger?.debug(
        `extractFieldWithRules: Rule ${i + 1} failed for field "${fieldName}"`
      );
    }
  }

  logger?.debug(
    `extractFieldWithRules: All rules failed for field "${fieldName}"`
  );
  return undefined;
};

/**
 * Apply scraping rule to extract metadata
 */
export const applyScrapingRule = (
  rule: ScrapingRule,
  $: ReturnType<typeof cheerio.load>,
  url: string,
  logger?: Logger
): ExtractedMetadata => {
  const patterns = getRulePatterns(rule);
  const postFilters = getRulePostFilters(rule);

  logger?.debug('applyScrapingRule: Starting metadata extraction', {
    patterns,
    postFilters: postFilters.length > 0 ? postFilters : undefined,
    siteName: rule.siteName,
    fieldsCount: Object.keys(rule.fields).length,
  });

  // Determine locale: rule locale takes precedence, otherwise extract from HTML
  const locale = rule.locale || extractLocaleFromHTML($);
  logger?.debug('applyScrapingRule: Determined locale', { locale });

  // Create head-specific cheerio instance
  const $head = cheerio.load($('head').html() || '');

  const context: ProcessorContext = {
    $,
    $head,
    url,
    ...(locale && { locale }),
  };

  const extractedData: ExtractedMetadata = {};

  // Automatically add siteName if specified in rule
  if (rule.siteName) {
    extractedData.siteName = rule.siteName;
    logger?.debug('applyScrapingRule: Added siteName from rule', {
      siteName: rule.siteName,
    });
  }

  // Extract fields using the new FieldConfig structure
  for (const [fieldName, fieldConfig] of Object.entries(rule.fields)) {
    logger?.debug(`applyScrapingRule: Processing field "${fieldName}"`, {
      isRequired: fieldConfig.required,
      rulesCount: fieldConfig.rules.length,
    });

    const value = extractFieldWithRules(
      fieldConfig.rules,
      $,
      context,
      fieldName,
      logger
    );

    // Check if required field is missing
    if (fieldConfig.required && value === undefined) {
      logger?.debug(
        `applyScrapingRule: Required field "${fieldName}" is missing`
      );
      // For required fields, we could optionally fail the entire rule
      // For now, we continue but note the missing required field
      continue;
    }

    // Only add non-undefined values to metadata
    if (value !== undefined) {
      extractedData[fieldName] = value;
      logger?.debug(
        `applyScrapingRule: Successfully extracted field "${fieldName}"`,
        {
          valueType: Array.isArray(value) ? 'array' : 'string',
          valueLength: Array.isArray(value) ? value.length : value.length,
        }
      );
    } else {
      logger?.debug(
        `applyScrapingRule: Field "${fieldName}" extraction failed`
      );
    }
  }

  logger?.debug('applyScrapingRule: Metadata extraction completed', {
    extractedFieldsCount: Object.keys(extractedData).length,
    extractedFields: Object.keys(extractedData),
  });

  return extractedData;
};

/**
 * Find matching scraping rule for URL
 */
export function findMatchingRule(
  rules: ScrapingRule[],
  url: string,
  logger?: Logger
): ScrapingRule | undefined;
export function findMatchingRule(
  rules: ScrapingRule[],
  url: string,
  postFilterUrl: string | undefined,
  logger?: Logger
): ScrapingRule | undefined;
export function findMatchingRule(
  rules: ScrapingRule[],
  url: string,
  postFilterUrlOrLogger?: string | Logger,
  logger?: Logger
): ScrapingRule | undefined {
  const hasPostFilterUrl = typeof postFilterUrlOrLogger === 'string';
  const postFilterUrl = hasPostFilterUrl ? postFilterUrlOrLogger : undefined;
  const resolvedLogger = hasPostFilterUrl
    ? logger
    : (postFilterUrlOrLogger ?? logger);

  resolvedLogger?.debug('findMatchingRule: Testing rules against URL', {
    url,
    postFilterUrl,
    rulesCount: rules.length,
  });

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule) continue;

    const patterns = getRulePatterns(rule);
    if (patterns.length === 0) {
      resolvedLogger?.debug(`findMatchingRule: Rule ${i + 1}/${rules.length}`, {
        patterns,
        matches: false,
      });
      continue;
    }

    const matchesPattern = patterns.some((pattern) =>
      new RegExp(pattern).test(url)
    );
    const postFilters = getRulePostFilters(rule);
    let matchesPostFilter = true;
    if (postFilters.length > 0) {
      if (!postFilterUrl) {
        matchesPostFilter = false;
      } else {
        matchesPostFilter = postFilters.some((pattern) =>
          new RegExp(pattern).test(postFilterUrl)
        );
      }
    }
    const matches = matchesPattern && matchesPostFilter;

    resolvedLogger?.debug(`findMatchingRule: Rule ${i + 1}/${rules.length}`, {
      patterns,
      postFilters: postFilters.length > 0 ? postFilters : undefined,
      siteName: rule.siteName,
      matches,
      matchesPattern,
      matchesPostFilter,
    });

    if (matches) {
      resolvedLogger?.debug('findMatchingRule: Found matching rule', {
        ruleIndex: i + 1,
        patterns,
        postFilters: postFilters.length > 0 ? postFilters : undefined,
        siteName: rule.siteName,
      });
      return rule;
    }
  }

  resolvedLogger?.debug('findMatchingRule: No matching rule found');
  return undefined;
}
