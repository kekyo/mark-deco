// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { fetchJson, isBrowser, isCORSError } from '../../utils';
import { getOEmbedUrl, buildProvidersCache } from './providers';
import { resolveRedirects } from './redirect-resolver';
import type { OEmbedResponse, OEmbedProvider } from './types';
import type { MarkdownProcessorPluginContext } from '../../types';

/**
 * Custom error class to indicate CORS failure
 */
export class CORSError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CORSError';
  }
}

/**
 * Fetch oEmbed data from provider
 */
export const fetchOEmbedData = async (
  url: string,
  maxRedirects: number,
  timeoutEachRedirect: number,
  context: MarkdownProcessorPluginContext,
  providers: OEmbedProvider[]
): Promise<OEmbedResponse> => {
  const { logger, signal, fetcher } = context;

  logger.info('fetchOEmbedData: Starting for URL:', url);

  try {
    // Resolve redirects to get the final URL
    const finalUrl = await resolveRedirects(
      url,
      maxRedirects,
      timeoutEachRedirect,
      fetcher.userAgent,
      logger,
      signal
    );
    logger.info(
      'fetchOEmbedData: Final URL after redirect resolution:',
      finalUrl
    );

    // Build providers cache
    const providersCache = await buildProvidersCache(context, providers);

    const oembedUrl = await getOEmbedUrl(finalUrl, providersCache, context);
    logger.info('fetchOEmbedData: oEmbed API URL:', oembedUrl);

    const data = await fetchJson<OEmbedResponse>(
      fetcher,
      oembedUrl,
      signal,
      logger
    );
    logger.info('fetchOEmbedData: Parsed JSON data:', data);

    // Add web_page if not provided
    if (!data.web_page) {
      data.web_page = finalUrl;
    }

    return data;
  } catch (error: unknown) {
    // Check if this is a CORS error and wrap it appropriately
    if (isCORSError(error)) {
      if (isBrowser()) {
        logger.debug(
          'fetchOEmbedData: Browser CORS restrictions block oEmbed API access for URL:',
          url
        );
      } else {
        logger.warn(
          'fetchOEmbedData: CORS error detected for URL:',
          url,
          error
        );
      }
      throw new CORSError(
        `CORS restrictions prevent accessing oEmbed data for ${url}`
      );
    }

    // Re-throw other errors as-is
    throw error;
  }
};
