// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

// Utility functions

import type { FetcherType, Logger } from './types';

/**
 * Check if an error is a CORS error
 * @param error - The error to check
 * @returns True if the error is a CORS error
 */
export const isCORSError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return (
      message.includes('cors') ||
      message.includes('network') ||
      message.includes('fetch')
    );
  }
  return false;
};

/**
 * Create a timeout signal that aborts after the specified timeout
 * @param timeout - Timeout in milliseconds
 * @returns AbortSignal that will abort after the timeout
 */
export const createTimeoutSignal = (timeout: number): AbortSignal => {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, timeout);
  return controller.signal;
};

/**
 * Combine multiple abort signals into a single signal
 * @param signals - Array of abort signals to combine
 * @returns Combined abort signal that aborts when any of the input signals abort
 */
export const combineAbortSignals = (...signals: AbortSignal[]): AbortSignal => {
  const controller = new AbortController();

  // If any signal is already aborted, abort immediately
  if (signals.some((signal) => signal.aborted)) {
    controller.abort();
    return controller.signal;
  }

  // Set up listeners for all signals
  const handler = () => {
    controller.abort();
    // Clean up listeners
    signals.forEach((signal) => {
      signal.removeEventListener('abort', handler);
    });
  };

  signals.forEach((signal) => {
    signal.addEventListener('abort', handler);
  });

  return controller.signal;
};

/**
 * Fetch data from a URL with the specified parameters
 * @param url - The URL to fetch from
 * @param accept - Accept header value
 * @param userAgent - User-Agent header value
 * @param timeout - Timeout in milliseconds
 * @param signal - Optional abort signal
 * @param logger - Optional logger instance
 * @returns Promise resolving to the Response object
 */
export const fetchData = async (
  url: string,
  accept: string,
  userAgent: string,
  timeout: number,
  signal: AbortSignal | undefined,
  logger?: Logger
): Promise<Response> => {
  const headersInit: HeadersInit = {
    Accept: accept,
    'User-Agent': userAgent,
  };
  const requestInit: RequestInit = {
    method: 'GET',
    headers: headersInit,
  };
  const timeoutSignal = createTimeoutSignal(timeout);
  requestInit.signal = signal
    ? combineAbortSignals(signal, timeoutSignal)
    : timeoutSignal;

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
 * Fetch text content from a URL using the provided fetcher
 * @param fetcherInstance - The fetcher instance to use
 * @param url - The URL to fetch from
 * @param accept - Accept header value
 * @param signal - Optional abort signal
 * @param logger - Optional logger instance
 * @returns Promise resolving to the text content
 */
export const fetchText = async (
  fetcherInstance: FetcherType,
  url: string,
  accept: string,
  signal: AbortSignal | undefined,
  logger?: Logger
): Promise<string> => {
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
export const fetchJson = async <T>(
  fetcherInstance: FetcherType,
  url: string,
  signal: AbortSignal | undefined,
  logger?: Logger
): Promise<T> => {
  const data = await fetcherInstance.rawFetcher(
    url,
    'application/json',
    signal,
    logger
  );
  return (await data.json()) as T;
};

/**
 * Generate a timestamp string suitable for file names
 * @returns ISO timestamp string with special characters replaced for file compatibility
 */
export const generateTimestamp = (): string => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, -5);
};

/**
 * Escape HTML special characters
 * @param text - The text to escape
 * @returns HTML-escaped text
 */
export const escapeHtml = (text: string): string => {
  return text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
};

/**
 * Check if running in Node.js environment
 * @returns True if running in a Node.js environment
 */
export const isNode = (): boolean => {
  return typeof process !== 'undefined' && !!process.versions?.node;
};

/**
 * Check if running in browser environment
 * @returns True if running in a browser environment
 */
export const isBrowser = (): boolean => {
  return (
    !isNode() &&
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
};

/**
 * Generate ID from heading text (public API)
 *
 * This function processes heading text to create a valid HTML ID by:
 * 1. Normalizing Unicode characters and removing accents
 * 2. Converting to lowercase and handling escape sequences
 * 3. Extracting ASCII characters only
 * 4. Creating a valid ID from ASCII characters
 *
 * @param text - The heading text to process
 * @returns The generated ID string, or undefined if a valid ID cannot be created (minimum 3 characters required)
 *
 * @example
 * ```typescript
 * const id = generateHeadingId('Hello World');
 * // Returns: 'hello-world'
 *
 * const id2 = generateHeadingId('🚀');
 * // Returns: undefined (no valid ASCII characters)
 *
 * const id3 = generateHeadingId('Café Naïve');
 * // Returns: 'cafe-naive'
 * ```
 */
export const generateHeadingId = (text: string): string | undefined => {
  // Step 1: Unicode normalization and accent removal
  let processed = text
    .normalize('NFD') // Unicode normalization (decomposition)
    .replace(/[\u0300-\u036f]/g, '') // Remove combining characters (accents, etc.)
    .toLowerCase()
    .replace(/\\[nrtbfv0]/g, '-') // Replace escape sequence strings with hyphens
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '-'); // Replace actual control characters with hyphens

  // Step 2: Extract ASCII characters only
  const asciiOnly = processed.replace(/[^\x20-\x7E]/g, '');

  // Step 3: Generate valid ID from ASCII characters
  const finalId = asciiOnly
    .replace(/[^\w\s-]/g, '') // Remove non-word characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Step 4: Return undefined if valid ID cannot be created (minimum 3 characters)
  if (finalId.length >= 3) {
    return finalId;
  } else {
    return undefined;
  }
};
