import { createAsyncLock } from 'async-primitives';
import type { CacheStorage, CacheEntry } from './index.js';

/**
 * Create in-memory cache storage instance
 * Uses in-memory cache implementation with minimal locking for thread safety
 * @returns CacheStorage instance backed by in-memory Map
 */
export const createMemoryCacheStorage = (): CacheStorage => {
  const cache = new Map<string, CacheEntry>();
  const asyncLock = createAsyncLock();

  /**
   * Clean up expired entries (optimized version without lock)
   * Used when we already hold a lock or for read-only checks
   */
  const cleanupExpiredInternal = (now: number = Date.now()): string[] => {
    const expiredKeys: string[] = [];

    for (const [key, entry] of cache.entries()) {
      if (entry.ttl !== undefined) {
        const isExpired = entry.ttl === 0 || now > entry.timestamp + entry.ttl;
        if (isExpired) {
          expiredKeys.push(key);
        }
      }
    }

    for (const key of expiredKeys) {
      cache.delete(key);
    }

    return expiredKeys;
  };

  const get = async (key: string): Promise<string | null> => {
    const entry = cache.get(key);
    if (!entry) {
      return null;
    }

    // Check TTL expiration - only lock if we need to delete expired entry
    if (entry.ttl !== undefined) {
      const isExpired = entry.ttl === 0 || Date.now() > entry.timestamp + entry.ttl;
      if (isExpired) {
        // Lock only for the deletion operation
        const lockHandle = await asyncLock.lock();
        try {
          // Double-check expiration under lock to avoid race conditions
          const currentEntry = cache.get(key);
          if (currentEntry && currentEntry.ttl !== undefined) {
            const currentTime = Date.now();
            const stillExpired = currentEntry.ttl === 0 || currentTime > currentEntry.timestamp + currentEntry.ttl;
            if (stillExpired) {
              cache.delete(key);
            }
          }
          return null;
        } finally {
          lockHandle.release();
        }
      }
    }

    return entry.data;
  };

  const set = async (key: string, value: string, ttl?: number): Promise<void> => {
    // Pre-compute entry object outside of any lock
    const entry: CacheEntry = {
      data: value,
      timestamp: Date.now()
    };

    if (ttl !== undefined) {
      entry.ttl = ttl;
    }

    // For memory cache, Map.set is very fast and atomic enough
    // We can use minimal locking since memory operations are fast
    const lockHandle = await asyncLock.lock();
    try {
      cache.set(key, entry);
    } finally {
      lockHandle.release();
    }
  };

  const deleteEntry = async (key: string): Promise<void> => {
    // Simple delete operation, minimal lock time
    const lockHandle = await asyncLock.lock();
    try {
      cache.delete(key);
    } finally {
      lockHandle.release();
    }
  };

  const clear = async (): Promise<void> => {
    // Clear is atomic and fast for Map
    const lockHandle = await asyncLock.lock();
    try {
      cache.clear();
    } finally {
      lockHandle.release();
    }
  };

  const size = async (): Promise<number> => {
    // For memory cache, we can do a more optimized approach
    // Get current entries snapshot without lock, then cleanup under lock
    const entries = Array.from(cache.entries());

    if (entries.length === 0) {
      return 0;
    }

    const lockHandle = await asyncLock.lock();
    try {
      // Clean up expired entries and return size in one operation
      cleanupExpiredInternal();
      return cache.size;
    } finally {
      lockHandle.release();
    }
  };

  return {
    get,
    set,
    delete: deleteEntry,
    clear,
    size
  };
};
