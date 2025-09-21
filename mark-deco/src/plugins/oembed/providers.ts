import { fetchText, isCORSError } from '../../utils.js';
import downloadedProvidersJson from './providers.json' with { type: 'json' };
import type { OEmbedProvider } from './types.js';
import type { PluginContext } from '../../types.js';

/**
 * Default providers from downloaded providers.json
 * Downloaded from https://oembed.com/providers.json
 *
 * Export this if you want to use the built-in provider list,
 * or provide your own custom providers to buildProvidersCache.
 */
export const defaultProviderList: OEmbedProvider[] = downloadedProvidersJson as OEmbedProvider[];

/**
 * Decode HTML entities in a string
 * @param str - String containing HTML entities
 * @returns Decoded string with entities replaced
 */
const decodeHtmlEntities = (str: string): string => {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x3D;': '=',
    '&#x2F;': '/',
    '&#x60;': '`'
  };

  return str.replace(/&(?:amp|lt|gt|quot|#x27|#x3D|#x2F|#x60);/g, (match) => entities[match] || match);
};

/**
 * Check if URL matches a scheme pattern
 * @param url - URL to check
 * @param scheme - Scheme pattern to match against
 * @returns True if URL matches the scheme pattern
 */
const matchesScheme = (url: string, scheme: string): boolean => {
  // Convert scheme to regex pattern
  const regexPattern = scheme
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\*/g, '.*')   // * matches anything including slash
    .replace(/\?\*$/, '.*'); // Handle query parameters

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(url);
};

/**
 * Build a cache mapping schemes to oEmbed endpoints
 * @param param0 - Plugin context containing logger
 * @param providers - List of oEmbed providers
 * @returns Promise resolving to a Map of schemes to endpoint URLs
 */
export const buildProvidersCache = async (
  { logger }: PluginContext,
  providers: OEmbedProvider[]
): Promise<Map<string, string>> => {
  const cache = new Map<string, string>();

  logger.info('buildProvidersCache: Using providers, length=' + providers.length);

  for (const provider of providers) {
    for (const endpoint of provider.endpoints) {
      if (endpoint.schemes) {
        for (const scheme of endpoint.schemes) {
          const cacheKey = scheme.toLowerCase();
          cache.set(cacheKey, endpoint.url);
        }
      }
    }
  }

  logger.info('buildProvidersCache: Built cache with', cache.size, 'entries');
  return cache;
};

/**
 * Find oEmbed endpoint URL for a given content URL
 * @param url - Content URL to find oEmbed endpoint for
 * @param providersCache - Cache of provider schemes to endpoints
 * @param param2 - Plugin context containing logger, signal, and fetcher
 * @returns Promise resolving to the oEmbed endpoint URL
 */
export const getOEmbedUrl = async (
  url: string,
  providersCache: Map<string, string>,
  { logger, signal, fetcher }: PluginContext
): Promise<string> => {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();

  // Try to find matching provider endpoint by checking schemes
  for (const [scheme, endpointUrl] of providersCache.entries()) {
    if (matchesScheme(url, scheme)) {
      const oembedUrl = new URL(endpointUrl);
      oembedUrl.searchParams.set('url', url);
      oembedUrl.searchParams.set('format', 'json');

      logger.info('getOEmbedUrl: Found matching endpoint for', hostname, ':', endpointUrl);
      return oembedUrl.toString();
    }
  }

  // If no provider found, try oEmbed discovery
  logger.info('getOEmbedUrl: No provider found for', hostname, ', attempting discovery');

  try {
    const html = await fetchText(fetcher, url, 'text/html', signal, logger);

    // Look for oEmbed discovery links
    const oembedLinkMatch = html.match(/<link[^>]*type=['"]application\/json\+oembed['"][^>]*>/i);
    if (oembedLinkMatch) {
      const hrefMatch = oembedLinkMatch[0].match(/href=['"]([^'"]+)['"]/i);
      if (hrefMatch && hrefMatch[1]) {
        const rawUrl = hrefMatch[1];
        // Decode HTML entities in the discovered URL
        const decodedUrl = decodeHtmlEntities(rawUrl);
        const discoveredUrl = new URL(decodedUrl, url).toString();
        logger.info('getOEmbedUrl: Discovered oEmbed endpoint:', discoveredUrl);
        return discoveredUrl;
      }
    }
  } catch (error) {
    if (isCORSError(error)) {
      logger.debug('getOEmbedUrl: Discovery blocked by CORS restrictions for', url);
    } else {
      logger.warn('getOEmbedUrl: Discovery failed for', url, ':', error);
    }
  }

  throw new Error(`No oEmbed provider found for URL: ${url}`);
};
