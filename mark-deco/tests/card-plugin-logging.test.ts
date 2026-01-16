// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import * as cheerio from 'cheerio';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractEnhancedData } from '../src/plugins/card/utils';
import type { Logger } from '../src/types';

describe('Card Plugin Logging', () => {
  let mockLogger: Logger;
  let logCalls: Array<{ level: string; message: string; data?: unknown }>;

  beforeEach(() => {
    logCalls = [];
    mockLogger = {
      info: vi.fn((message: string, ...args) =>
        logCalls.push({ level: 'info', message, data: args })
      ),
      debug: vi.fn((message: string, ...args) =>
        logCalls.push({ level: 'debug', message, data: args })
      ),
      warn: vi.fn((message: string, ...args) =>
        logCalls.push({ level: 'warn', message, data: args })
      ),
      error: vi.fn((message: string, ...args) =>
        logCalls.push({ level: 'error', message, data: args })
      ),
    };
  });

  it('should log rule matching process when no rules match', () => {
    const htmlContent = `
      <html>
        <head>
          <title>Test Page</title>
          <meta property="og:title" content="Open Graph Title" />
          <meta property="og:description" content="Open Graph Description" />
        </head>
        <body>
          <h1>Test Content</h1>
        </body>
      </html>
    `;

    const $ = cheerio.load(htmlContent);
    const testUrl = 'https://example.com/test';

    const result = extractEnhancedData($, testUrl, [], mockLogger);

    // Should log the start of rule matching process
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message === 'extractEnhancedData: Starting rule matching process'
      )
    ).toBe(true);

    // Should log rule testing attempts
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message === 'findMatchingRule: Testing rules against URL'
      )
    ).toBe(true);

    // Should find OGP rules and extract metadata
    expect(result).toBeTruthy();
    expect(result?.title).toBe('Open Graph Title');
  });

  it('should log detailed field extraction process for OGP metadata', () => {
    const htmlContent = `
      <html>
        <head>
          <title>Page Title</title>
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Description" />
          <meta property="og:image" content="https://example.com/image.jpg" />
          <meta property="og:url" content="https://example.com/canonical" />
          <meta property="og:site_name" content="Example Site" />
        </head>
        <body>Content</body>
      </html>
    `;

    const $ = cheerio.load(htmlContent);
    const testUrl = 'https://example.com/test';

    const result = extractEnhancedData($, testUrl, [], mockLogger);

    // Should log rule application starting
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message === 'applyScrapingRule: Starting metadata extraction'
      )
    ).toBe(true);

    // Should log field processing for each OGP field
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message.includes('applyScrapingRule: Processing field')
      )
    ).toBe(true);

    // Should log successful field extractions
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message.includes(
            'applyScrapingRule: Successfully extracted field'
          )
      )
    ).toBe(true);

    // Should log completion with extracted fields count
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message === 'applyScrapingRule: Metadata extraction completed'
      )
    ).toBe(true);

    expect(result).toBeTruthy();
    expect(Object.keys(result!).length).toBeGreaterThan(0);
  });

  it('should log when using custom scraping rules', () => {
    const htmlContent = `
      <html>
        <head>
          <title>GitHub - user/repo: Repository Description</title>
          <meta property="og:title" content="GitHub Repository" />
        </head>
        <body>
          <div class="repo-title">My Custom Repo</div>
          <div class="repo-description">This is a custom repository</div>
        </body>
      </html>
    `;

    const customRules = [
      {
        pattern: '^https://github\\.com/',
        siteName: 'GitHub',
        fields: {
          title: {
            rules: [{ selector: '.repo-title', method: 'text' as const }],
          },
          description: {
            rules: [{ selector: '.repo-description', method: 'text' as const }],
          },
        },
      },
    ];

    const $ = cheerio.load(htmlContent);
    const testUrl = 'https://github.com/user/repo';

    const result = extractEnhancedData($, testUrl, customRules, mockLogger);

    // Should log custom rules count
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message ===
            'extractEnhancedData: Starting rule matching process' &&
          Array.isArray(call.data) &&
          call.data.some(
            (data: unknown) =>
              typeof data === 'object' &&
              data !== null &&
              'customRulesCount' in data &&
              (data as { customRulesCount: number }).customRulesCount === 1
          )
      )
    ).toBe(true);

    // Should log that a matching rule was found
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message === 'extractEnhancedData: Found matching rule'
      )
    ).toBe(true);

    // Should log field extraction attempts
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message.includes('extractFieldWithRules: Trying') &&
          call.message.includes('rules for field "title"')
      )
    ).toBe(true);

    expect(result).toBeTruthy();
    expect(result?.siteName).toBe('GitHub');
  });

  it('should log when no matching rules are found', () => {
    const htmlContent = `<html><head><title>Test</title></head><body></body></html>`;
    const $ = cheerio.load(htmlContent);
    const testUrl = 'https://unknown-site.com/test';

    // Use empty custom rules to force no matches
    const result = extractEnhancedData($, testUrl, [], mockLogger);

    // Should log that rules are being tested
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message === 'findMatchingRule: Testing rules against URL'
      )
    ).toBe(true);

    // Should eventually find OGP rules (as fallback)
    expect(result).toBeTruthy(); // OGP rules should still match and extract title
  });

  it('should log processor execution when using complex field rules', () => {
    const htmlContent = `
      <html>
        <head>
          <title>Product Page</title>
        </head>
        <body>
          <div class="price">$29.99 USD</div>
          <div class="price">€25.50 EUR</div>
        </body>
      </html>
    `;

    const customRules = [
      {
        pattern: '^https://shop\\.example\\.com/',
        siteName: 'Example Shop',
        fields: {
          prices: {
            rules: [
              {
                selector: '.price',
                method: 'text' as const,
                multiple: true,
                processor: {
                  type: 'currency' as const,
                  params: { symbol: '$', locale: 'en-US' },
                },
              },
            ],
          },
        },
      },
    ];

    const $ = cheerio.load(htmlContent);
    const testUrl = 'https://shop.example.com/product/123';

    const result = extractEnhancedData($, testUrl, customRules, mockLogger);

    // Should log field extraction attempts
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message === 'extractField: Attempting field extraction'
      )
    ).toBe(true);

    // Should log processor application
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message ===
            'extractField: Applying processor to extracted values'
      )
    ).toBe(true);

    // Should log element count for selectors
    expect(
      logCalls.some(
        (call) =>
          call.level === 'debug' &&
          call.message.includes('Found') &&
          call.message.includes('elements for selector')
      )
    ).toBe(true);

    expect(result).toBeTruthy();
  });
});
