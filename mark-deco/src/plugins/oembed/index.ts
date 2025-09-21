import { formatErrorInfo } from '../shared/error-formatter.js';
import { fetchOEmbedData } from './fetcher.js';
import { generateHtml, generateFallbackHtml } from './html-generator.js';
import { isValidUrl } from './utils.js';
import type { OEmbedPluginOptions, OEmbedProvider } from './types.js';
import type { Plugin, PluginContext } from '../../types.js';

/**
 * Create an oEmbed plugin instance for embedding rich content from supported providers
 * @param providerList - List of oEmbed providers to use
 * @param options - Configuration options for the oEmbed plugin
 * @returns Plugin instance for processing oEmbed blocks
 */
export const createOEmbedPlugin = (
  providerList: OEmbedProvider[],
  options: OEmbedPluginOptions = {}
): Plugin => {
  const { maxRedirects = 5, timeoutEachRedirect = 10000 } = options;

  /**
   * Main plugin interface implementation
   */
  const processBlock = async (
    content: string,
    context: PluginContext
  ): Promise<string> => {
    const url = content.trim();

    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    try {
      const oembedData = await fetchOEmbedData(
        url,
        maxRedirects,
        timeoutEachRedirect,
        context,
        providerList
      );
      return generateHtml(oembedData, url, options);
    } catch (error) {
      context.logger.warn('oEmbed fetch failed for URL:', url, error);

      // Use the new consistent error formatting
      const errorInfo = formatErrorInfo(error);

      // Return fallback HTML instead of throwing in browser environment
      if (typeof window !== 'undefined') {
        return generateFallbackHtml(url, errorInfo);
      }

      // In Node.js environment, return fallback HTML for unsupported providers
      return generateFallbackHtml(url, errorInfo);
    }
  };

  return {
    name: 'oembed',
    processBlock,
  };
};
