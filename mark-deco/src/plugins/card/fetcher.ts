// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import * as cheerio from 'cheerio';
import { fetchText, isBrowser, isCORSError } from '../../utils';
import { extractEnhancedData } from './utils';
import type { CardPluginOptions, ExtractedMetadata } from './types';
import type { MarkdownProcessorPluginContext } from '../../types';

/**
 * Fetch HTML content and extract metadata using rule-based system
 */
export const fetchMetadata = async (
  url: string,
  options: CardPluginOptions,
  context: MarkdownProcessorPluginContext
): Promise<ExtractedMetadata> => {
  const { logger, signal, fetcher } = context;

  logger.info('fetchMetadata: Starting metadata extraction for URL:', url);

  try {
    // Fetch HTML content directly using the fetchText utility
    const htmlContent = await fetchText(
      fetcher,
      url,
      'text/html',
      signal,
      logger
    );

    logger.info('fetchMetadata: Successfully fetched HTML content');

    // Parse metadata from HTML using rule-based system
    const $ = cheerio.load(htmlContent);
    const metadata = extractEnhancedData($, url, options.scrapingRules, logger);

    if (metadata === null || Object.keys(metadata).length === 0) {
      // Return minimal metadata if no rules matched
      const domain = new URL(url).hostname.replace(/^www\./, '');
      logger.debug(
        'fetchMetadata: No metadata extracted, returning minimal fallback metadata'
      );
      return {
        siteName: domain,
        url: url,
      };
    }

    logger.debug('fetchMetadata: Successfully extracted metadata:', {
      url,
      extractedFields: Object.keys(metadata),
      fieldCount: Object.keys(metadata).length,
    });

    return metadata;
  } catch (error: unknown) {
    if (isCORSError(error)) {
      if (isBrowser()) {
        logger.debug(
          'fetchMetadata: Browser CORS restrictions prevent fetching metadata for URL:',
          url
        );
      } else {
        logger.warn(
          'fetchMetadata: CORS error fetching metadata for URL:',
          url,
          error
        );
      }
    } else {
      logger.warn(
        'fetchMetadata: Error fetching or parsing metadata for URL:',
        url,
        error
      );
    }

    // Re-throw the original error
    throw error;
  }
};
