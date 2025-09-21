import {
  combineAbortSignals,
  createTimeoutSignal,
  isCORSError,
} from '../../utils.js';
import type { Logger } from '../../types.js';
// Removed unused import

/**
 * Resolve URL redirects to get the final URL
 */
export const resolveRedirects = async (
  url: string,
  maxRedirects: number,
  timeoutEachRedirect: number,
  userAgent: string | undefined,
  logger: Logger,
  signal: AbortSignal | undefined
): Promise<string> => {
  // Default implementation using fetch with manual redirect.
  // Here fetchData (FetcherType) is not used.
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    try {
      const headers: HeadersInit = {};
      if (userAgent) {
        headers['User-Agent'] = userAgent;
      }
      const options: RequestInit = {
        method: 'HEAD',
        redirect: 'manual', // Will cause CORS error in browser environment
        headers,
      };
      const timeoutSignal = createTimeoutSignal(timeoutEachRedirect);
      options.signal = signal
        ? combineAbortSignals(signal, timeoutSignal)
        : timeoutSignal;

      const response = await fetch(currentUrl, options);

      // Check if it's a redirect response
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          // Handle relative URLs
          currentUrl = new URL(location, currentUrl).toString();
          redirectCount++;
          continue;
        }
      }

      // No more redirects, return current URL
      break;
    } catch (error) {
      if (isCORSError(error)) {
        logger.debug(
          'resolveRedirects: Browser CORS restrictions prevent redirect resolution for URL:',
          currentUrl
        );
      } else {
        logger.warn(
          'resolveRedirects: Failed to resolve redirect for URL:',
          currentUrl,
          error
        );
      }
      return currentUrl;
    }
  }

  if (redirectCount >= maxRedirects) {
    logger.warn('resolveRedirects: Maximum redirects reached for URL:', url);
  }

  return currentUrl;
};
