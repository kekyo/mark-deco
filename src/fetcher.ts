import { createMemoryCacheStorage, generateCacheKey, type CacheStorage } from "./cache/index.js";
import { Logger, type FetcherType } from "./types";

/**
 * Check if an error is likely a CORS error
 * @param error - The error to check
 * @returns True if the error appears to be CORS-related
 */
export const isCORSError = (error: unknown): boolean => {
  const message = (error as Error)?.message?.toLowerCase() || '';
  const name = (error as Error)?.name?.toLowerCase() || '';

  return (
    message.includes('cors') ||
    message.includes('cross-origin') ||
    message.includes('access-control') ||
    message.includes('load failed') ||
    name.includes('cors') ||
    // TypeError with 'fetch' often indicates CORS in browser
    (typeof window !== 'undefined' && name === 'typeerror' && (message.includes('fetch') || message.includes('load')))
  );
};

/**
 * Create timeout signal
 * @param timeout - Timeout duration in milliseconds
 * @returns AbortSignal that will trigger after the specified timeout
 */
export const createTimeoutSignal = (timeout: number) : AbortSignal => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
};

/**
 * Combine multiple abort signals
 * @param signals - Array of abort signals to combine
 * @returns Combined abort signal that triggers when any input signal triggers
 */
export const combineAbortSignals = (...signals: AbortSignal[]): AbortSignal => {
  const controller = new AbortController();

  signals.forEach(signal => {
    if (signal.aborted) {
      controller.abort();
      return;
    }

    const handler = () => {
      controller.abort();
      signal.removeEventListener('abort', handler);
    };
    signal.addEventListener('abort', handler);
  });

  return controller.signal;
};

/**
 * Fetch data from a URL with specified parameters
 * @param url - The URL to fetch from
 * @param accept - Accept header value
 * @param userAgent - User agent string
 * @param timeout - Timeout duration in milliseconds
 * @param signal - Optional abort signal
 * @param logger - Optional logger instance
 * @returns Promise resolving to the HTTP response
 */
export const fetchData = async (url: string, accept: string, userAgent: string, timeout: number, signal: AbortSignal | undefined, logger?: Logger): Promise<Response> => {
  const headersInit: HeadersInit = {
    'Accept': accept,
    'User-Agent': userAgent
  };
  const requestInit: RequestInit = {
    method: 'GET',
    headers: headersInit
  };
  const timeoutSignal = createTimeoutSignal(timeout);
  requestInit.signal = signal ? combineAbortSignals(signal, timeoutSignal) : timeoutSignal;

  logger?.debug(`Fetching data from URL: ${url}`);
  const response = await fetch(url, requestInit);
  if (!response.ok) {
    logger?.error(`HTTP error for URL ${url}, status: ${response.status}`);
    throw new Error(`HTTP error, status: ${response.status}`);
  }

  logger?.debug(`Successfully fetched data from URL: ${url}`);
  return response;
};

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

/**
 * Fetch text content from a URL using the provided fetcher
 * @param fetcherInstance - The fetcher instance to use
 * @param url - The URL to fetch from
 * @param accept - Accept header value
 * @param signal - Optional abort signal
 * @param logger - Optional logger instance
 * @returns Promise resolving to the text content
 */
export const fetchText = async (fetcherInstance: FetcherType, url: string, accept: string, signal: AbortSignal | undefined, logger?: Logger): Promise<string> => {
  const data = await fetcherInstance.rawFetcher(url, accept, signal, logger);
  return await data.text();
};

/**
 * Fetch JSON content from a URL using the provided fetcher
 * @param fetcherInstance - The fetcher instance to use
 * @param url - The URL to fetch from
 * @param signal - Optional abort signal
 * @param logger - Optional logger instance
 * @returns Promise resolving to the parsed JSON data
 */
export const fetchJson = async <T>(fetcherInstance: FetcherType, url: string, signal: AbortSignal | undefined, logger?: Logger): Promise<T> => {
  const data = await fetcherInstance.rawFetcher(url, "application/json", signal, logger);
  return await data.json() as T;
};
