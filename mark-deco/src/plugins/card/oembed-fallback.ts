// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { CORSError, fetchOEmbedData } from '../oembed/fetcher';
import { generateHtml } from '../oembed/html-generator';
import type { OEmbedPluginOptions, OEmbedProvider } from '../oembed/types';
import type { CardOEmbedFallback } from './types';

const isProviderNotFoundError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    error.message.startsWith('No oEmbed provider found for URL:')
  );
};

/**
 * Create an oEmbed fallback renderer for card blocks
 * @param providerList - List of oEmbed providers to use
 * @param options - Configuration options for oEmbed fetching/rendering
 * @returns Fallback renderer for card plugin
 */
export const createCardOEmbedFallback = (
  providerList: OEmbedProvider[],
  options: OEmbedPluginOptions = {}
): CardOEmbedFallback => {
  const { maxRedirects = 5, timeoutEachRedirect = 10000 } = options;

  return {
    render: async (url, context) => {
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
        if (error instanceof CORSError || isProviderNotFoundError(error)) {
          return undefined;
        }
        throw error;
      }
    },
  };
};
