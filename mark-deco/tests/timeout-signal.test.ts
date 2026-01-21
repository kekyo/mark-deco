// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchData } from '../src/utils';
import { resolveRedirects } from '../src/plugins/oembed/redirect-resolver';
import type { Logger } from '../src/types';

const originalFetch = globalThis.fetch;

const createLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe('timeout signal cleanup', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('clears timeout after fetchData completes successfully', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      new Response('ok', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    await fetchData(
      'https://example.com/data',
      'text/plain',
      'test-agent',
      1000,
      undefined
    );

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    const timerId = setTimeoutSpy.mock.results[0]?.value;
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
  });

  it('clears timeout after fetchData fails', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetchData(
        'https://example.com/error',
        'text/plain',
        'test-agent',
        1000,
        undefined
      )
    ).rejects.toThrow('Network error');

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    const timerId = setTimeoutSpy.mock.results[0]?.value;
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
  });

  it('clears timeout after resolveRedirects completes', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));

    const logger = createLogger();
    const resolved = await resolveRedirects(
      'https://example.com/path',
      1,
      1000,
      undefined,
      logger,
      undefined
    );

    expect(resolved).toBe('https://example.com/path');
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    const timerId = setTimeoutSpy.mock.results[0]?.value;
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
  });
});
