#!/usr/bin/env node

/**
 * LocalCache usage demonstration
 * Showing how to use localStorage-based cache with TTL and AsyncLock protection
 */

// import { createMarkdownProcessor } from '../src/processor.js';
// import { createOEmbedPlugin } from '../src/plugins/oembed-plugin.js';
import { createLocalCacheStorage, type CacheStorage } from '../src/cache/index.js';

// Example 1: Basic localStorage cache usage
async function basicLocalCacheExample() {
  console.log('=== Basic LocalCache Example ===');

  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.localStorage) {
    console.log('localStorage is not available - skipping browser-specific examples');
    return;
  }

  // Create a localStorage-based cache with custom prefix
  const cache = createLocalCacheStorage('myapp:cache:');

  // Store some data
  console.log('Storing data in localStorage...');
  await cache.set('user:123', JSON.stringify({
    id: 123,
    name: 'John Doe',
    email: 'john@example.com'
  }));

  await cache.set('settings', JSON.stringify({
    theme: 'dark',
    language: 'ja'
  }));

  // Retrieve data
  console.log('Retrieving data from localStorage...');
  const userData = await cache.get('user:123');
  const settings = await cache.get('settings');

  console.log('User data:', userData ? JSON.parse(userData) : null);
  console.log('Settings:', settings ? JSON.parse(settings) : null);

  // Check cache size
  console.log('Cache size:', await cache.size());

  // Data persists across page reloads in browser environment
  console.log('Data will persist across browser sessions');
}

// Example 2: TTL functionality with automatic expiration
async function ttlLocalCacheExample() {
  console.log('\n=== TTL LocalCache Example ===');

  if (typeof window === 'undefined' || !window.localStorage) {
    console.log('localStorage is not available - skipping TTL example');
    return;
  }

  const cache = createLocalCacheStorage('temp:');

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
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('After 3 seconds:');
  console.log('Short-lived:', await cache.get('short-lived')); // Should be null
  console.log('Medium-lived:', await cache.get('medium-lived')); // Should still exist
  console.log('Permanent:', await cache.get('permanent')); // Should still exist
  console.log('Cache size after cleanup:', await cache.size());

  // Wait more and check again
  console.log('\nWaiting 3 more seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('After 6 seconds total:');
  console.log('Medium-lived:', await cache.get('medium-lived')); // Should be null
  console.log('Permanent:', await cache.get('permanent')); // Should still exist
  console.log('Final cache size:', await cache.size());
}

// Example 3: Error handling and recovery
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');

  if (typeof window === 'undefined' || !window.localStorage) {
    console.log('localStorage is not available - demonstrating error handling');

    try {
      const cache = createLocalCacheStorage();
      await cache.set('test', 'value');
    } catch (error) {
      console.log('Expected error caught:', (error as Error).message);
    }
    return;
  }

  const cache = createLocalCacheStorage('test:');

  console.log('Demonstrating corrupted data handling...');

  // Manually corrupt data in localStorage
  localStorage.setItem('test:corrupted', 'invalid-json-data');

  // Try to retrieve corrupted data
  const result = await cache.get('corrupted');
  console.log('Corrupted data result:', result); // Should be null

  // Verify cleanup happened
  const cleanedUp = localStorage.getItem('test:corrupted');
  console.log('Corrupted entry cleaned up:', cleanedUp === null);

  console.log('Normal operation continues...');
  await cache.set('normal', 'normal-data');
  console.log('Normal data:', await cache.get('normal'));
}

// Example 4: Manual cleanup and maintenance
async function maintenanceExample() {
  console.log('\n=== Maintenance Example ===');

  if (typeof window === 'undefined' || !window.localStorage) {
    console.log('localStorage is not available - skipping maintenance example');
    return;
  }

  const cache = createLocalCacheStorage('maintenance:') as CacheStorage;

  // Add some data with very short TTL
  console.log('Adding data that will expire soon...');
  await cache.set('expired1', 'data1', 10); // 10ms TTL
  await cache.set('expired2', 'data2', 10); // 10ms TTL
  await cache.set('expired3', 'data3', 10); // 10ms TTL
  await cache.set('permanent', 'permanent-data'); // No TTL

  console.log('Cache size before expiration:', await cache.size());

  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 50));

  console.log('Cache size after automatic cleanup:', await cache.size());
  console.log('Permanent data still exists:', await cache.get('permanent'));

  // Clear all cache data
  console.log('Clearing all cache data...');
  await cache.clear();
  console.log('Cache size after clear:', await cache.size());
}

// Example 5: Concurrent access with AsyncLock protection
async function concurrentAccessExample() {
  console.log('\n=== Concurrent Access Example ===');

  if (typeof window === 'undefined' || !window.localStorage) {
    console.log('localStorage is not available - skipping concurrent access example');
    return;
  }

  const cache = createLocalCacheStorage('concurrent:');

  console.log('Demonstrating concurrent operations...');

  // Simulate multiple operations happening concurrently
  const operations: Promise<void>[] = [];

  for (let i = 0; i < 5; i++) {
    operations.push(
      cache.set(`key${i}`, `value${i}`, 1000)
    );
  }

  // Wait for all operations to complete
  await Promise.all(operations);
  console.log('All concurrent set operations completed');

  // Concurrent reads
  const readOperations: Promise<string | null>[] = [];
  for (let i = 0; i < 5; i++) {
    readOperations.push(cache.get(`key${i}`));
  }

  const results = await Promise.all(readOperations);
  console.log('Concurrent read results:', results);

  console.log('Final cache size:', await cache.size());
}

// Example 6: Multiple cache instances with different prefixes
async function multipleCacheExample() {
  console.log('\n=== Multiple Cache Instances Example ===');

  if (typeof window === 'undefined' || !window.localStorage) {
    console.log('localStorage is not available - skipping multiple cache example');
    return;
  }

  // Create different cache instances for different purposes
  const userCache = createLocalCacheStorage('user:');
  const configCache = createLocalCacheStorage('config:');
  const sessionCache = createLocalCacheStorage('session:');

  // Store data in different caches
  await userCache.set('current', JSON.stringify({ id: 1, name: 'User' }));
  await configCache.set('theme', 'dark');
  await sessionCache.set('token', 'abc123', 3600000); // 1 hour TTL

  console.log('User cache size:', await userCache.size());
  console.log('Config cache size:', await configCache.size());
  console.log('Session cache size:', await sessionCache.size());

  // Clear only one cache
  await sessionCache.clear();

  console.log('After clearing session cache:');
  console.log('User cache size:', await userCache.size());
  console.log('Config cache size:', await configCache.size());
  console.log('Session cache size:', await sessionCache.size());

  // Data in other caches remains intact
  console.log('User data still exists:', await userCache.get('current'));
  console.log('Config data still exists:', await configCache.get('theme'));
}

// Run all examples
export async function runLocalCacheDemo() {
  try {
    await basicLocalCacheExample();
    await ttlLocalCacheExample();
    await errorHandlingExample();
    await maintenanceExample();
    await concurrentAccessExample();
    await multipleCacheExample();

    console.log('\n=== All LocalCache examples completed successfully! ===');
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Uncomment to run the demo in browser
// runLocalCacheDemo();
