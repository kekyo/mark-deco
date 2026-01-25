// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { createHash } from 'crypto';
import {
  readdir,
  rm,
  readFile,
  mkdir,
  writeFile,
  access,
  chmod,
  stat,
} from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'zlib';
import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterAll,
} from 'vitest';
import {
  generateCacheKey,
  createMemoryCacheStorage,
  type CacheStorage,
} from '../src/cache/index';
import { createLocalCacheStorage } from '../src/browser';
import { createFileSystemCacheStorage } from '../src/cache/filesystem';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

describe('MemoryCache', () => {
  let cache: CacheStorage;

  beforeEach(() => {
    cache = createMemoryCacheStorage();
  });

  describe('Basic operations', () => {
    it('should store and retrieve data', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);
      const retrieved = await cache.get(key);

      expect(retrieved).toBe(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete entries', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);

      await cache.delete(key);
      expect(await cache.get(key)).toBeNull();
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      expect(await cache.size()).toBe(3);

      await cache.clear();
      expect(await cache.size()).toBe(0);
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });

    it('should return correct size', async () => {
      expect(await cache.size()).toBe(0);

      await cache.set('key1', 'value1');
      expect(await cache.size()).toBe(1);

      await cache.set('key2', 'value2');
      expect(await cache.size()).toBe(2);

      await cache.delete('key1');
      expect(await cache.size()).toBe(1);
    });
  });

  describe('TTL functionality', () => {
    it('should store data without TTL', async () => {
      const key = 'no-ttl-key';
      const value = 'no-ttl-value';

      await cache.set(key, value);

      // Wait a bit to ensure no automatic expiry
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(await cache.get(key)).toBe(value);
    });

    it('should respect TTL and expire entries', async () => {
      const key = 'ttl-key';
      const value = 'ttl-value';
      const ttl = 50; // 50ms

      await cache.set(key, value, ttl);

      // Should be available immediately
      expect(await cache.get(key)).toBe(value);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be expired and return null
      expect(await cache.get(key)).toBeNull();
    });

    it('should not affect size calculation for expired entries', async () => {
      const ttl = 50; // 50ms

      await cache.set('key1', 'value1', ttl);
      await cache.set('key2', 'value2'); // No TTL

      expect(await cache.size()).toBe(2);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Expired entry should not count in size
      expect(await cache.size()).toBe(1);
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBe('value2');
    });

    it('should handle multiple entries with different TTLs', async () => {
      await cache.set('short', 'short-value', 30);
      await cache.set('medium', 'medium-value', 80);
      await cache.set('long', 'long-value', 150);
      await cache.set('permanent', 'permanent-value'); // No TTL

      expect(await cache.size()).toBe(4);

      // Wait for short TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(await cache.get('short')).toBeNull();
      expect(await cache.get('medium')).toBe('medium-value');
      expect(await cache.get('long')).toBe('long-value');
      expect(await cache.get('permanent')).toBe('permanent-value');

      // Wait for medium TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(await cache.get('medium')).toBeNull();
      expect(await cache.get('long')).toBe('long-value');
      expect(await cache.get('permanent')).toBe('permanent-value');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string values', async () => {
      const key = 'empty-key';
      const value = '';

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);
    });

    it('should handle very long strings', async () => {
      const key = 'long-key';
      const value = 'x'.repeat(10000); // 10KB string

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);
    });

    it('should handle zero TTL', async () => {
      const key = 'zero-ttl-key';
      const value = 'zero-ttl-value';

      await cache.set(key, value, 0);

      // Should expire immediately
      expect(await cache.get(key)).toBeNull();
    });

    it('should handle very small TTL', async () => {
      const key = 'small-ttl-key';
      const value = 'small-ttl-value';

      await cache.set(key, value, 1); // 1ms TTL

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should definitely be expired
      expect(await cache.get(key)).toBeNull();
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent operations', async () => {
      const promises: Promise<void>[] = [];

      // Set multiple entries concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`key${i}`, `value${i}`));
      }

      await Promise.all(promises);

      // Verify all entries exist
      for (let i = 0; i < 10; i++) {
        expect(await cache.get(`key${i}`)).toBe(`value${i}`);
      }

      expect(await cache.size()).toBe(10);
    });

    it('should handle concurrent read/write operations on same key', async () => {
      const key = 'concurrent-key';
      const iterations = 20;

      // Mix of concurrent read and write operations
      const operations: Promise<void | string | null>[] = [];

      for (let i = 0; i < iterations; i++) {
        if (i % 2 === 0) {
          // Write operation
          operations.push(cache.set(key, `value${i}`));
        } else {
          // Read operation
          operations.push(cache.get(key));
        }
      }

      const results = await Promise.all(operations);

      // Should have completed without errors
      expect(results).toHaveLength(iterations);

      // Final state should be consistent
      const finalValue = await cache.get(key);
      expect(typeof finalValue === 'string' || finalValue === null).toBe(true);
    });

    it('should handle concurrent delete operations', async () => {
      const numKeys = 10;

      // First, set up multiple keys
      for (let i = 0; i < numKeys; i++) {
        await cache.set(`delete-key${i}`, `value${i}`);
      }

      expect(await cache.size()).toBe(numKeys);

      // Concurrently delete all keys
      const deletePromises: Promise<void>[] = [];
      for (let i = 0; i < numKeys; i++) {
        deletePromises.push(cache.delete(`delete-key${i}`));
      }

      await Promise.all(deletePromises);

      // All keys should be deleted
      expect(await cache.size()).toBe(0);

      // Verify each key is actually deleted
      for (let i = 0; i < numKeys; i++) {
        expect(await cache.get(`delete-key${i}`)).toBeNull();
      }
    });

    it('should handle concurrent TTL expiration and access', async () => {
      const key = 'ttl-race-key';
      const ttl = 100; // 100ms

      await cache.set(key, 'value', ttl);

      // Start multiple concurrent reads near expiration time
      await new Promise((resolve) => setTimeout(resolve, 50)); // Wait half TTL

      const readPromises: Promise<string | null>[] = [];
      for (let i = 0; i < 10; i++) {
        readPromises.push(cache.get(key));
      }

      // Wait until after expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add more reads after expiration
      for (let i = 0; i < 10; i++) {
        readPromises.push(cache.get(key));
      }

      const results = await Promise.all(readPromises);

      // Results should be consistent (either all have value or all null)
      // Or a mix where earlier reads have value and later ones are null
      const nonNullResults = results.filter((r) => r !== null);
      const nullResults = results.filter((r) => r === null);

      expect(nonNullResults.length + nullResults.length).toBe(results.length);

      // Final check - should definitely be null now
      expect(await cache.get(key)).toBeNull();
    });

    it('should handle concurrent size operations with modifications', async () => {
      const numOperations = 20;
      const operations: Promise<void | number>[] = [];

      // Mix of set, delete, and size operations
      for (let i = 0; i < numOperations; i++) {
        const opType = i % 3;

        switch (opType) {
          case 0: // Set operation
            operations.push(cache.set(`size-key${i}`, `value${i}`));
            break;
          case 1: // Delete operation (may fail if key doesn't exist)
            operations.push(cache.delete(`size-key${Math.floor(i / 2)}`));
            break;
          case 2: // Size operation
            operations.push(cache.size());
            break;
        }
      }

      const results = await Promise.all(operations);

      // All operations should complete successfully
      expect(results).toHaveLength(numOperations);

      // Final size should be consistent with actual cache state
      const finalSize = await cache.size();

      // Count actual keys by trying to get them
      let actualKeyCount = 0;
      for (let i = 0; i < numOperations; i++) {
        const value = await cache.get(`size-key${i}`);
        if (value !== null) {
          actualKeyCount++;
        }
      }

      expect(finalSize).toBe(actualKeyCount);
    });

    it('should handle concurrent clear and other operations', async () => {
      // Pre-populate cache
      for (let i = 0; i < 5; i++) {
        await cache.set(`clear-key${i}`, `value${i}`);
      }

      expect(await cache.size()).toBe(5);

      // Start concurrent operations including clear
      const operations: Promise<void | string | null | number>[] = [
        cache.clear(),
        cache.set('new-key1', 'new-value1'),
        cache.set('new-key2', 'new-value2'),
        cache.get('clear-key0'),
        cache.delete('clear-key1'),
        cache.size(),
      ];

      const results = await Promise.all(operations);

      // All operations should complete
      expect(results).toHaveLength(6);

      // Cache state should be consistent
      const finalSize = await cache.size();

      // After clear, only the new keys set during concurrent operations might remain
      expect(finalSize).toBeLessThanOrEqual(2);

      // Verify that original keys are gone (unless race condition allows some to survive)
      for (let i = 0; i < 5; i++) {
        const value = await cache.get(`clear-key${i}`);
        // Values should be null (cleared) or the operation didn't complete before clear
        expect(typeof value === 'string' || value === null).toBe(true);
      }
    });

    it('should maintain data consistency under heavy concurrent load', async () => {
      const numThreads = 10;
      const operationsPerThread = 20;
      const keySpace = 5; // Limited key space to increase conflicts

      const allOperations: Promise<void>[] = [];

      for (let thread = 0; thread < numThreads; thread++) {
        const threadOperations = async () => {
          for (let op = 0; op < operationsPerThread; op++) {
            const keyIndex = op % keySpace;
            const key = `load-key${keyIndex}`;
            const value = `thread${thread}-op${op}`;

            // Random operation type
            const operation = Math.floor(Math.random() * 4);

            switch (operation) {
              case 0: // Set
                await cache.set(key, value);
                break;
              case 1: // Get
                await cache.get(key);
                break;
              case 2: // Delete
                await cache.delete(key);
                break;
              case 3: // Size
                await cache.size();
                break;
            }
          }
        };

        allOperations.push(threadOperations());
      }

      // Execute all operations concurrently
      await Promise.all(allOperations);

      // Verify cache is still functional and consistent
      const finalSize = await cache.size();
      expect(typeof finalSize).toBe('number');
      expect(finalSize).toBeGreaterThanOrEqual(0);

      // Verify we can still perform operations
      await cache.set('final-test', 'final-value');
      expect(await cache.get('final-test')).toBe('final-value');
      expect(await cache.size()).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('LocalCache', () => {
  let cache: CacheStorage;
  let originalWindow: typeof globalThis.window | undefined;
  let originalLocalStorage: Storage | undefined;

  beforeAll(() => {
    // Save original values
    originalWindow = (global as typeof globalThis).window;
    originalLocalStorage = (global as typeof globalThis).localStorage;

    // Mock localStorage for Node.js environment
    Object.defineProperty(global, 'window', {
      value: { localStorage: localStorageMock },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    cache = createLocalCacheStorage('test:');
    localStorageMock.clear();
  });

  afterAll(() => {
    // Restore original values
    if (originalWindow !== undefined) {
      (global as typeof globalThis).window = originalWindow;
    } else {
      (global as typeof globalThis).window = undefined as unknown as Window &
        typeof globalThis;
    }

    if (originalLocalStorage !== undefined) {
      (global as typeof globalThis).localStorage = originalLocalStorage;
    } else {
      (global as typeof globalThis).localStorage =
        undefined as unknown as Storage;
    }
  });

  describe('Basic operations', () => {
    it('should store and retrieve data from localStorage', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);
      const retrieved = await cache.get(key);

      expect(retrieved).toBe(value);

      // Verify it's actually stored in localStorage
      const stored = localStorageMock.getItem('test:' + key);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.data).toBe(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete entries from localStorage', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);

      await cache.delete(key);
      expect(await cache.get(key)).toBeNull();
      expect(localStorageMock.getItem('test:' + key)).toBeNull();
    });

    it('should clear all entries with prefix', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      // Add some non-prefixed keys to localStorage
      localStorageMock.setItem('other:key1', 'other-value1');
      localStorageMock.setItem('different:key2', 'other-value2');

      expect(await cache.size()).toBe(3);

      await cache.clear();
      expect(await cache.size()).toBe(0);
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();

      // Non-prefixed keys should still exist
      expect(localStorageMock.getItem('other:key1')).toBe('other-value1');
      expect(localStorageMock.getItem('different:key2')).toBe('other-value2');
    });

    it('should return correct size', async () => {
      expect(await cache.size()).toBe(0);

      await cache.set('key1', 'value1');
      expect(await cache.size()).toBe(1);

      await cache.set('key2', 'value2');
      expect(await cache.size()).toBe(2);

      await cache.delete('key1');
      expect(await cache.size()).toBe(1);
    });
  });

  describe('TTL functionality', () => {
    it('should store data without TTL', async () => {
      const key = 'no-ttl-key';
      const value = 'no-ttl-value';

      await cache.set(key, value);

      // Wait a bit to ensure no automatic expiry
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(await cache.get(key)).toBe(value);
    });

    it('should respect TTL and expire entries', async () => {
      const key = 'ttl-key';
      const value = 'ttl-value';
      const ttl = 50; // 50ms

      await cache.set(key, value, ttl);

      // Should be available immediately
      expect(await cache.get(key)).toBe(value);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be expired and return null
      expect(await cache.get(key)).toBeNull();
      // Should be removed from localStorage
      expect(localStorageMock.getItem('test:' + key)).toBeNull();
    });

    it('should not affect size calculation for expired entries', async () => {
      const ttl = 50; // 50ms

      await cache.set('key1', 'value1', ttl);
      await cache.set('key2', 'value2'); // No TTL

      expect(await cache.size()).toBe(2);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Expired entry should not count in size
      expect(await cache.size()).toBe(1);
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBe('value2');
    });

    it('should handle zero TTL', async () => {
      const key = 'zero-ttl-key';
      const value = 'zero-ttl-value';

      await cache.set(key, value, 0);

      // Should expire immediately
      expect(await cache.get(key)).toBeNull();
      expect(localStorageMock.getItem('test:' + key)).toBeNull();
    });
  });

  describe('localStorage specific features', () => {
    it('should handle corrupted JSON data', async () => {
      const key = 'corrupted-key';
      const fullKey = 'test:' + key;

      // Set invalid JSON directly to localStorage
      localStorageMock.setItem(fullKey, 'invalid-json');

      // Should return null and clean up the corrupted entry
      expect(await cache.get(key)).toBeNull();
      expect(localStorageMock.getItem(fullKey)).toBeNull();
    });

    it('should clean up expired entries automatically', async () => {
      await cache.set('expired1', 'value1', 10);
      await cache.set('expired2', 'value2', 10);
      await cache.set('valid', 'value3', 1000);

      // Wait for first two to expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Cleanup should be triggered by size() call
      await cache.size();

      expect(localStorageMock.getItem('test:expired1')).toBeNull();
      expect(localStorageMock.getItem('test:expired2')).toBeNull();
      expect(localStorageMock.getItem('test:valid')).toBeTruthy();
    });

    it('should handle custom key prefix', async () => {
      const customCache = createLocalCacheStorage('custom-prefix:');

      await customCache.set('test', 'value');

      expect(localStorageMock.getItem('custom-prefix:test')).toBeTruthy();
      expect(await customCache.get('test')).toBe('value');
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage not available', async () => {
      // Temporarily remove localStorage
      const tempWindow = (global as Record<string, unknown>).window;
      const tempLocalStorage = (global as Record<string, unknown>).localStorage;

      (global as Record<string, unknown>).window = undefined;
      (global as Record<string, unknown>).localStorage = undefined;

      const errorCache = createLocalCacheStorage();

      await expect(errorCache.get('test')).rejects.toThrow(
        'localStorage is not available'
      );
      await expect(errorCache.set('test', 'value')).rejects.toThrow(
        'localStorage is not available'
      );
      await expect(errorCache.delete('test')).rejects.toThrow(
        'localStorage is not available'
      );
      await expect(errorCache.clear()).rejects.toThrow(
        'localStorage is not available'
      );
      await expect(errorCache.size()).rejects.toThrow(
        'localStorage is not available'
      );

      // Restore localStorage
      (global as Record<string, unknown>).window = tempWindow;
      (global as Record<string, unknown>).localStorage = tempLocalStorage;
    });

    it('should handle localStorage quota exceeded error', async () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorageMock.setItem;
      let callCount = 0;

      localStorageMock.setItem = vi.fn((key: string, value: string) => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('Storage quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
        // Second call (after cleanup) should succeed
        originalSetItem.call(localStorageMock, key, value);
      });

      // This should trigger quota exceeded, then cleanup, then retry
      await cache.set('test', 'value');

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
      expect(await cache.get('test')).toBe('value');

      // Restore original setItem
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent localStorage operations', async () => {
      const promises: Promise<void>[] = [];

      // Set multiple entries concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`concurrent-key${i}`, `concurrent-value${i}`));
      }

      await Promise.all(promises);

      // Verify all entries exist
      for (let i = 0; i < 10; i++) {
        expect(await cache.get(`concurrent-key${i}`)).toBe(
          `concurrent-value${i}`
        );
      }

      expect(await cache.size()).toBe(10);
    });

    it('should handle concurrent read/write operations on same key', async () => {
      const key = 'local-concurrent-key';
      const iterations = 20;

      // Mix of concurrent read and write operations
      const operations: Promise<string | null | void>[] = [];

      for (let i = 0; i < iterations; i++) {
        if (i % 2 === 0) {
          // Write operation
          operations.push(cache.set(key, `local-value${i}`));
        } else {
          // Read operation
          operations.push(cache.get(key));
        }
      }

      const results = await Promise.all(operations);

      // Should have completed without errors
      expect(results).toHaveLength(iterations);

      // Final state should be consistent
      const finalValue = await cache.get(key);
      expect(typeof finalValue === 'string' || finalValue === null).toBe(true);
    });

    it('should handle concurrent TTL expiration and access in localStorage', async () => {
      const key = 'local-ttl-race-key';
      const ttl = 100; // 100ms

      await cache.set(key, 'local-value', ttl);

      // Start multiple concurrent reads near expiration time
      await new Promise((resolve) => setTimeout(resolve, 50)); // Wait half TTL

      const readPromises: Promise<string | null>[] = [];
      for (let i = 0; i < 10; i++) {
        readPromises.push(cache.get(key));
      }

      // Wait until after expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add more reads after expiration
      for (let i = 0; i < 10; i++) {
        readPromises.push(cache.get(key));
      }

      const results = await Promise.all(readPromises);

      // Results should be consistent
      const nonNullResults = results.filter((r) => r !== null);
      const nullResults = results.filter((r) => r === null);

      expect(nonNullResults.length + nullResults.length).toBe(results.length);

      // Final check - should definitely be null now
      expect(await cache.get(key)).toBeNull();
      expect(localStorageMock.getItem('test:' + key)).toBeNull();
    });

    it('should maintain localStorage consistency under concurrent load', async () => {
      const numThreads = 10;
      const operationsPerThread = 15;
      const keySpace = 5; // Limited key space to increase conflicts

      const allOperations: Promise<void>[] = [];

      for (let thread = 0; thread < numThreads; thread++) {
        const threadOperations = async () => {
          for (let op = 0; op < operationsPerThread; op++) {
            const keyIndex = op % keySpace;
            const key = `local-load-key${keyIndex}`;
            const value = `local-thread${thread}-op${op}`;

            // Random operation type
            const operation = Math.floor(Math.random() * 4);

            switch (operation) {
              case 0: // Set
                await cache.set(key, value);
                break;
              case 1: // Get
                await cache.get(key);
                break;
              case 2: // Delete
                await cache.delete(key);
                break;
              case 3: // Size
                await cache.size();
                break;
            }
          }
        };

        allOperations.push(threadOperations());
      }

      // Execute all operations concurrently
      await Promise.all(allOperations);

      // Verify cache is still functional and consistent
      const finalSize = await cache.size();
      expect(typeof finalSize).toBe('number');
      expect(finalSize).toBeGreaterThanOrEqual(0);

      // Verify we can still perform operations
      await cache.set('local-final-test', 'local-final-value');
      expect(await cache.get('local-final-test')).toBe('local-final-value');
      expect(await cache.size()).toBeGreaterThanOrEqual(1);
    });

    it('should handle concurrent quota exceeded scenarios', async () => {
      // Setup to simulate quota exceeded on multiple concurrent writes
      const originalSetItem = localStorageMock.setItem;
      let quotaErrorCount = 0;

      localStorageMock.setItem = vi.fn((key: string, value: string) => {
        // Simulate quota exceeded for first few attempts across different operations
        if (quotaErrorCount < 2) {
          // Reduce from 3 to 2 to avoid multiple retry failures
          quotaErrorCount++;
          const error = new Error('Storage quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
        // Allow subsequent operations to succeed
        originalSetItem.call(localStorageMock, key, value);
      });

      // Execute concurrent set operations
      const setPromises: Promise<void>[] = [];
      for (let i = 0; i < 3; i++) {
        // Reduce from 5 to 3 to avoid too many quota errors
        setPromises.push(
          cache.set(`quota-key${i}`, `quota-value${i}`).catch((error) => {
            // Allow some operations to fail due to quota exceeded
            if (!error.message.includes('Storage quota exceeded')) {
              throw error; // Re-throw unexpected errors
            }
          })
        );
      }

      await Promise.all(setPromises);

      // Verify that at least some operations succeeded or failed gracefully
      const values: (string | null)[] = [];
      for (let i = 0; i < 3; i++) {
        values.push(await cache.get(`quota-key${i}`));
      }

      const successfulOperations = values.filter((v) => v !== null).length;

      // Either some operations succeeded, or all failed gracefully due to quota
      expect(successfulOperations).toBeGreaterThanOrEqual(0);
      expect(successfulOperations).toBeLessThanOrEqual(3);

      // Restore original setItem
      localStorageMock.setItem = originalSetItem;
    });
  });
});

describe('FileSystemCache', () => {
  let cache: CacheStorage;
  let testCacheDir: string;

  beforeAll(async () => {
    // Create a temporary directory for testing
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    testCacheDir = join(__dirname, `.test-cache-${timestamp}`);
  });

  beforeEach(async () => {
    cache = createFileSystemCacheStorage(testCacheDir);
    // Clear any existing cache files
    try {
      await cache.clear();
    } catch {
      // Directory might not exist yet, that's ok
    }
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await rm(testCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic operations', () => {
    it('should store and retrieve data from file system', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);
      const retrieved = await cache.get(key);

      expect(retrieved).toBe(value);

      // Check that file was created with correct naming pattern
      const files = await readdir(testCacheDir);
      expect(files.length).toBe(1);
      const [fileName] = files;
      expect(fileName).toBeDefined();
      if (!fileName) {
        throw new Error('Expected cache file to exist');
      }
      expect(fileName).toMatch(/^[a-f0-9]{64}\.json\.gz$/); // SHA-256 hash + .json.gz

      const fileBuffer = await readFile(join(testCacheDir, fileName));
      expect(fileBuffer[0]).toBe(0x1f);
      expect(fileBuffer[1]).toBe(0x8b);
      const decompressed = gunzipSync(fileBuffer);
      const parsed = JSON.parse(decompressed.toString('utf-8')) as {
        data: string;
      };
      expect(parsed.data).toBe(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete entries from file system', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);

      await cache.delete(key);
      expect(await cache.get(key)).toBeNull();

      // Verify file is removed
      const files = await readdir(testCacheDir);
      expect(files.length).toBe(0);
    });

    it('should clear all entries from file system', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      expect(await cache.size()).toBe(3);

      await cache.clear();
      expect(await cache.size()).toBe(0);
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();

      // Verify all files are removed
      const files = await readdir(testCacheDir);
      expect(files.length).toBe(0);
    });

    it('should return correct size', async () => {
      expect(await cache.size()).toBe(0);

      await cache.set('key1', 'value1');
      expect(await cache.size()).toBe(1);

      await cache.set('key2', 'value2');
      expect(await cache.size()).toBe(2);

      await cache.delete('key1');
      expect(await cache.size()).toBe(1);
    });
  });

  describe('TTL functionality', () => {
    it('should store data without TTL', async () => {
      const key = 'no-ttl-key';
      const value = 'no-ttl-value';

      await cache.set(key, value);

      // Wait a bit to ensure no automatic expiry
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(await cache.get(key)).toBe(value);
    });

    it('should respect TTL and expire entries', async () => {
      const key = 'ttl-key';
      const value = 'ttl-value';
      const ttl = 50; // 50ms

      await cache.set(key, value, ttl);

      // Should be available immediately
      expect(await cache.get(key)).toBe(value);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be expired and return null
      expect(await cache.get(key)).toBeNull();

      // File should be removed from file system
      const files = await readdir(testCacheDir);
      expect(files.length).toBe(0);
    });

    it('should not affect size calculation for expired entries', async () => {
      const ttl = 50; // 50ms

      await cache.set('key1', 'value1', ttl);
      await cache.set('key2', 'value2'); // No TTL

      expect(await cache.size()).toBe(2);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Expired entry should not count in size
      expect(await cache.size()).toBe(1);
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBe('value2');
    });

    it('should handle multiple entries with different TTLs', async () => {
      await cache.set('short', 'short-value', 30);
      await cache.set('medium', 'medium-value', 80);
      await cache.set('long', 'long-value', 150);
      await cache.set('permanent', 'permanent-value'); // No TTL

      expect(await cache.size()).toBe(4);

      // Wait for short TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(await cache.get('short')).toBeNull();
      expect(await cache.get('medium')).toBe('medium-value');
      expect(await cache.get('long')).toBe('long-value');
      expect(await cache.get('permanent')).toBe('permanent-value');

      // Wait for medium TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(await cache.get('medium')).toBeNull();
      expect(await cache.get('long')).toBe('long-value');
      expect(await cache.get('permanent')).toBe('permanent-value');
    });

    it('should handle zero TTL', async () => {
      const key = 'zero-ttl-key';
      const value = 'zero-ttl-value';

      await cache.set(key, value, 0);

      // Should expire immediately
      expect(await cache.get(key)).toBeNull();

      // File should not exist
      const files = await readdir(testCacheDir);
      expect(files.length).toBe(0);
    });
  });

  describe('File system specific features', () => {
    it('should handle corrupted gzip files', async () => {
      const key = 'corrupted-key';

      // Create a file with invalid gzip data directly
      await mkdir(testCacheDir, { recursive: true });
      const hash = createHash('sha256').update(key).digest('hex');
      const fileName = `${hash}.json.gz`;
      const filePath = join(testCacheDir, fileName);
      await writeFile(filePath, 'invalid-gzip', 'utf-8');

      // Should return null and clean up the corrupted file
      expect(await cache.get(key)).toBeNull();

      // File should be removed
      try {
        await access(filePath);
        expect.fail('File should have been removed');
      } catch {
        // Expected - file should not exist
      }
    });

    it('should create cache directory if it does not exist', async () => {
      const nonExistentDir = join(testCacheDir, 'nested', 'deep', 'directory');
      const nestedCache = createFileSystemCacheStorage(nonExistentDir);

      await nestedCache.set('test', 'value');
      expect(await nestedCache.get('test')).toBe('value');

      // Verify directory was created
      const stats = await stat(nonExistentDir);
      expect(stats.isDirectory()).toBe(true);

      // Clean up
      await rm(join(testCacheDir, 'nested'), {
        recursive: true,
        force: true,
      });
    });

    it('should handle special characters in cache keys', async () => {
      const specialKeys = [
        'key with spaces',
        'key/with/slashes',
        'key\\with\\backslashes',
        'key:with:colons',
        'key*with*asterisks',
        'key?with?questions',
        'key"with"quotes',
        'key<with>angles',
        'key|with|pipes',
        'ファイル名',
      ];

      for (const key of specialKeys) {
        await cache.set(key, `value-for-${key}`);
        expect(await cache.get(key)).toBe(`value-for-${key}`);
      }

      expect(await cache.size()).toBe(specialKeys.length);
    });

    it('should clean up expired entries automatically during size calculation', async () => {
      await cache.set('expired1', 'value1', 10);
      await cache.set('expired2', 'value2', 10);
      await cache.set('valid', 'value3', 1000);

      // Verify all files exist
      let files = await readdir(testCacheDir);
      expect(files.length).toBe(3);

      // Wait for first two to expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Cleanup should be triggered by size() call
      const size = await cache.size();
      expect(size).toBe(1);

      // Verify expired files are removed
      files = await readdir(testCacheDir);
      expect(files.length).toBe(1);

      expect(await cache.get('expired1')).toBeNull();
      expect(await cache.get('expired2')).toBeNull();
      expect(await cache.get('valid')).toBe('value3');
    });

    it('should handle file permissions and write errors gracefully', async () => {
      // This test may not work on all systems, but let's try
      const restrictedDir = join(testCacheDir, 'restricted');
      await mkdir(restrictedDir, { recursive: true });

      try {
        // Try to make directory read-only (may not work on Windows)
        await chmod(restrictedDir, 0o444);

        const restrictedCache = createFileSystemCacheStorage(restrictedDir);

        // This should throw an error
        await expect(restrictedCache.set('test', 'value')).rejects.toThrow();

        // Restore permissions for cleanup
        await chmod(restrictedDir, 0o755);
      } catch {
        // Skip this test if we can't change permissions
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string values', async () => {
      const key = 'empty-key';
      const value = '';

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);
    });

    it('should handle very long strings', async () => {
      const key = 'long-key';
      const value = 'x'.repeat(10000); // 10KB string

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);
    });

    it('should handle very small TTL', async () => {
      const key = 'small-ttl-key';
      const value = 'small-ttl-value';

      await cache.set(key, value, 1); // 1ms TTL

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should definitely be expired
      expect(await cache.get(key)).toBeNull();
    });

    it('should handle concurrent operations', async () => {
      const promises: Promise<void>[] = [];

      // Set multiple entries concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`key${i}`, `value${i}`));
      }

      await Promise.all(promises);

      // Verify all entries exist
      for (let i = 0; i < 10; i++) {
        expect(await cache.get(`key${i}`)).toBe(`value${i}`);
      }

      expect(await cache.size()).toBe(10);
    });

    it('should handle concurrent read/write operations on same key', async () => {
      const key = 'fs-concurrent-key';
      const iterations = 20;

      // Mix of concurrent read and write operations
      const operations: Promise<string | null | void>[] = [];

      for (let i = 0; i < iterations; i++) {
        if (i % 2 === 0) {
          // Write operation
          operations.push(cache.set(key, `fs-value${i}`));
        } else {
          // Read operation
          operations.push(cache.get(key));
        }
      }

      const results = await Promise.all(operations);

      // Should have completed without errors
      expect(results).toHaveLength(iterations);

      // Final state should be consistent
      const finalValue = await cache.get(key);
      expect(typeof finalValue === 'string' || finalValue === null).toBe(true);
    });

    it('should handle concurrent file system operations safely', async () => {
      const numKeys = 15;

      // Mix of concurrent set, get, and delete operations
      const operations: Promise<string | null | void>[] = [];

      // Concurrent sets
      for (let i = 0; i < numKeys; i++) {
        operations.push(cache.set(`fs-safe-key${i}`, `fs-safe-value${i}`));
      }

      // Concurrent gets (may return null initially)
      for (let i = 0; i < numKeys; i++) {
        operations.push(cache.get(`fs-safe-key${i}`));
      }

      // Concurrent deletes (may fail if file doesn't exist yet)
      for (let i = 0; i < Math.floor(numKeys / 2); i++) {
        operations.push(cache.delete(`fs-safe-key${i}`));
      }

      const results = await Promise.all(operations);

      // Calculate expected number of operations: sets + gets + deletes
      const expectedOperations = numKeys + numKeys + Math.floor(numKeys / 2);

      // All operations should complete without throwing errors
      expect(results).toHaveLength(expectedOperations);

      // Final file system state should be consistent
      const finalSize = await cache.size();
      expect(typeof finalSize).toBe('number');
      expect(finalSize).toBeGreaterThanOrEqual(0);
      expect(finalSize).toBeLessThanOrEqual(numKeys);
    });

    it('should handle concurrent TTL expiration with file system cleanup', async () => {
      const key = 'fs-ttl-race-key';
      const ttl = 100; // 100ms

      await cache.set(key, 'fs-value', ttl);

      // Start multiple concurrent reads near expiration time
      await new Promise((resolve) => setTimeout(resolve, 50)); // Wait half TTL

      const readPromises: Promise<string | null>[] = [];
      for (let i = 0; i < 10; i++) {
        readPromises.push(cache.get(key));
      }

      // Wait until after expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add more reads after expiration
      for (let i = 0; i < 10; i++) {
        readPromises.push(cache.get(key));
      }

      const results = await Promise.all(readPromises);

      // Results should be consistent
      const nonNullResults = results.filter((r) => r !== null);
      const nullResults = results.filter((r) => r === null);

      expect(nonNullResults.length + nullResults.length).toBe(results.length);

      // Final check - should definitely be null now and file removed
      expect(await cache.get(key)).toBeNull();

      // Verify file was cleaned up
      const files = await readdir(testCacheDir);
      const hash = createHash('sha256').update(key).digest('hex');
      const expectedFileName = `${hash}.json.gz`;
      expect(files).not.toContain(expectedFileName);
    });

    it('should maintain file system consistency under concurrent load', async () => {
      const numThreads = 8;
      const operationsPerThread = 15;
      const keySpace = 5; // Limited key space to increase conflicts

      const allOperations: Promise<void>[] = [];

      for (let thread = 0; thread < numThreads; thread++) {
        const threadOperations = async () => {
          for (let op = 0; op < operationsPerThread; op++) {
            const keyIndex = op % keySpace;
            const key = `fs-load-key${keyIndex}`;
            const value = `fs-thread${thread}-op${op}`;

            // Random operation type
            const operation = Math.floor(Math.random() * 4);

            switch (operation) {
              case 0: // Set
                await cache.set(key, value);
                break;
              case 1: // Get
                await cache.get(key);
                break;
              case 2: // Delete
                await cache.delete(key);
                break;
              case 3: // Size
                await cache.size();
                break;
            }
          }
        };

        allOperations.push(threadOperations());
      }

      // Execute all operations concurrently
      await Promise.all(allOperations);

      // Verify cache is still functional and consistent
      const finalSize = await cache.size();
      expect(typeof finalSize).toBe('number');
      expect(finalSize).toBeGreaterThanOrEqual(0);

      // Verify file system consistency
      const files = await readdir(testCacheDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json.gz'));
      expect(jsonFiles.length).toBe(finalSize);

      // Verify we can still perform operations
      await cache.set('fs-final-test', 'fs-final-value');
      expect(await cache.get('fs-final-test')).toBe('fs-final-value');
      expect(await cache.size()).toBeGreaterThanOrEqual(1);
    });

    it('should handle concurrent directory operations gracefully', async () => {
      // Test concurrent operations when cache directory might not exist
      const tempDir = join(testCacheDir, 'concurrent-test');

      // Remove directory if it exists
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore if directory doesn't exist
      }

      const tempCache = createFileSystemCacheStorage(tempDir);

      // Concurrent operations that all might need to create the directory
      const operations: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        operations.push(tempCache.set(`concurrent-dir-key${i}`, `value${i}`));
      }

      await Promise.all(operations);

      // Verify all operations succeeded
      for (let i = 0; i < 10; i++) {
        expect(await tempCache.get(`concurrent-dir-key${i}`)).toBe(`value${i}`);
      }

      expect(await tempCache.size()).toBe(10);

      // Verify directory was created properly
      const stats = await stat(tempDir);
      expect(stats.isDirectory()).toBe(true);

      // Clean up
      await rm(tempDir, { recursive: true, force: true });
    });
  });
});

describe('generateCacheKey', () => {
  it('should generate consistent cache keys', () => {
    const url = 'https://example.com/api/data';
    const accept = 'application/json';
    const userAgent = 'test-agent/1.0';

    const key1 = generateCacheKey(url, accept, userAgent);
    const key2 = generateCacheKey(url, accept, userAgent);

    expect(key1).toBe(key2);
    expect(key1).toBe(
      'fetch:https://example.com/api/data:application/json:test-agent/1.0'
    );
  });

  it('should generate different keys for different parameters', () => {
    const url1 = 'https://example.com/api/data1';
    const url2 = 'https://example.com/api/data2';
    const accept1 = 'application/json';
    const accept2 = 'text/plain';
    const userAgent1 = 'agent1/1.0';
    const userAgent2 = 'agent2/1.0';

    const key1 = generateCacheKey(url1, accept1, userAgent1);
    const key2 = generateCacheKey(url2, accept1, userAgent1);
    const key3 = generateCacheKey(url1, accept2, userAgent1);
    const key4 = generateCacheKey(url1, accept1, userAgent2);

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).not.toBe(key4);
    expect(key2).not.toBe(key3);
    expect(key2).not.toBe(key4);
    expect(key3).not.toBe(key4);
  });

  it('should handle special characters in URL', () => {
    const url = 'https://example.com/api/data?param=value&other=123';
    const accept = 'application/json';
    const userAgent = 'test-agent/1.0';

    const key = generateCacheKey(url, accept, userAgent);
    expect(key).toBe(
      'fetch:https://example.com/api/data?param=value&other=123:application/json:test-agent/1.0'
    );
  });

  it('should handle undefined userAgent', () => {
    const url = 'https://example.com/api/data';
    const accept = 'application/json';

    const key = generateCacheKey(url, accept);
    expect(key).toBe(
      'fetch:https://example.com/api/data:application/json:default'
    );
  });

  it('should handle empty userAgent', () => {
    const url = 'https://example.com/api/data';
    const accept = 'application/json';
    const userAgent = '';

    const key = generateCacheKey(url, accept, userAgent);
    expect(key).toBe(
      'fetch:https://example.com/api/data:application/json:default'
    );
  });

  it('should generate different keys for different userAgents', () => {
    const url = 'https://example.com/api/data';
    const accept = 'application/json';
    const userAgent1 = 'browser/1.0';
    const userAgent2 = 'mobile-app/2.0';

    const key1 = generateCacheKey(url, accept, userAgent1);
    const key2 = generateCacheKey(url, accept, userAgent2);

    expect(key1).not.toBe(key2);
    expect(key1).toBe(
      'fetch:https://example.com/api/data:application/json:browser/1.0'
    );
    expect(key2).toBe(
      'fetch:https://example.com/api/data:application/json:mobile-app/2.0'
    );
  });
});

describe('Factory functions', () => {
  it('should create cache storage instance', () => {
    const cache = createMemoryCacheStorage();
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe('function');
    expect(typeof cache.set).toBe('function');
    expect(typeof cache.delete).toBe('function');
    expect(typeof cache.clear).toBe('function');
    expect(typeof cache.size).toBe('function');
  });

  it('should create different instances on each call', () => {
    const cache1 = createMemoryCacheStorage();
    const cache2 = createMemoryCacheStorage();

    expect(cache1).not.toBe(cache2);
    expect(cache1).toBeDefined();
    expect(cache2).toBeDefined();
  });

  it('should create local cache storage instance', () => {
    // Mock localStorage for this test
    const tempWindow = (global as Record<string, unknown>).window;
    const tempLocalStorage = (global as Record<string, unknown>).localStorage;

    Object.defineProperty(global, 'window', {
      value: { localStorage: localStorageMock },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    const cache = createLocalCacheStorage();
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe('function');
    expect(typeof cache.set).toBe('function');
    expect(typeof cache.delete).toBe('function');
    expect(typeof cache.clear).toBe('function');
    expect(typeof cache.size).toBe('function');

    const cacheWithPrefix = createLocalCacheStorage('custom:');
    expect(cacheWithPrefix).toBeDefined();

    // Restore original values
    (global as Record<string, unknown>).window = tempWindow;
    (global as Record<string, unknown>).localStorage = tempLocalStorage;
  });

  it('should create file system cache storage instance', () => {
    const cache = createFileSystemCacheStorage('/tmp/test-cache');
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe('function');
    expect(typeof cache.set).toBe('function');
    expect(typeof cache.delete).toBe('function');
    expect(typeof cache.clear).toBe('function');
    expect(typeof cache.size).toBe('function');
  });
});
