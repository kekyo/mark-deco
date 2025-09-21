/**
 * Cache entry with timestamp and TTL support
 */
export interface CacheEntry {
  /** Cached data as string */
  data: string;
  /** Unix timestamp when the entry was created */
  timestamp: number;
  /** Time to live in milliseconds (optional) */
  ttl?: number; // Time to live in milliseconds
}

/**
 * Cache storage interface
 */
export interface CacheStorage {
  /** Retrieve cached data by key */
  get(key: string): Promise<string | null>;
  /** Store data in cache with optional TTL */
  set(key: string, value: string, ttl?: number): Promise<void>;
  /** Delete cached data by key */
  delete(key: string): Promise<void>;
  /** Clear all cached data */
  clear(): Promise<void>;
  /** Get the number of cached entries */
  size(): Promise<number>;
}

/**
 * Generate cache key from URL, accept header, and user agent
 * @param url - The URL to cache
 * @param accept - Accept header value
 * @param userAgent - User agent string (optional)
 * @returns Generated cache key string
 */
export function generateCacheKey(
  url: string,
  accept: string,
  userAgent?: string
): string {
  const userAgentPart = userAgent || 'default';
  return `fetch:${url}:${accept}:${userAgentPart}`;
}

// Re-export cache storage implementations
export { createLocalCacheStorage } from './localstorage.js';
export { createMemoryCacheStorage } from './memory.js';
export { createFileSystemCacheStorage } from './filesystem.js';
