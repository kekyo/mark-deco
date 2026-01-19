## Fetcher and Cache System

MarkDeco provides a fetcher system that uniformly manages external server access. All external server access (oEmbed API calls, page scraping, etc.) is executed through fetchers, and responses are automatically cached.

### Fetcher Types

MarkDeco provides two types of fetchers:

```typescript
import { createCachedFetcher, createDirectFetcher } from 'mark-deco';

// Cached fetcher (recommended)
const cachedFetcher = createCachedFetcher('MyApp/1.0');

// Direct fetcher (no cache)
const directFetcher = createDirectFetcher('MyApp/1.0');
```

### Cache Storage Selection

You can choose from three types of cache storage:

#### Memory Storage (Default)

```typescript
import { createCachedFetcher, createMemoryCacheStorage } from 'mark-deco';

const memoryStorage = createMemoryCacheStorage();
const fetcher = createCachedFetcher(
  'MyApp/1.0', // User agent
  60000, // Timeout (milliseconds)
  memoryStorage // Cache storage
);
```

#### Local Storage (Browser Environment)

```typescript
import { createLocalCacheStorage } from 'mark-deco/browser';

const localStorage = createLocalCacheStorage('myapp:');
const fetcher = createCachedFetcher('MyApp/1.0', 60000, localStorage);
```

#### File System Storage (Node.js Environment)

```typescript
import { createFileSystemCacheStorage } from 'mark-deco';

// Specify cache file storage location
const fileStorage = createFileSystemCacheStorage('./cache', {
  enableCompression: true, // default: true
});
const fetcher = createCachedFetcher('MyApp/1.0', 60000, fileStorage);
```

When compression is enabled, cache files are stored as `.json.gz`. If a `.json.gz` file is missing, the cache falls back to a legacy `.json` file for that key.

### Cache Options

You can control detailed cache behavior:

```typescript
const fetcher = createCachedFetcher('MyApp/1.0', 60000, fileStorage, {
  cache: true, // Enable/disable cache
  cacheTTL: 30 * 60 * 1000, // Cache time-to-live (30 minutes)
  cacheFailures: true, // Cache failed requests too
  failureCacheTTL: 5 * 60 * 1000, // Failure cache time-to-live (5 minutes)
});
```

Cache behavior on fetch failures:

- Success cache: Successful responses are retained until the specified TTL and aren't deleted even on failures.
- Failure cache: When `cacheFailures` is `true`, failures are also cached with a separate TTL (`failureCacheTTL`).
- Old data protection: Existing success cache isn't affected even if new requests fail.

Caching reduces duplicate requests to the same URL and improves performance.
