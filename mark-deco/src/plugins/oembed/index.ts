// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { formatErrorInfo } from '../shared/error-formatter';
import { fetchOEmbedData } from './fetcher';
import { generateHtml, generateFallbackHtml } from './html-generator';
import { isValidUrl } from './utils';
import type { OEmbedPluginOptions, OEmbedProvider } from './types';
import type {
  MarkdownProcessorPlugin,
  MarkdownProcessorPluginContext,
} from '../../types';
import { isBrowser } from '../../utils';

/**
 * Create an oEmbed plugin instance for embedding rich content from supported providers
 * @param providerList - List of oEmbed providers to use
 * @param options - Configuration options for the oEmbed plugin
 * @returns Plugin instance for processing oEmbed blocks
 */
export const createOEmbedPlugin = (
  providerList: OEmbedProvider[],
  options: OEmbedPluginOptions = {}
): MarkdownProcessorPlugin => {
  const { maxRedirects = 5, timeoutEachRedirect = 10000 } = options;

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
      if (isBrowser()) {
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
