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
import { createDirectFetcher } from '../src/fetcher.js';

// Mock fetch globally
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
globalThis.fetch = mockFetch;

describe('createDirectFetcher', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should create a fetcher interface with correct structure', () => {
    const userAgent = 'test-direct-fetcher';
    const timeout = 5000;

    const fetcherInterface = createDirectFetcher(userAgent, timeout);

    expect(typeof fetcherInterface).toBe('object');
    expect(typeof fetcherInterface.rawFetcher).toBe('function');
    expect(fetcherInterface.userAgent).toBe(userAgent);
    expect(fetcherInterface.rawFetcher.length).toBe(4); // url, accept, signal, logger parameters
  });

  it('should call fetch directly without caching', async () => {
    const userAgent = 'test-direct-fetcher';
    const timeout = 5000;
    const url = 'https://api.example.com/data';
    const accept = 'application/json';
    const responseData = '{"test": "data"}';

    mockFetch.mockResolvedValueOnce(
      new Response(responseData, {
        status: 200,
        headers: { 'Content-Type': accept },
      })
    );

    const fetcherInterface = createDirectFetcher(userAgent, timeout);
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
    expect(await response.text()).toBe(responseData);
  });

  it('should not use caching - each request hits network', async () => {
    const userAgent = 'test-direct-fetcher';
    const timeout = 5000;
    const url = 'https://api.example.com/no-cache';
    const accept = 'application/json';
    const responseData = '{"no": "cache"}';

    // Mock different responses for each call to verify no caching
    mockFetch
      .mockResolvedValueOnce(
        new Response(responseData, {
          status: 200,
          headers: { 'Content-Type': accept },
        })
      )
      .mockResolvedValueOnce(
        new Response(responseData, {
          status: 200,
          headers: { 'Content-Type': accept },
        })
      )
      .mockResolvedValueOnce(
        new Response(responseData, {
          status: 200,
          headers: { 'Content-Type': accept },
        })
      );

    const fetcherInterface = createDirectFetcher(userAgent, timeout);

    // First request
    const response1 = await fetcherInterface.rawFetcher(url, accept, undefined);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(await response1.text()).toBe(responseData);

    // Second request - should hit network again (no caching)
    const response2 = await fetcherInterface.rawFetcher(url, accept, undefined);
    expect(mockFetch).toHaveBeenCalledTimes(2); // Both requests hit network
    expect(await response2.text()).toBe(responseData);

    // Third request - should also hit network
    const response3 = await fetcherInterface.rawFetcher(url, accept, undefined);
    expect(mockFetch).toHaveBeenCalledTimes(3); // All requests hit network
    expect(await response3.text()).toBe(responseData);
  });

  it('should work with specified userAgent', async () => {
    const userAgent = 'direct-fetcher/1.0.0';
    const timeout = 5000;
    const url = 'https://api.example.com/data';
    const accept = 'application/json';

    mockFetch.mockResolvedValueOnce(
      new Response('{"test": "data"}', {
        status: 200,
        headers: { 'Content-Type': accept },
      })
    );

    const fetcherInterface = createDirectFetcher(userAgent, timeout);
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
    expect(fetcherInterface.userAgent).toBe(userAgent);
  });

  it('should handle AbortSignal correctly', async () => {
    const userAgent = 'test-direct-fetcher';
    const timeout = 5000;
    const url = 'https://api.example.com/data';
    const accept = 'application/json';
    const abortController = new AbortController();

    mockFetch.mockImplementationOnce((_, options) => {
      const signal = options?.signal;
      return new Promise((resolve, reject) => {
        // Check if already aborted
        if (signal && signal.aborted) {
          reject(new Error('The operation was aborted'));
          return;
        }

        // Listen for abort events
        signal?.addEventListener('abort', () => {
          reject(new Error('The operation was aborted'));
        });

        // Simulate some delay then resolve
        setTimeout(() => {
          resolve(new Response('{}', { status: 200 }));
        }, 10);
      });
    });

    const fetcherInterface = createDirectFetcher(userAgent, timeout);

    // Abort the signal immediately
    abortController.abort();

    await expect(
      fetcherInterface.rawFetcher(url, accept, abortController.signal)
    ).rejects.toThrow('The operation was aborted');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('should handle HTTP errors correctly', async () => {
    const userAgent = 'test-direct-fetcher';
    const timeout = 5000;
    const url = 'https://api.example.com/error';
    const accept = 'application/json';

    mockFetch.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    const fetcherInterface = createDirectFetcher(userAgent, timeout);

    await expect(
      fetcherInterface.rawFetcher(url, accept, undefined)
    ).rejects.toThrow('HTTP error, status: 404');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('should handle network errors correctly', async () => {
    const userAgent = 'test-direct-fetcher';
    const timeout = 5000;
    const url = 'https://api.example.com/network-error';
    const accept = 'application/json';

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const fetcherInterface = createDirectFetcher(userAgent, timeout);

    await expect(
      fetcherInterface.rawFetcher(url, accept, undefined)
    ).rejects.toThrow('Network error');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('should handle timeout correctly', async () => {
    const userAgent = 'test-direct-fetcher';
    const timeout = 10; // 10ms timeout
    const url = 'https://api.example.com/slow';
    const accept = 'application/json';

    // Simulate a slow request that properly handles AbortSignal
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

    const fetcherInterface = createDirectFetcher(userAgent, timeout);

    await expect(
      fetcherInterface.rawFetcher(url, accept, undefined)
    ).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('should create different fetcher instances with different configurations', () => {
    const fetcher1 = createDirectFetcher('user-agent-1', 1000);
    const fetcher2 = createDirectFetcher('user-agent-2', 2000);

    expect(fetcher1).not.toBe(fetcher2);
    expect(typeof fetcher1).toBe('object');
    expect(typeof fetcher2).toBe('object');
    expect(fetcher1.userAgent).toBe('user-agent-1');
    expect(fetcher2.userAgent).toBe('user-agent-2');
  });

  it('should log debug messages when logger is provided', async () => {
    const userAgent = 'test-direct-fetcher';
    const timeout = 5000;
    const url = 'https://api.example.com/log-test';
    const accept = 'application/json';

    mockFetch.mockResolvedValueOnce(
      new Response('{"logged": true}', {
        status: 200,
        headers: { 'Content-Type': accept },
      })
    );

    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const fetcherInterface = createDirectFetcher(userAgent, timeout);
    await fetcherInterface.rawFetcher(url, accept, undefined, mockLogger);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Direct fetch for URL: ${url}`
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Fetching data from URL: ${url}`
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Successfully fetched data from URL: ${url}`
    );
  });

  it('should use default timeout when not specified', () => {
    const userAgent = 'test-direct-fetcher';
    const fetcherInterface = createDirectFetcher(userAgent); // No timeout specified

    expect(typeof fetcherInterface).toBe('object');
    expect(typeof fetcherInterface.rawFetcher).toBe('function');
    expect(fetcherInterface.userAgent).toBe(userAgent);
  });
});
