// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { createMutex } from 'async-primitives';
import type { CacheStorage, CacheEntry } from './index.js';

/**
 * Create localStorage-based cache storage instance
 * @param keyPrefix - Prefix for localStorage keys (defaults to 'cache:')
 * @returns LocalCache instance that uses localStorage
 * @throws Error if localStorage is not available
 */
export const createLocalCacheStorage = (
  keyPrefix: string = 'cache:'
): CacheStorage => {
  const mutex = createMutex();

  /**
   * Check if localStorage is available
   */
  const isLocalStorageAvailable = (): boolean => {
    try {
      return (
        typeof window !== 'undefined' &&
        typeof window.localStorage !== 'undefined' &&
        window.localStorage !== null
      );
    } catch {
      return false;
    }
  };

  /**
   * Clean up expired entries (internal method, assumes lock is already held)
   */
  const cleanupExpiredInternal = async (): Promise<void> => {
    if (!isLocalStorageAvailable()) {
      return;
    }

    const now = Date.now();
    const expiredKeys: string[] = [];

    // Scan all localStorage keys with our prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(keyPrefix)) {
        continue;
      }

      const stored = localStorage.getItem(key);
      if (!stored) {
        continue;
      }

      try {
        const entry: CacheEntry = JSON.parse(stored);
        if (entry.ttl !== undefined) {
          const isExpired =
            entry.ttl === 0 || now > entry.timestamp + entry.ttl;
          if (isExpired) {
            expiredKeys.push(key);
          }
        }
      } catch {
        // Invalid JSON, mark for removal
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      localStorage.removeItem(key);
    }
  };

  const get = async (key: string): Promise<string | null> => {
    // Check if localStorage is available first (no lock needed for this check)
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage is not available in this environment');
    }

    // Pre-compute full key outside of lock
    const fullKey = keyPrefix + key;
    const stored = localStorage.getItem(fullKey);

    if (!stored) {
      return null;
    }

    let entry: CacheEntry;
    try {
      entry = JSON.parse(stored);
    } catch {
      // Invalid JSON, need to remove the corrupted entry under lock
      const lockHandle = await mutex.lock();
      try {
        localStorage.removeItem(fullKey);
        return null;
      } finally {
        lockHandle.release();
      }
    }

    // Check TTL expiration - only lock if we need to delete expired entry
    if (entry.ttl !== undefined) {
      const isExpired =
        entry.ttl === 0 || Date.now() > entry.timestamp + entry.ttl;
      if (isExpired) {
        // Lock only for the deletion operation
        const lockHandle = await mutex.lock();
        try {
          // Double-check expiration under lock to avoid race conditions
          const currentTime = Date.now();
          const stillExpired =
            entry.ttl === 0 || currentTime > entry.timestamp + entry.ttl;
          if (stillExpired) {
            localStorage.removeItem(fullKey);
          }
          return null;
        } finally {
          lockHandle.release();
        }
      }
    }

    return entry.data;
  };

  const set = async (
    key: string,
    value: string,
    ttl?: number
  ): Promise<void> => {
    // Check if localStorage is available first (no lock needed for this check)
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage is not available in this environment');
    }

    // Pre-compute everything possible outside of lock
    const fullKey = keyPrefix + key;
    const entry: CacheEntry = {
      data: value,
      timestamp: Date.now(),
    };

    if (ttl !== undefined) {
      entry.ttl = ttl;
    }

    const serialized = JSON.stringify(entry);

    const lockHandle = await mutex.lock();
    try {
      try {
        // For cache systems, last-write-wins is often acceptable
        // We minimize lock time by only protecting the actual storage operation
        localStorage.setItem(fullKey, serialized);
      } catch (error) {
        // Handle localStorage quota exceeded or other errors
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          // Try to cleanup expired entries and retry
          await cleanupExpiredInternal();
          try {
            localStorage.setItem(fullKey, serialized);
          } catch (retryError) {
            throw new Error(`Failed to store cache entry: ${retryError}`);
          }
        } else {
          throw new Error(`Failed to store cache entry: ${error}`);
        }
      }
    } finally {
      lockHandle.release();
    }
  };

  const deleteEntry = async (key: string): Promise<void> => {
    // Check if localStorage is available first (no lock needed for this check)
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage is not available in this environment');
    }

    // Pre-compute full key outside of lock
    const fullKey = keyPrefix + key;

    const lockHandle = await mutex.lock();
    try {
      localStorage.removeItem(fullKey);
    } finally {
      lockHandle.release();
    }
  };

  const clear = async (): Promise<void> => {
    // Check if localStorage is available first (no lock needed for this check)
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage is not available in this environment');
    }

    // Pre-scan keys to remove outside of lock
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(keyPrefix)) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length === 0) {
      return;
    }

    const lockHandle = await mutex.lock();
    try {
      // Remove all identified keys
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } finally {
      lockHandle.release();
    }
  };

  const size = async (): Promise<number> => {
    // Check if localStorage is available first (no lock needed for this check)
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage is not available in this environment');
    }

    // Pre-scan all keys with our prefix without lock
    const keysToCheck: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(keyPrefix)) {
        keysToCheck.push(key);
      }
    }

    if (keysToCheck.length === 0) {
      return 0;
    }

    // Clean up expired entries and count valid ones with lock
    const lockHandle = await mutex.lock();
    try {
      const now = Date.now();
      let validCount = 0;

      for (const key of keysToCheck) {
        const stored = localStorage.getItem(key);
        if (!stored) {
          continue; // Key was deleted by another process
        }

        try {
          const entry: CacheEntry = JSON.parse(stored);

          // Check if entry is expired
          if (entry.ttl !== undefined) {
            const isExpired =
              entry.ttl === 0 || now > entry.timestamp + entry.ttl;
            if (isExpired) {
              localStorage.removeItem(key);
              continue; // Don't count this entry
            }
          }
          validCount++;
        } catch {
          // Invalid JSON, remove it
          localStorage.removeItem(key);
        }
      }

      return validCount;
    } finally {
      lockHandle.release();
    }
  };

  return {
    get,
    set,
    delete: deleteEntry,
    clear,
    size,
  };
};
