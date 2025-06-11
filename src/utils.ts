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
