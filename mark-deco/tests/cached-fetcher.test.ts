// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from 'vitest';
import {
  generateCacheKey,
  createMemoryCacheStorage,
} from '../src/cache/index.js';
import { createCachedFetcher } from '../src/fetcher.js';

// Mock fetch globally
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
globalThis.fetch = mockFetch;

describe('createCachedFetcher', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should create a fetcher interface with correct structure', () => {
    const userAgent = 'test-user-agent';
    const timeout = 5000;

    const fetcherInterface = createCachedFetcher(userAgent, timeout);

    expect(typeof fetcherInterface).toBe('object');
    expect(typeof fetcherInterface.rawFetcher).toBe('function');
    expect(fetcherInterface.userAgent).toBe(userAgent);
    expect(fetcherInterface.rawFetcher.length).toBe(4); // url, accept, signal, logger parameters
  });

  it('should call fetchData with correct parameters', async () => {
    const userAgent = 'test-user-agent';
    const timeout = 5000;
    const url = 'https://api.example.com/data';
    const accept = 'application/json';

    mockFetch.mockResolvedValueOnce(
      new Response('{"test": "data"}', {
        status: 200,
        headers: { 'Content-Type': accept },
      })
    );

    const fetcherInterface = createCachedFetcher(userAgent, timeout);
    const response = await fetcherInterface.rawFetcher(url, accept, undefined);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: accept,
          'User-Agent': userAgent,
        }),
        signal: expect.any(AbortSignal),
      })
    );
    expect(response).toBeInstanceOf(Response);
  });

  it('should work with specified userAgent', async () => {
    const userAgent = 'test-user-agent/1.0.0';
    const timeout = 5000;
    const url = 'https://api.example.com/data';
    const accept = 'application/json';

    mockFetch.mockResolvedValueOnce(
      new Response('{"test": "data"}', {
        status: 200,
        headers: { 'Content-Type': accept },
      })
    );

    const fetcherInterface = createCachedFetcher(userAgent, timeout);
    const response = await fetcherInterface.rawFetcher(url, accept, undefined);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: accept,
          'User-Agent': userAgent,
        }),
        signal: expect.any(AbortSignal),
      })
    );
    expect(response).toBeInstanceOf(Response);
    // Should have the specified userAgent
    expect(fetcherInterface.userAgent).toBe(userAgent);
  });

  it('should handle AbortSignal correctly', async () => {
    const userAgent = 'test-user-agent';
    const timeout = 5000;
    const url = 'https://api.example.com/data';
    const accept = 'application/json';
    const abortController = new AbortController();

    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const fetcherInterface = createCachedFetcher(userAgent, timeout);
    await fetcherInterface.rawFetcher(url, accept, abortController.signal);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('should handle HTTP errors correctly', async () => {
    const userAgent = 'test-user-agent';
    const timeout = 5000;
    const url = 'https://api.example.com/error';
    const accept = 'application/json';

    mockFetch.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    const fetcherInterface = createCachedFetcher(userAgent, timeout);

    await expect(
      fetcherInterface.rawFetcher(url, accept, undefined)
    ).rejects.toThrow('HTTP error, status: 404');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('should handle network errors correctly', async () => {
    const userAgent = 'test-user-agent';
    const timeout = 5000;
    const url = 'https://api.example.com/network-error';
    const accept = 'application/json';

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const fetcherInterface = createCachedFetcher(userAgent, timeout);

    await expect(
      fetcherInterface.rawFetcher(url, accept, undefined)
    ).rejects.toThrow('Network error');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('should handle timeout correctly', async () => {
    const userAgent = 'test-user-agent';
    const timeout = 10; // 10ms timeout
    const url = 'https://api.example.com/slow';
    const accept = 'application/json';

    // Simulate a slow request that doesn't respect AbortSignal
    mockFetch.mockImplementationOnce((_, options) => {
      const signal = options?.signal;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(new Response('{}', { status: 200 }));
        }, 100); // 100ms delay, but timeout is 10ms

        // Properly handle abort signal
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('The operation was aborted'));
          });
        }
      });
    });

    const fetcherInterface = createCachedFetcher(userAgent, timeout);

    await expect(
      fetcherInterface.rawFetcher(url, accept, undefined)
    ).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('should create different fetcher instances with different configurations', () => {
    const fetcher1 = createCachedFetcher('user-agent-1', 1000);
    const fetcher2 = createCachedFetcher('user-agent-2', 2000);

    expect(fetcher1).not.toBe(fetcher2);
    expect(typeof fetcher1).toBe('object');
    expect(typeof fetcher2).toBe('object');
    expect(fetcher1.userAgent).toBe('user-agent-1');
    expect(fetcher2.userAgent).toBe('user-agent-2');
  });

  describe('Caching functionality', () => {
    it('should cache responses and return cached data on subsequent requests', async () => {
      const userAgent = 'test-user-agent';
      const timeout = 5000;
      const url = 'https://api.example.com/cached';
      const accept = 'application/json';
      const responseData = '{"cached": true}';

      mockFetch.mockResolvedValue(
        new Response(responseData, {
          status: 200,
          headers: { 'Content-Type': accept },
        })
      );

      const fetcherInterface = createCachedFetcher(userAgent, timeout);

      // First request - should hit network
      const response1 = await fetcherInterface.rawFetcher(
        url,
        accept,
        undefined
      );
      expect(mockFetch).toHaveBeenCalledOnce();
      expect(await response1.text()).toBe(responseData);

      // Second request - should hit cache
      const response2 = await fetcherInterface.rawFetcher(
        url,
        accept,
        undefined
      );
      expect(mockFetch).toHaveBeenCalledOnce(); // Still only one call
      expect(await response2.text()).toBe(responseData);
      expect(response2.headers.get('X-Cache')).toBe('HIT');
    });

    it('should not cache failed responses', async () => {
      const userAgent = 'test-user-agent';
      const timeout = 5000;
      const url = 'https://api.example.com/not-cached-error';
      const accept = 'application/json';

      mockFetch.mockResolvedValue(
        new Response('Server Error', { status: 500 })
      );

      const fetcherInterface = createCachedFetcher(
        userAgent,
        timeout,
        undefined,
        {
          cache: true,
          cacheFailures: false, // Disable failure caching
        }
      );

      // Both requests should hit network
      await expect(
        fetcherInterface.rawFetcher(url, accept, undefined)
      ).rejects.toThrow('HTTP error, status: 500');
      await expect(
        fetcherInterface.rawFetcher(url, accept, undefined)
      ).rejects.toThrow('HTTP error, status: 500');

      expect(mockFetch).toHaveBeenCalledTimes(2); // Both requests hit network
    });

    it('should cache failed responses when cacheFailures is enabled', async () => {
      const userAgent = 'test-user-agent';
      const timeout = 5000;
      const url = 'https://api.example.com/error-cached';
      const accept = 'application/json';

      mockFetch.mockResolvedValue(new Response('Not Found', { status: 404 }));

      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const fetcherInterface = createCachedFetcher(
        userAgent,
        timeout,
        undefined,
        {
          cache: true,
          cacheFailures: true,
          failureCacheTTL: 1000,
        }
      );

      // First request should hit network and fail
      await expect(
        fetcherInterface.rawFetcher(url, accept, undefined, mockLogger)
      ).rejects.toThrow('HTTP error, status: 404');
      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cache MISS for URL: https://api.example.com/error-cached'
      );

      // Second request should use cached failure
      await expect(
        fetcherInterface.rawFetcher(url, accept, undefined, mockLogger)
      ).rejects.toThrow('Cached error');
      expect(mockFetch).toHaveBeenCalledOnce(); // Still only one call
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cache HIT (error) for URL: https://api.example.com/error-cached'
      );
    });

    it('should cache network errors when cacheFailures is enabled', async () => {
      const userAgent = 'test-user-agent';
      const timeout = 5000;
      const url = 'https://api.example.com/network-error-cached';
      const accept = 'application/json';

      mockFetch.mockRejectedValue(new Error('Network error'));

      const fetcherInterface = createCachedFetcher(
        userAgent,
        timeout,
        undefined,
        {
          cache: true,
          cacheFailures: true,
          failureCacheTTL: 1000,
        }
      );

      // First request should hit network and fail
      await expect(
        fetcherInterface.rawFetcher(url, accept, undefined)
      ).rejects.toThrow('Network error');
      expect(mockFetch).toHaveBeenCalledOnce();

      // Second request should use cached failure
      await expect(
        fetcherInterface.rawFetcher(url, accept, undefined)
      ).rejects.toThrow('Cached error');
      expect(mockFetch).toHaveBeenCalledOnce(); // Still only one call
    });

    it('should respect failure cache TTL', async () => {
      const userAgent = 'test-user-agent';
      const timeout = 5000;
      const url = 'https://api.example.com/ttl-error';
      const accept = 'application/json';

      mockFetch.mockResolvedValue(
        new Response('Service Unavailable', { status: 503 })
      );

      const failureCacheTTL = 50; // 50ms
      const fetcherInterface = createCachedFetcher(
        userAgent,
        timeout,
        undefined,
        {
          cache: true,
          cacheFailures: true,
          failureCacheTTL,
        }
      );

      // First request should hit network and fail
      await expect(
        fetcherInterface.rawFetcher(url, accept, undefined)
      ).rejects.toThrow('HTTP error, status: 503');
      expect(mockFetch).toHaveBeenCalledOnce();

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, failureCacheTTL + 10));

      // Third request should hit network again after TTL expiry
      await expect(
        fetcherInterface.rawFetcher(url, accept, undefined)
      ).rejects.toThrow('HTTP error, status: 503');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect cache TTL', async () => {
      const userAgent = 'test-user-agent';
      const timeout = 5000;
      const url = 'https://api.example.com/ttl-success';
      const accept = 'application/json';
      const responseData = '{"ttl": "test"}';

      mockFetch.mockResolvedValue(
        new Response(responseData, {
          status: 200,
          headers: { 'Content-Type': accept },
        })
      );

      const cacheTTL = 50; // 50ms
      const fetcherInterface = createCachedFetcher(
        userAgent,
        timeout,
        undefined,
        {
          cache: true,
          cacheTTL,
        }
      );

      // First request
      await fetcherInterface.rawFetcher(url, accept, undefined);
      expect(mockFetch).toHaveBeenCalledOnce();

      // Second request within TTL - should hit cache
      await fetcherInterface.rawFetcher(url, accept, undefined);
      expect(mockFetch).toHaveBeenCalledOnce();

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, cacheTTL + 10));

      // Third request should hit network again
      await fetcherInterface.rawFetcher(url, accept, undefined);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should allow disabling cache', async () => {
      const userAgent = 'test-user-agent';
      const timeout = 5000;
      const url = 'https://api.example.com/no-cache';
      const accept = 'application/json';
      const responseData = '{"cache": false}';

      mockFetch.mockResolvedValue(
        new Response(responseData, {
          status: 200,
          headers: { 'Content-Type': accept },
        })
      );

      const fetcherInterface = createCachedFetcher(
        userAgent,
        timeout,
        undefined,
        {
          cache: false, // Disable caching
        }
      );

      // Both requests should hit network
      await fetcherInterface.rawFetcher(url, accept, undefined);
      await fetcherInterface.rawFetcher(url, accept, undefined);

      expect(mockFetch).toHaveBeenCalledTimes(2); // Both requests hit network
    });

    it('should use custom cache storage', async () => {
      const userAgent = 'test-user-agent';
      const timeout = 5000;
      const url = 'https://api.example.com/custom-cache';
      const accept = 'application/json';
      const responseData = '{"custom": "cache"}';

      const customCache = createMemoryCacheStorage();
      const cacheKey = generateCacheKey(url, accept, userAgent);

      // Pre-populate cache
      await customCache.set(
        cacheKey,
        JSON.stringify({
          type: 'success',
          data: responseData,
          timestamp: Date.now(),
        })
      );

      const fetcherInterface = createCachedFetcher(
        userAgent,
        timeout,
        customCache,
        {
          cache: true,
        }
      );

      // Should return cached data without hitting network
      const response = await fetcherInterface.rawFetcher(
        url,
        accept,
        undefined
      );
      expect(mockFetch).not.toHaveBeenCalled();
      expect(await response.text()).toBe(responseData);
      expect(response.headers.get('X-Cache')).toBe('HIT');
    });
  });

  // Test for removed functionality - now userAgent is always required
  it('should require userAgent parameter', () => {
    const timeout = 5000;

    // TypeScriptコンパイラはuserAgentを必須とするため、
    // この呼び出しはコンパイル時エラーとなるはずです
    // const fetcherInterface = createCachedFetcher(undefined, timeout);

    // 代わりに、正常なuserAgentでテストを行います
    const testUserAgent = 'test-required-user-agent/1.0.0';
    const fetcherInterface = createCachedFetcher(testUserAgent, timeout);

    expect(fetcherInterface.userAgent).toBe(testUserAgent);
    expect(typeof fetcherInterface.rawFetcher).toBe('function');
  });
});
