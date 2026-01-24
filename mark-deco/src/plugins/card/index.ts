// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { formatErrorInfo } from '../shared/error-formatter';
import { fetchMetadata } from './fetcher';
import { generateCardHtml, generateFallbackHtml } from './html-generator';
import { isValidUrl } from './utils';
import type { CardPluginOptions } from './types';
import type {
  MarkdownProcessorPlugin,
  MarkdownProcessorPluginContext,
} from '../../types';
import { isBrowser } from '../../utils';

// Export Amazon rules for explicit usage
export { amazonRules } from './amazon-rules';

/**
 * Create a card plugin instance for generating content cards from URLs
 * @param options - Configuration options for the card plugin
 * @returns Plugin instance for processing card blocks
 */
export const createCardPlugin = (
  options: CardPluginOptions = {}
): MarkdownProcessorPlugin => {
  /**
   * Main plugin interface implementation
   */
  const processBlock = async (
    content: string,
    context: MarkdownProcessorPluginContext
  ): Promise<string> => {
    const url = content.trim();

    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    if (options.oembedFallback) {
      try {
        const oembedHtml = await options.oembedFallback.render(url, context);
        if (typeof oembedHtml === 'string') {
          return oembedHtml;
        }
      } catch (error) {
        context.logger.warn(
          'Card plugin oEmbed fallback failed for URL:',
          url,
          error
        );
      }
    }

    try {
      const metadata = await fetchMetadata(url, options, context);
      return generateCardHtml(metadata, url, options);
    } catch (error) {
      context.logger.warn('Card plugin fetch failed for URL:', url, error);

      // Use the new consistent error formatting
      const errorInfo = formatErrorInfo(error);

      // Return fallback HTML instead of throwing in browser environment
      if (isBrowser()) {
        return generateFallbackHtml(url, errorInfo);
      }

      // In Node.js environment, return fallback HTML for all errors
      return generateFallbackHtml(url, errorInfo);
    }
  };

  return {
    name: 'card',
    processBlock,
  };
};
