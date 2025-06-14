import { createMemoryCacheStorage, generateCacheKey, type CacheStorage } from "./cache/index.js";
import { Logger, type FetcherType } from "./types";
import { fetchData } from './utils.js';

/**
 * Options for cached fetcher
 */
export interface CachedFetcherOptions {
  /** Enable caching (default: true) */
  cache?: boolean;
  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTTL?: number;
  /** Cache failures as well as successes (default: true) */
  cacheFailures?: boolean;
  /** TTL for cached failures in milliseconds (default: 5 minutes) */
  failureCacheTTL?: number;
}

/**
 * Cache entry data structure
 */
interface CacheEntry {
  type: 'success' | 'error';
  data: string;
  error?: {
    message: string;
    status?: number;
  };
  timestamp: number;
}

/**
 * Create a cached fetcher with the specified userAgent and timeout
 * @param userAgent - User-Agent string to use for requests (required)
 * @param timeout - Timeout in milliseconds for requests (default: 60000ms)
 * @param cacheStorage - Custom cache storage instance (optional)
 * @param options - Caching options (optional)
 * @returns FetcherType object that encapsulates the fetcher and userAgent
 */
export const createCachedFetcher = (
  userAgent: string,
  timeout: number = 60000,
  cacheStorage?: CacheStorage,
  options?: CachedFetcherOptions
): FetcherType => {
  const {
    cache = true,
    cacheTTL = 60 * 60 * 1000, // 1 hour default
    cacheFailures = true,
    failureCacheTTL = 5 * 60 * 1000 // 5 minutes default for failures
  } = options || {};

  const finalCacheStorage = cache ? (cacheStorage || createMemoryCacheStorage()) : undefined;

  const fetcherFunction = async (url: string, accept: string, signal: AbortSignal | undefined, logger?: Logger): Promise<Response> => {
    // Check cache first if caching is enabled
    if (cache && finalCacheStorage) {
      const cacheKey = generateCacheKey(url, accept, userAgent);
      const cachedEntryData = await finalCacheStorage.get(cacheKey);

      if (cachedEntryData) {
        try {
          const cacheEntry: CacheEntry = JSON.parse(cachedEntryData);

          if (cacheEntry.type === 'success') {
            // Return cached successful response
            logger?.info(`Cache HIT (success) for URL: ${url}`);
            return new Response(cacheEntry.data, {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': accept,
                'X-Cache': 'HIT'
              }
            });
          } else if (cacheEntry.type === 'error' && cacheFailures) {
            // Return cached error
            logger?.info(`Cache HIT (error) for URL: ${url}`);
            const error = new Error('Cached error');
            throw error;
          } else {
            logger?.debug(`Cache entry type ${cacheEntry.type} not eligible for use, cacheFailures: ${cacheFailures}`);
          }
        } catch (parseError) {
          // If parsing fails, treat as cache miss and continue
          logger?.warn(`Failed to parse cached entry for URL ${url}:`, parseError);
          // Check if this is JSON parse error or error thrown from cached error handling
          if (parseError instanceof SyntaxError) {
            // JSON parse error - continue to fetch from network
            logger?.debug('JSON parse error, continuing to network fetch');
          } else {
            // This might be the cached error being re-thrown - rethrow it
            throw parseError;
          }
        }
      } else {
        logger?.info(`Cache MISS for URL: ${url}`);
      }
    }

    let fetchResponse: Response;
    let fetchError: Error | null = null;

    try {
      // Fetch from network
      fetchResponse = await fetchData(url, accept, userAgent, timeout, signal, logger);
    } catch (error) {
      fetchError = error as Error;

      // Cache the failure if caching is enabled and failure caching is enabled
      if (cache && finalCacheStorage && cacheFailures) {
        try {
          const cacheKey = generateCacheKey(url, accept, userAgent);
          const errorEntry: CacheEntry = {
            type: 'error',
            data: '',
            error: {
              message: fetchError.message,
              ...(fetchError.message.includes('HTTP error, status:') && {
                status: parseInt(fetchError.message.match(/status: (\d+)/)?.[1] || '0')
              })
            },
            timestamp: Date.now()
          };

          await finalCacheStorage.set(cacheKey, JSON.stringify(errorEntry), failureCacheTTL);
          logger?.debug(`Cached error for URL: ${url}`);
        } catch (cacheError) {
          // Log cache error but don't fail the request
          logger?.warn(`Failed to cache error for URL ${url}:`, cacheError);
          console.warn('Failed to cache error:', cacheError);
        }
      }

      // Re-throw the original error
      throw fetchError;
    }

    // Cache the successful response if caching is enabled
    if (cache && finalCacheStorage && fetchResponse.ok) {
      try {
        const responseText = await fetchResponse.clone().text();
        const cacheKey = generateCacheKey(url, accept, userAgent);
        const successEntry: CacheEntry = {
          type: 'success',
          data: responseText,
          timestamp: Date.now()
        };

        await finalCacheStorage.set(cacheKey, JSON.stringify(successEntry), cacheTTL);
        logger?.debug(`Cached successful response for URL: ${url}`);
      } catch (error) {
        // Log cache error but don't fail the request
        logger?.warn(`Failed to cache response for URL ${url}:`, error);
        console.warn('Failed to cache response:', error);
      }
    }

    return fetchResponse;
  };

  return {
    rawFetcher: fetcherFunction,
    userAgent: userAgent
  };
};

/**
 * Create a direct fetcher that does not use caching and directly accesses the network
 * @param userAgent - User-Agent string to use for requests (required)
 * @param timeout - Timeout in milliseconds for requests (default: 60000ms)
 * @returns FetcherType object that encapsulates the fetcher and userAgent
 */
export const createDirectFetcher = (
  userAgent: string,
  timeout: number = 60000
): FetcherType => {
  const fetcherFunction = async (url: string, accept: string, signal: AbortSignal | undefined, logger?: Logger): Promise<Response> => {
    // Direct network access without any caching
    logger?.debug(`Direct fetch for URL: ${url}`);
    return await fetchData(url, accept, userAgent, timeout, signal, logger);
  };

  return {
    rawFetcher: fetcherFunction,
    userAgent: userAgent
  };
};
