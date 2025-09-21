import { createAsyncLock } from 'async-primitives';
import type { CacheStorage, CacheEntry } from './index.js';

/**
 * Generate SHA-256 hash for cache key using Node.js crypto module
 * Provides better collision resistance than simple hash algorithms
 * @param input - Input string to hash
 * @returns Promise resolving to hexadecimal hash string
 */
const generateFileHash = async (input: string): Promise<string> => {
  try {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(input, 'utf8');
    return hash.digest('hex');
  } catch (error) {
    throw new Error(`Failed to generate hash: ${error}`);
  }
};

/**
 * Create file system-based cache storage instance
 * Uses Node.js file system to store cache entries as JSON files
 * @param cacheDir - Directory path to store cache files (will be created if it doesn't exist)
 * @returns FileSystemCache instance that uses file system
 * @throws Error if file system operations fail or if not running in Node.js environment
 */
export const createFileSystemCacheStorage = (cacheDir: string): CacheStorage => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    throw new Error('File system cache is only available in Node.js environment, not in browsers');
  }

  const asyncLock = createAsyncLock();

  /**
   * Generate safe file name from cache key using hash
   */
  const generateFileName = async (key: string): Promise<string> => {
    const hash = await generateFileHash(key);
    return `${hash}.json`;
  };

  /**
   * Ensure cache directory exists
   * This operation is idempotent and safe to call concurrently
   */
  const ensureCacheDir = async (): Promise<void> => {
    try {
      const { promises: fs } = require('fs');
      await fs.mkdir(cacheDir, { recursive: true });
    } catch (error: unknown) {
      // Ignore EEXIST errors since directory already exists
      if ((error as { code?: string }).code !== 'EEXIST') {
        throw new Error(`Failed to create cache directory: ${error}`);
      }
    }
  };

  const get = async (key: string): Promise<string | null> => {
    // Pre-compute file name outside of lock (pure function)
    const fileName = await generateFileName(key);

    // Ensure cache directory exists (idempotent operation)
    try {
      await ensureCacheDir();
    } catch (error) {
      throw new Error(`Failed to ensure cache directory: ${error}`);
    }

    const { promises: fs } = require('fs');
    const path = require('path');
    const filePath = path.join(cacheDir, fileName);

    let entry: CacheEntry;
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      entry = JSON.parse(content);
    } catch {
      // File doesn't exist or invalid JSON
      return null;
    }

    // Check TTL expiration - only lock if we need to delete expired file
    if (entry.ttl !== undefined) {
      const isExpired = entry.ttl === 0 || Date.now() > entry.timestamp + entry.ttl;
      if (isExpired) {
        // Lock only for the deletion operation
        const lockHandle = await asyncLock.lock();
        try {
          // Double-check expiration under lock to avoid race conditions
          const currentTime = Date.now();
          const stillExpired = entry.ttl === 0 || currentTime > entry.timestamp + entry.ttl;
          if (stillExpired) {
            await fs.unlink(filePath);
          }
          return null;
        } catch {
          // File might have been deleted by another process, ignore
          return null;
        } finally {
          lockHandle.release();
        }
      }
    }

    return entry.data;
  };

  const set = async (key: string, value: string, ttl?: number): Promise<void> => {
    // Pre-compute everything possible outside of lock
    const fileName = await generateFileName(key);
    const entry: CacheEntry = {
      data: value,
      timestamp: Date.now()
    };

    if (ttl !== undefined) {
      entry.ttl = ttl;
    }

    const serialized = JSON.stringify(entry, null, 2);

    const lockHandle = await asyncLock.lock();
    try {
      await ensureCacheDir();

      const { promises: fs } = require('fs');
      const path = require('path');
      const filePath = path.join(cacheDir, fileName);

      try {
        // For cache systems, last-write-wins is often acceptable
        // We minimize lock time by only protecting the actual write operation
        await fs.writeFile(filePath, serialized, 'utf-8');
      } catch (error) {
        throw new Error(`Failed to write cache entry: ${error}`);
      }
    } catch (importError) {
      throw new Error(`Failed to import required modules: ${importError}`);
    } finally {
      lockHandle.release();
    }
  };

  const deleteEntry = async (key: string): Promise<void> => {
    // Pre-compute file name outside of lock
    const fileName = await generateFileName(key);

    const lockHandle = await asyncLock.lock();
    try {
      await ensureCacheDir();
      const { promises: fs } = require('fs');
      const path = require('path');
      const filePath = path.join(cacheDir, fileName);

      try {
        await fs.unlink(filePath);
      } catch {
        // File doesn't exist, ignore the error
      }
    } catch (importError) {
      throw new Error(`Failed to import required modules: ${importError}`);
    } finally {
      lockHandle.release();
    }
  };

  const clear = async (): Promise<void> => {
    const lockHandle = await asyncLock.lock();
    try {
      await ensureCacheDir();
      const { promises: fs } = require('fs');
      const path = require('path');
      const files = await fs.readdir(cacheDir);

      // Filter files outside the deletion loop for better performance
      const jsonFiles = files.filter((file: string) => file.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(cacheDir, file);
        try {
          await fs.unlink(filePath);
        } catch {
          // Ignore individual file deletion errors
        }
      }
    } catch (importError) {
      throw new Error(`Failed to import required modules: ${importError}`);
    } finally {
      lockHandle.release();
    }
  };

  const size = async (): Promise<number> => {
    await ensureCacheDir();

    const { promises: fs } = require('fs');
    const path = require('path');

    // Get file list without lock first
    const files = await fs.readdir(cacheDir);
    const jsonFiles = files.filter((file: string) => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return 0;
    }

    // Clean up expired entries with lock
    const lockHandle = await asyncLock.lock();
    try {
      const now = Date.now();
      let validCount = 0;

      for (const file of jsonFiles) {
        const filePath = path.join(cacheDir, file);
        try {
          const fileContent = await fs.readFile(filePath, 'utf8');
          const entry: CacheEntry = JSON.parse(fileContent);

          // Check if entry is expired
          if (entry.ttl !== undefined) {
            const isExpired = entry.ttl === 0 || now > entry.timestamp + entry.ttl;
            if (isExpired) {
              await fs.unlink(filePath);
              continue; // Don't count this file
            }
          }
          validCount++;
        } catch {
          // If we can't read or parse the file, delete it
          try {
            await fs.unlink(filePath);
          } catch {
            // Ignore unlink errors
          }
        }
      }

      return validCount;
    } catch (importError) {
      throw new Error(`Failed to import required modules: ${importError}`);
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
