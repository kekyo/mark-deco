// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import * as cheerio from 'cheerio';
import { ogpRules } from './ogp-rules.js';
import { findMatchingRule, applyScrapingRule } from './rule-engine.js';
import type { ExtractedMetadata, ScrapingRule } from './types.js';
import type { Logger } from '../../types.js';

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Escape HTML characters
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
};

/**
 * Extract domain from URL
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
};

/**
 * Resolve relative URLs to absolute URLs
 */
export const resolveUrl = (url: string, baseUrl: string): string => {
  try {
    // If it's already an absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If it starts with //, add protocol
    if (url.startsWith('//')) {
      const baseUrlObj = new URL(baseUrl);
      return `${baseUrlObj.protocol}${url}`;
    }

    // Resolve relative URL
    return new URL(url, baseUrl).toString();
  } catch {
    return url; // Return original if resolution fails
  }
};

/**
 * Truncate text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Clean and normalize text content
 */
export const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .replace(/[\r\n]/g, ' '); // Remove line breaks
};

/**
 * Build rule set from custom rules and OGP fallback
 * OGP rules are always appended as fallback
 */
const buildRuleSet = (customRules: ScrapingRule[] = []): ScrapingRule[] => [
  ...customRules,
  ...ogpRules, // OGP rules as fallback
];

/**
 * Extract enhanced scraping data for supported sites using rule engine
 */
export const extractEnhancedData = (
  $: ReturnType<typeof cheerio.load>,
  sourceUrl: string,
  customRules?: ScrapingRule[],
  logger?: Logger
): ExtractedMetadata | null => {
  const rules = buildRuleSet(customRules);

  logger?.debug('extractEnhancedData: Starting rule matching process', {
    url: sourceUrl,
    totalRules: rules.length,
    customRulesCount: customRules?.length || 0,
    ogpRulesCount: ogpRules.length,
  });

  const matchingRule = findMatchingRule(rules, sourceUrl, logger);

  if (matchingRule) {
    logger?.debug('extractEnhancedData: Found matching rule', {
      pattern: matchingRule.pattern,
      siteName: matchingRule.siteName,
      fieldsToExtract: Object.keys(matchingRule.fields),
    });

    const result = applyScrapingRule(matchingRule, $, sourceUrl, logger);

    logger?.debug('extractEnhancedData: Rule application completed', {
      extractedFields: Object.keys(result),
      successfulFieldsCount: Object.keys(result).length,
    });

    return result;
  }

  logger?.debug(
    'extractEnhancedData: No matching rule found for URL:',
    sourceUrl
  );
  return null;
};
