#!/usr/bin/env node
// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

/**
 * FileSystemCache usage demonstration
 * Showing how to use file system-based cache with TTL and Mutex protection
 */

// import { createMarkdownProcessor } from '../src/processor';
// import { createOEmbedPlugin } from '../src/plugins/oembed-plugin';
// import type { CacheStorage } from '../src/cache/index';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFileSystemCacheStorage } from '../src/cache/index';

// Get current directory for examples
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheBaseDir = path.join(__dirname, '.cache');

// Example 1: Basic file system cache usage
async function basicFileSystemCacheExample() {
  console.log('=== Basic FileSystemCache Example ===');

  // Create a file system-based cache
  const cacheDir = path.join(cacheBaseDir, 'basic-cache');
  const cache = createFileSystemCacheStorage(cacheDir);

  // Store some data
  console.log('Storing data in file system...');
  await cache.set(
    'user:123',
    JSON.stringify({
      id: 123,
      name: 'John Doe',
      email: 'john@example.com',
    })
  );

  await cache.set(
    'settings',
    JSON.stringify({
      theme: 'dark',
      language: 'ja',
    })
  );

  // Store data with special characters in key
  await cache.set(
    'url:https://example.com/api?param=value&other=123',
    'API response data'
  );

  // Retrieve data
  console.log('Retrieving data from file system...');
  const userData = await cache.get('user:123');
  const settings = await cache.get('settings');
  const apiData = await cache.get(
    'url:https://example.com/api?param=value&other=123'
  );

  console.log('User data:', userData ? JSON.parse(userData) : null);
  console.log('Settings:', settings ? JSON.parse(settings) : null);
  console.log('API data:', apiData);

  // Check cache size
  console.log('Cache size:', await cache.size());

  // Data persists across application restarts
  console.log('Data will persist across application restarts');
  console.log('Cache directory:', cacheDir);
}

// Example 2: TTL functionality with automatic expiration
async function ttlFileSystemCacheExample() {
  console.log('\n=== TTL FileSystemCache Example ===');

  const cacheDir = path.join(cacheBaseDir, 'ttl-cache');
  const cache = createFileSystemCacheStorage(cacheDir);

  // Store data with different TTLs
  console.log('Storing temporary data with TTL...');
  await cache.set('short-lived', 'This expires in 2 seconds', 2000);
  await cache.set('medium-lived', 'This expires in 5 seconds', 5000);
  await cache.set('permanent', 'This never expires'); // No TTL

  console.log('Initial cache size:', await cache.size());

  // Check data immediately
  console.log('Immediately after storing:');
  console.log('Short-lived:', await cache.get('short-lived'));
  console.log('Medium-lived:', await cache.get('medium-lived'));
  console.log('Permanent:', await cache.get('permanent'));

  // Wait and check again
  console.log('\nWaiting 3 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('After 3 seconds:');
  console.log('Short-lived:', await cache.get('short-lived')); // Should be null
  console.log('Medium-lived:', await cache.get('medium-lived')); // Should still exist
  console.log('Permanent:', await cache.get('permanent')); // Should still exist
  console.log('Cache size after cleanup:', await cache.size());

  // Wait more and check again
  console.log('\nWaiting 3 more seconds...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('After 6 seconds total:');
  console.log('Medium-lived:', await cache.get('medium-lived')); // Should be null
  console.log('Permanent:', await cache.get('permanent')); // Should still exist
  console.log('Final cache size:', await cache.size());
}

// Example 3: Special characters and edge cases
async function edgeCasesExample() {
  console.log('\n=== Edge Cases Example ===');

  const cacheDir = path.join(cacheBaseDir, 'edge-cases');
  const cache = createFileSystemCacheStorage(cacheDir);

  console.log('Testing special characters in keys...');

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
    'ファイル名', // Japanese characters
    '🚀🎉💾', // Emojis
    '', // Empty string
    'very-long-key-' + 'x'.repeat(200), // Very long key
  ];

  // Store data with special keys
  for (const key of specialKeys) {
    await cache.set(key, `value-for-${key}-${Date.now()}`);
  }

  console.log(
    `Successfully stored ${specialKeys.length} entries with special characters`
  );
  console.log('Cache size:', await cache.size());

  // Retrieve and verify all data
  let successCount = 0;
  for (const key of specialKeys) {
    const value = await cache.get(key);
    if (value !== null) {
      successCount++;
    }
  }

  console.log(
    `Successfully retrieved ${successCount}/${specialKeys.length} entries`
  );

  // Test very large data
  console.log('\nTesting large data storage...');
  const largeData = 'x'.repeat(100000); // 100KB string
  await cache.set('large-data', largeData);
  const retrievedLargeData = await cache.get('large-data');
  console.log('Large data matches:', retrievedLargeData === largeData);
  console.log('Large data size:', retrievedLargeData?.length, 'characters');
}

// Example 4: Error handling and recovery
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');

  const cacheDir = path.join(cacheBaseDir, 'error-handling');
  const cache = createFileSystemCacheStorage(cacheDir);

  console.log('Testing normal operation...');
  await cache.set('normal', 'normal-data');
  console.log('Normal data:', await cache.get('normal'));

  console.log('\nTesting non-existent key...');
  const nonExistent = await cache.get('does-not-exist');
  console.log('Non-existent key result:', nonExistent);

  console.log('\nTesting invalid cache directory...');
  try {
    // Try to create cache in a location that might cause issues
    const invalidCache = createFileSystemCacheStorage(
      '/dev/null/impossible-path'
    );
    await invalidCache.set('test', 'value');
  } catch (error) {
    console.log('Expected error for invalid path:', (error as Error).message);
  }
}

// Example 5: Concurrent access with Mutex protection
async function concurrentAccessExample() {
  console.log('\n=== Concurrent Access Example ===');

  const cacheDir = path.join(cacheBaseDir, 'concurrent');
  const cache = createFileSystemCacheStorage(cacheDir);

  console.log('Demonstrating concurrent operations...');

  // Simulate multiple operations happening concurrently
  const operations: Promise<void>[] = [];

  for (let i = 0; i < 10; i++) {
    operations.push(cache.set(`key${i}`, `value${i}-${Date.now()}`, 10000));
  }

  // Wait for all operations to complete
  await Promise.all(operations);
  console.log('All concurrent set operations completed');

  // Concurrent reads
  const readOperations: Promise<string | null>[] = [];
  for (let i = 0; i < 10; i++) {
    readOperations.push(cache.get(`key${i}`));
  }

  const results = await Promise.all(readOperations);
  console.log(
    'Concurrent read results count:',
    results.filter((r) => r !== null).length
  );

  console.log('Final cache size:', await cache.size());
}

// Example 6: Multiple cache instances with different directories
async function multipleCacheInstancesExample() {
  console.log('\n=== Multiple Cache Instances Example ===');

  // Create separate cache instances for different purposes
  const userCache = createFileSystemCacheStorage(
    path.join(cacheBaseDir, 'users')
  );
  const sessionCache = createFileSystemCacheStorage(
    path.join(cacheBaseDir, 'sessions')
  );
  const apiCache = createFileSystemCacheStorage(
    path.join(cacheBaseDir, 'api-responses')
  );

  console.log('Setting up separate cache instances...');

  // Store data in different caches
  await userCache.set(
    'user:alice',
    JSON.stringify({ name: 'Alice', role: 'admin' })
  );
  await userCache.set(
    'user:bob',
    JSON.stringify({ name: 'Bob', role: 'user' })
  );

  await sessionCache.set(
    'session:abc123',
    JSON.stringify({ userId: 'alice', expires: Date.now() + 3600000 }),
    3600000
  );

  await apiCache.set(
    'weather:tokyo',
    JSON.stringify({ temp: 22, humidity: 60 }),
    300000
  ); // 5 minutes TTL

  console.log('User cache size:', await userCache.size());
  console.log('Session cache size:', await sessionCache.size());
  console.log('API cache size:', await apiCache.size());

  // Demonstrate isolation
  console.log('Caches are isolated:');
  console.log('User from user cache:', await userCache.get('user:alice'));
  console.log('User from session cache:', await sessionCache.get('user:alice')); // Should be null
}

// Example 7: Cache maintenance and cleanup
async function maintenanceExample() {
  console.log('\n=== Maintenance Example ===');

  const cacheDir = path.join(cacheBaseDir, 'maintenance');
  const cache = createFileSystemCacheStorage(cacheDir);

  // Add some data with very short TTL
  console.log('Adding data that will expire soon...');
  for (let i = 0; i < 5; i++) {
    await cache.set(`expired${i}`, `data${i}`, 10); // 10ms TTL
  }
  await cache.set('permanent', 'permanent-data'); // No TTL

  console.log('Cache size before expiration:', await cache.size());

  // Wait for expiration
  await new Promise((resolve) => setTimeout(resolve, 50));

  console.log('Cache size after automatic cleanup:', await cache.size());
  console.log('Permanent data still exists:', await cache.get('permanent'));

  // Manual cleanup - clear all cache data
  console.log('Performing manual cleanup...');
  await cache.clear();
  console.log('Cache size after manual clear:', await cache.size());
}

// Example 8: Real-world usage patterns
async function realWorldUsageExample() {
  console.log('\n=== Real-World Usage Example ===');

  const apiCache = createFileSystemCacheStorage(
    path.join(cacheBaseDir, 'api-cache')
  );

  // Simulate API response caching
  console.log('Simulating API response caching...');

  const mockApiResponses = [
    {
      url: 'https://api.example.com/users/1',
      data: { id: 1, name: 'Alice' },
      ttl: 300000,
    }, // 5 minutes
    {
      url: 'https://api.example.com/posts/recent',
      data: { posts: [1, 2, 3] },
      ttl: 60000,
    }, // 1 minute
    {
      url: 'https://api.example.com/config',
      data: { version: '1.0', features: ['a', 'b'] },
      ttl: 3600000,
    }, // 1 hour
  ];

  // Cache API responses
  for (const mock of mockApiResponses) {
    const cacheKey = `api:${mock.url}`;
    await apiCache.set(cacheKey, JSON.stringify(mock.data), mock.ttl);
    console.log(`Cached response for ${mock.url}`);
  }

  console.log('API cache size:', await apiCache.size());

  // Simulate cache hits
  console.log('\nSimulating cache lookups...');
  for (const mock of mockApiResponses) {
    const cacheKey = `api:${mock.url}`;
    const cached = await apiCache.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT for ${mock.url}`);
    } else {
      console.log(`Cache MISS for ${mock.url}`);
    }
  }
}

// Main demo function
export async function runFileSystemCacheDemo() {
  console.log('FileSystem Cache Demo - Starting...\n');

  try {
    await basicFileSystemCacheExample();
    await ttlFileSystemCacheExample();
    await edgeCasesExample();
    await errorHandlingExample();
    await concurrentAccessExample();
    await multipleCacheInstancesExample();
    await maintenanceExample();
    await realWorldUsageExample();

    console.log('\n=== FileSystem Cache Demo Complete ===');
    console.log('All examples completed successfully!');
    console.log(`Cache files are stored in: ${cacheBaseDir}`);
    console.log(
      'You can inspect the generated cache files to see how data is stored.'
    );
  } catch (error) {
    console.error('Demo failed with error:', error);
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFileSystemCacheDemo().catch(console.error);
}
