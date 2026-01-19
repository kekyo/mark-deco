// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { createMutex } from 'async-primitives';
import { promisify } from 'util';

import type { CacheStorage, CacheEntry } from './index';
import { isBrowser } from '../utils';

/**
 * Generate SHA-256 hash for cache key using Node.js crypto module
 * Provides better collision resistance than simple hash algorithms
 * @param input - Input string to hash
 * @returns Promise resolving to hexadecimal hash string
 */
const generateFileHash = async (input: string): Promise<string> => {
  try {
    const hash = createHash('sha256');
    hash.update(input, 'utf8');
    return hash.digest('hex');
  } catch (error) {
    throw new Error(`Failed to generate hash: ${error}`);
  }
};

export interface FileSystemCacheOptions {
  /** Enable gzip compression for cache files (default: true) */
  enableCompression?: boolean;
}

/**
 * Create file system-based cache storage instance
 * Uses Node.js file system to store cache entries as JSON files
 * @param cacheDir - Directory path to store cache files (will be created if it doesn't exist)
 * @param options - File system cache options (optional)
 * @returns FileSystemCache instance that uses file system
 * @throws Error if file system operations fail or if not running in Node.js environment
 */
export const createFileSystemCacheStorage = (
  cacheDir: string,
  options: FileSystemCacheOptions = {}
): CacheStorage => {
  // Check if we're in a browser environment
  if (isBrowser()) {
    throw new Error(
      'File system cache is only available in Node.js environment, not in browsers'
    );
  }

  const { enableCompression = true } = options;

  const mutex = createMutex();
  let gzipAsync: ((input: string | Buffer) => Promise<Buffer>) | null = null;
  let gunzipAsync: ((input: Buffer) => Promise<Buffer>) | null = null;

  const ensureCompression = async (): Promise<void> => {
    if (gzipAsync && gunzipAsync) {
      return;
    }

    const { gzip, gunzip } = await import('zlib');
    gzipAsync = promisify(gzip);
    gunzipAsync = promisify(gunzip);
  };

  /**
   * Generate safe file name from cache key using hash
   */
  const generateFileBaseName = async (key: string): Promise<string> => {
    const hash = await generateFileHash(key);
    return hash;
  };

  const getPlainFileName = (baseName: string): string => `${baseName}.json`;
  const getCompressedFileName = (baseName: string): string =>
    `${baseName}.json.gz`;

  const readCacheEntry = async (
    filePath: string,
    compressed: boolean
  ): Promise<CacheEntry> => {
    if (compressed) {
      await ensureCompression();
      const buffer = await readFile(filePath);
      const unzipped = await gunzipAsync!(buffer);
      return JSON.parse(unzipped.toString('utf-8'));
    }

    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  };

  const isMissingFileError = (error: unknown): boolean =>
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT';

  /**
   * Ensure cache directory exists
   * This operation is idempotent and safe to call concurrently
   */
  const ensureCacheDir = async (): Promise<void> => {
    try {
      await mkdir(cacheDir, { recursive: true });
    } catch (error: unknown) {
      // Ignore EEXIST errors since directory already exists
      if ((error as { code?: string }).code !== 'EEXIST') {
        throw new Error(`Failed to create cache directory: ${error}`);
      }
    }
  };

  const get = async (key: string): Promise<string | null> => {
    // Pre-compute file name outside of lock (pure function)
    const baseName = await generateFileBaseName(key);
    const plainFilePath = join(cacheDir, getPlainFileName(baseName));
    const compressedFilePath = join(cacheDir, getCompressedFileName(baseName));

    // Ensure cache directory exists (idempotent operation)
    try {
      await ensureCacheDir();
    } catch (error) {
      throw new Error(`Failed to ensure cache directory: ${error}`);
    }

    let entry: CacheEntry;
    let filePath: string;

    if (enableCompression) {
      try {
        entry = await readCacheEntry(compressedFilePath, true);
        filePath = compressedFilePath;
      } catch (error) {
        if (!isMissingFileError(error)) {
          try {
            await unlink(compressedFilePath);
          } catch {
            // Ignore cleanup errors
          }
          return null;
        }

        try {
          entry = await readCacheEntry(plainFilePath, false);
          filePath = plainFilePath;
        } catch (plainError) {
          if (!isMissingFileError(plainError)) {
            try {
              await unlink(plainFilePath);
            } catch {
              // Ignore cleanup errors
            }
          }
          return null;
        }
      }
    } else {
      try {
        entry = await readCacheEntry(plainFilePath, false);
        filePath = plainFilePath;
      } catch (error) {
        if (!isMissingFileError(error)) {
          try {
            await unlink(plainFilePath);
          } catch {
            // Ignore cleanup errors
          }
        }
        return null;
      }
    }

    // Check TTL expiration - only lock if we need to delete expired file
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
            await unlink(filePath);
            if (filePath === compressedFilePath) {
              try {
                await unlink(plainFilePath);
              } catch {
                // Ignore cleanup errors
              }
            } else if (filePath === plainFilePath) {
              try {
                await unlink(compressedFilePath);
              } catch {
                // Ignore cleanup errors
              }
            }
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

  const set = async (
    key: string,
    value: string,
    ttl?: number
  ): Promise<void> => {
    // Pre-compute everything possible outside of lock
    const baseName = await generateFileBaseName(key);
    const plainFilePath = join(cacheDir, getPlainFileName(baseName));
    const compressedFilePath = join(cacheDir, getCompressedFileName(baseName));
    const entry: CacheEntry = {
      data: value,
      timestamp: Date.now(),
    };

    if (ttl !== undefined) {
      entry.ttl = ttl;
    }

    const serialized = JSON.stringify(entry, null, 2);
    let payload: string | Buffer;
    if (enableCompression) {
      await ensureCompression();
      payload = await gzipAsync!(serialized);
    } else {
      payload = serialized;
    }

    const lockHandle = await mutex.lock();
    try {
      await ensureCacheDir();

      const filePath = enableCompression ? compressedFilePath : plainFilePath;

      try {
        // For cache systems, last-write-wins is often acceptable
        // We minimize lock time by only protecting the actual write operation
        if (enableCompression) {
          await writeFile(filePath, payload);
          try {
            await unlink(plainFilePath);
          } catch {
            // Ignore cleanup errors
          }
        } else {
          await writeFile(filePath, payload, 'utf-8');
          try {
            await unlink(compressedFilePath);
          } catch {
            // Ignore cleanup errors
          }
        }
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
    const baseName = await generateFileBaseName(key);
    const plainFilePath = join(cacheDir, getPlainFileName(baseName));
    const compressedFilePath = join(cacheDir, getCompressedFileName(baseName));

    const lockHandle = await mutex.lock();
    try {
      await ensureCacheDir();

      try {
        await unlink(plainFilePath);
      } catch {
        // File doesn't exist, ignore the error
      }

      try {
        await unlink(compressedFilePath);
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
    const lockHandle = await mutex.lock();
    try {
      await ensureCacheDir();
      const files = await readdir(cacheDir);

      // Filter files outside the deletion loop for better performance
      const cacheFiles = files.filter(
        (file: string) => file.endsWith('.json') || file.endsWith('.json.gz')
      );

      for (const file of cacheFiles) {
        const filePath = join(cacheDir, file);
        try {
          await unlink(filePath);
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

    // Get file list without lock first
    const files = await readdir(cacheDir);
    const cacheFiles = files.filter(
      (file: string) => file.endsWith('.json') || file.endsWith('.json.gz')
    );

    if (cacheFiles.length === 0) {
      return 0;
    }

    // Clean up expired entries with lock
    const lockHandle = await mutex.lock();
    try {
      const now = Date.now();
      let validCount = 0;

      for (const file of cacheFiles) {
        const filePath = join(cacheDir, file);
        const isCompressed = file.endsWith('.json.gz');
        try {
          const entry = await readCacheEntry(filePath, isCompressed);

          // Check if entry is expired
          if (entry.ttl !== undefined) {
            const isExpired =
              entry.ttl === 0 || now > entry.timestamp + entry.ttl;
            if (isExpired) {
              await unlink(filePath);
              continue; // Don't count this file
            }
          }
          validCount++;
        } catch {
          // If we can't read or parse the file, delete it
          try {
            await unlink(filePath);
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
    size,
  };
};
