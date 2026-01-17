// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import * as cheerio from 'cheerio';
import { isBrowser, isCORSError } from '../../utils';
import { extractEnhancedData, resolveUrl } from './utils';
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
    const response = await fetcher.rawFetcher(url, 'text/html', signal, logger);
    const htmlContent = await response.text();

    logger.info('fetchMetadata: Successfully fetched HTML content');

    // Parse metadata from HTML using rule-based system
    const $ = cheerio.load(htmlContent);
    const postFilterUrl = resolvePostFilterUrl($, url, response.url);
    const metadata = extractEnhancedData(
      $,
      url,
      options.scrapingRules,
      logger,
      postFilterUrl
    );

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

const resolvePostFilterUrl = (
  $: ReturnType<typeof cheerio.load>,
  originalUrl: string,
  responseUrl?: string
): string | undefined => {
  const trimmedResponseUrl = responseUrl?.trim();
  if (trimmedResponseUrl) {
    return trimmedResponseUrl;
  }

  const ogUrl = $('meta[property="og:url"]').attr('content')?.trim();
  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim();
  const twitterUrl = $('meta[name="twitter:url"]').attr('content')?.trim();
  const candidate = ogUrl || canonicalUrl || twitterUrl;
  if (!candidate) {
    return undefined;
  }
  return resolveUrl(candidate, originalUrl);
};
