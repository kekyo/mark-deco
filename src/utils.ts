// Removed unused import

// Re-export utilities from fetcher module
export {
  isCORSError,
  createTimeoutSignal,
  combineAbortSignals,
  createCachedFetcher,
  createDirectFetcher,
  fetchText,
  fetchJson,
  fetchData,
  type CachedFetcherOptions
} from './fetcher.js';

// Re-export cache utilities
export {
  createMemoryCacheStorage,
  createLocalCacheStorage,
  generateCacheKey,
  type CacheStorage
} from "./cache/index.js";

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
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Check if running in browser environment
 * @returns True if running in a browser environment
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

/**
 * Check if running in Node.js environment
 * @returns True if running in a Node.js environment
 */
export const isNode = (): boolean => {
  return typeof process !== 'undefined' && process.versions && !!process.versions.node;
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
    .normalize('NFD')                       // Unicode normalization (decomposition)
    .replace(/[\u0300-\u036f]/g, '')        // Remove combining characters (accents, etc.)
    .toLowerCase()
    .replace(/\\[nrtbfv0]/g, '-')           // Replace escape sequence strings with hyphens
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '-'); // Replace actual control characters with hyphens

  // Step 2: Extract ASCII characters only
  const asciiOnly = processed.replace(/[^\x20-\x7E]/g, '');

  // Step 3: Generate valid ID from ASCII characters
  const finalId = asciiOnly
    .replace(/[^\w\s-]/g, '')               // Remove non-word characters except spaces and hyphens
    .replace(/\s+/g, '-')                   // Replace spaces with hyphens
    .replace(/-+/g, '-')                    // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');                 // Remove leading/trailing hyphens

  // Step 4: Return undefined if valid ID cannot be created (minimum 3 characters)
  if (finalId.length >= 3) {
    return finalId;
  } else {
    return undefined;
  }
};
