import { beforeEach, vi, expect } from 'vitest';

/**
 * Global test setup to prevent accidental external network access in unit tests
 */

// Store original fetch for potential restoration
const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Skip fetch hooking for integration tests (test-node directory)
  const testFilePath = expect.getState().testPath || '';
  if (
    testFilePath.includes('test-node/') ||
    testFilePath.includes('test-e2e/')
  ) {
    return;
  }

  // Skip if fetch is already mocked by the test file itself
  if (vi.isMockFunction(globalThis.fetch)) {
    return;
  }

  // Mock global fetch to throw an error if called
  globalThis.fetch = vi
    .fn()
    .mockImplementation((url: RequestInfo | URL, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();

      // Allow localhost URLs for test servers
      if (
        urlString.includes('localhost:') ||
        urlString.includes('127.0.0.1:')
      ) {
        // Call original fetch for localhost
        return originalFetch.call(globalThis, url, options);
      }

      // Throw error for external URLs
      throw new Error(
        `❌ UNEXPECTED NETWORK ACCESS DETECTED! ❌\n` +
          `URL: ${urlString}\n` +
          `This test is making an actual HTTP request to an external server.\n` +
          `Please use mocks instead of real network calls in unit tests.\n` +
          `If you need to test external APIs, use the integration tests in test-node/`
      );
    });
});

export { originalFetch };
