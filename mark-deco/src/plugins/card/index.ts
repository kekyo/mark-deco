import { formatErrorInfo } from '../shared/error-formatter.js';
import { fetchMetadata } from './fetcher.js';
import { generateCardHtml, generateFallbackHtml } from './html-generator.js';
import { isValidUrl } from './utils.js';
import type { CardPluginOptions } from './types.js';
import type { Plugin, PluginContext } from '../../types.js';

// Export Amazon rules for explicit usage
export { amazonRules } from './amazon-rules.js';

/**
 * Create a card plugin instance for generating content cards from URLs
 * @param options - Configuration options for the card plugin
 * @returns Plugin instance for processing card blocks
 */
export const createCardPlugin = (options: CardPluginOptions = {}): Plugin => {

  /**
   * Main plugin interface implementation
   */
  const processBlock = async (content: string, context: PluginContext): Promise<string> => {
    const url = content.trim();

    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    try {
      const metadata = await fetchMetadata(url, options, context);
      return generateCardHtml(metadata, url, options);
    } catch (error) {
      context.logger.warn('Card plugin fetch failed for URL:', url, error);

      // Use the new consistent error formatting
      const errorInfo = formatErrorInfo(error);

      // Return fallback HTML instead of throwing in browser environment
      if (typeof window !== 'undefined') {
        return generateFallbackHtml(url, errorInfo);
      }

      // In Node.js environment, return fallback HTML for all errors
      return generateFallbackHtml(url, errorInfo);
    }
  };

  return {
    name: 'card',
    processBlock
  };
};
