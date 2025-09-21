import * as cheerio from 'cheerio';
import { describe, it, expect } from 'vitest';
import { amazonRules } from '../src/plugins/card/amazon-rules.js';
import { ogpRules } from '../src/plugins/card/ogp-rules.js';
import { findMatchingRule, applyScrapingRule } from '../src/plugins/card/rule-engine.js';
import type { ScrapingRule } from '../src/plugins/card/types.js';

describe('Rule Engine', () => {
  describe('findMatchingRule', () => {
    it('should find Amazon JP rule for amazon.co.jp URLs', () => {
      const rule = findMatchingRule(amazonRules, 'https://www.amazon.co.jp/dp/B0DG8Z9Y1R');
      expect(rule).toBeDefined();
      expect(rule?.pattern).toBe('^https?://(?:www\\.)?amazon\\.co\\.jp/');
      expect(rule?.locale).toBe('ja-JP');
      expect(rule?.siteName).toBe('Amazon Japan');
    });

    it('should find Amazon US rule for amazon.com URLs', () => {
      const rule = findMatchingRule(amazonRules, 'https://www.amazon.com/dp/B08N5WRWNW');
      expect(rule).toBeDefined();
      expect(rule?.pattern).toBe('^https?://(?:www\\.)?amazon\\.com/');
      expect(rule?.locale).toBe('en-US');
      expect(rule?.siteName).toBe('Amazon US');
    });

    it('should return undefined for non-matching URLs', () => {
      const rule = findMatchingRule(amazonRules, 'https://example.com/product');
      expect(rule).toBeUndefined();
    });
  });

  describe('applyScrapingRule', () => {
    it('should extract Amazon JP metadata correctly', () => {
      const html = `
        <html lang="ja">
        <head>
          <meta http-equiv="content-language" content="ja-JP">
        </head>
        <body>
          <span id="productTitle">UGREEN 30W USB-C 充電器</span>
          <span class="a-price-whole">1,680</span>
          <span id="acrCustomerReviewText">71個の評価</span>
          <span class="a-icon-alt">5つ星のうち4.6</span>
          <span id="bylineInfo">ブランド: UGREEN のストアを表示</span>
          <div id="feature-bullets">
            <span class="a-list-item">PSE技術基準適合</span>
            <span class="a-list-item">PD3.0対応</span>
            <span class="a-list-item">30W急速充電</span>
          </div>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const rule = amazonRules[0]; // Amazon JP rule
      if (!rule) throw new Error('Amazon JP rule not found');
      const result = applyScrapingRule(rule, $, 'https://www.amazon.co.jp/dp/B0DG8Z9Y1R');

      expect(result.siteName).toBe('Amazon Japan');
      expect(result.title).toBe('UGREEN 30W USB-C 充電器');
      expect(result.price).toBe('¥1,680');
      expect(result.reviewCount).toBe('71個の評価');
      expect(result.rating).toBe('5つ星のうち4.6');
      expect(result.brand).toBe('UGREEN');
      expect(result.features).toEqual(['PSE技術基準適合', 'PD3.0対応', '30W急速充電']);
      expect(result.identifier).toBe('B0DG8Z9Y1R');
    });

    it('should extract Amazon US metadata correctly', () => {
      const html = `
        <html lang="en-US">
        <head>
          <meta http-equiv="content-language" content="en-US">
        </head>
        <body>
          <span id="productTitle">UGREEN 30W USB-C Charger PD Fast Charging</span>
          <span class="a-price-whole">19.99</span>
          <span id="acrCustomerReviewText">152 ratings</span>
          <span class="a-icon-alt">4.5 out of 5 stars</span>
          <span id="bylineInfo">Brand: UGREEN Visit the UGREEN Store</span>
          <div id="feature-bullets">
            <span class="a-list-item">PD 3.0 Fast Charging</span>
            <span class="a-list-item">Compact Design</span>
            <span class="a-list-item">Universal Compatibility</span>
          </div>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const rule = amazonRules[1]; // Amazon US rule
      if (!rule) throw new Error('Amazon US rule not found');
      const result = applyScrapingRule(rule, $, 'https://www.amazon.com/dp/B08N5WRWNW');

      expect(result.siteName).toBe('Amazon US');
      expect(result.title).toBe('UGREEN 30W USB-C Charger PD Fast Charging');
      expect(result.price).toBe('$19.99');
      expect(result.reviewCount).toBe('152 ratings');
      expect(result.rating).toBe('4.5 out of 5 stars');
      expect(result.brand).toBe('UGREEN');
      expect(result.features).toEqual(['PD 3.0 Fast Charging', 'Compact Design', 'Universal Compatibility']);
      expect(result.identifier).toBe('B08N5WRWNW');
    });

    it('should handle locale extraction from HTML when not specified in rule', () => {
      const testRule: ScrapingRule = {
        pattern: 'test',
        // No locale specified
        siteName: 'Test Site',
        fields: {
          title: {
            rules: [{
              selector: '#title',
              method: 'text'
            }]
          }
        }
      };

      const html = `
        <html lang="fr-FR">
        <head>
          <meta http-equiv="content-language" content="fr-FR">
        </head>
        <body>
          <span id="title">Test Title</span>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const result = applyScrapingRule(testRule, $, 'https://test.com');

      expect(result.siteName).toBe('Test Site');
      expect(result.title).toBe('Test Title');
    });

    it('should prioritize rule locale over HTML locale', () => {
      const testRule: ScrapingRule = {
        pattern: 'test',
        locale: 'en-US', // Explicitly specified
        siteName: 'Test Site',
        fields: {
          title: {
            rules: [{
              selector: '#title',
              method: 'text'
            }]
          }
        }
      };

      const html = `
        <html lang="ja">
        <head>
          <meta http-equiv="content-language" content="ja-JP">
        </head>
        <body>
          <span id="title">Test Title</span>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const result = applyScrapingRule(testRule, $, 'https://test.com');

      expect(result.siteName).toBe('Test Site');
      expect(result.title).toBe('Test Title');
    });

    it('should handle missing fields gracefully', () => {
      const html = `
        <html>
        <body>
          <span id="productTitle">Only Title Available</span>
          <!-- Missing other fields -->
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const rule = amazonRules[0]; // Amazon JP rule
      if (!rule) throw new Error('Amazon JP rule not found');
      const result = applyScrapingRule(rule, $, 'https://www.amazon.co.jp/dp/B0DG8Z9Y1R');

      expect(result.siteName).toBe('Amazon Japan');
      expect(result.title).toBe('Only Title Available');
      expect(result.identifier).toBe('B0DG8Z9Y1R'); // Extracted from URL
      expect(result.price).toBeUndefined();
      expect(result.rating).toBeUndefined();
      expect(result.brand).toBeUndefined();
      expect(result.features).toBeUndefined();
    });

    it('should handle processor functions', () => {
      const testRule: ScrapingRule = {
        pattern: 'test',
        siteName: 'Test Site',
        fields: {
          processedField: {
            rules: [{
              selector: '.test',
              method: 'text',
              processor: (values) => {
                return values.map(v => v.toUpperCase());
              }
            }]
          }
        }
      };

      const html = `
        <html>
        <body>
          <span class="test">hello world</span>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const result = applyScrapingRule(testRule, $, 'https://test.com');

      expect(result.processedField).toBe('HELLO WORLD');
    });

    it('should handle multiple selectors', () => {
      const testRule: ScrapingRule = {
        pattern: 'test',
        siteName: 'Test Site',
        fields: {
          title: {
            rules: [{
              selector: ['#primary-title', '#secondary-title', '.fallback-title'],
              method: 'text'
            }]
          }
        }
      };

      const html = `
        <html>
        <body>
          <span class="fallback-title">Fallback Title</span>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const result = applyScrapingRule(testRule, $, 'https://test.com');

      expect(result.title).toBe('Fallback Title');
    });

    it('should handle multiple extraction with array results', () => {
      const testRule: ScrapingRule = {
        pattern: 'test',
        siteName: 'Test Site',
        fields: {
          tags: {
            rules: [{
              selector: '.tag',
              method: 'text',
              multiple: true
            }]
          }
        }
      };

      const html = `
        <html>
        <body>
          <span class="tag">Tag 1</span>
          <span class="tag">Tag 2</span>
          <span class="tag">Tag 3</span>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const result = applyScrapingRule(testRule, $, 'https://test.com');

      expect(result.tags).toEqual(['Tag 1', 'Tag 2', 'Tag 3']);
    });
  });

  describe('ProcessorRules', () => {
    it('should handle currency processor', () => {
      const testRule: ScrapingRule = {
        pattern: 'test',
        siteName: 'Test Site',
        fields: {
          price: {
            rules: [{
              selector: '.price',
              method: 'text',
              processor: {
                type: 'currency',
                params: { symbol: '€', locale: 'de-DE' }
              }
            }]
          }
        }
      };

      const html = `
        <html>
        <body>
          <span class="price">1234.50</span>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const result = applyScrapingRule(testRule, $, 'https://test.com');

      expect(result.price).toBe('€1.234,5'); // Currency formatting applied
    });

    it('should handle regex processor', () => {
      const testRule: ScrapingRule = {
        pattern: 'test',
        siteName: 'Test Site',
        fields: {
          cleanText: {
            rules: [{
              selector: '.text',
              method: 'text',
              processor: {
                type: 'regex',
                params: {
                  replace: [
                    { pattern: '^Prefix:\\s*', replacement: '' },
                    { pattern: '\\s*Suffix$', replacement: '' }
                  ]
                }
              }
            }]
          }
        }
      };

      const html = `
        <html>
        <body>
          <span class="text">Prefix: Clean Text Suffix</span>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const result = applyScrapingRule(testRule, $, 'https://test.com');

      expect(result.cleanText).toBe('Clean Text');
    });

    it('should handle first processor', () => {
      const testRule: ScrapingRule = {
        pattern: 'test',
        siteName: 'Test Site',
        fields: {
          firstItem: {
            rules: [{
              selector: '.item',
              method: 'text',
              processor: {
                type: 'first'
              }
            }]
          }
        }
      };

      const html = `
        <html>
        <body>
          <span class="item">First Item</span>
          <span class="item">Second Item</span>
          <span class="item">Third Item</span>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const result = applyScrapingRule(testRule, $, 'https://test.com');

      expect(result.firstItem).toBe('First Item');
    });

    it('should handle filter processor', () => {
      const testRule: ScrapingRule = {
        pattern: 'test',
        siteName: 'Test Site',
        fields: {
          filteredItems: {
            rules: [{
              selector: '.item',
              method: 'text',
              multiple: true,
              processor: {
                type: 'filter',
                params: {
                  contains: 'keep',
                  excludeContains: 'exclude'
                }
              }
            }]
          }
        }
      };

      const html = `
        <html>
        <body>
          <span class="item">keep this</span>
          <span class="item">exclude this keep</span>
          <span class="item">keep that</span>
          <span class="item">remove this</span>
        </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const result = applyScrapingRule(testRule, $, 'https://test.com');

      expect(result.filteredItems).toEqual(['keep this', 'keep that']);
    });
  });
});

describe('OGP Rules Tests', () => {
  it('should find OGP rule for any URL', () => {
    const rule = findMatchingRule(ogpRules, 'https://example.com/page');
    expect(rule).toBeDefined();
    expect(rule?.pattern).toBe('^https?://');
    expect(rule?.siteName).toBe('Generic Site');
  });

  it('should extract basic OGP metadata', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Example Page Title" />
          <meta property="og:description" content="Example page description" />
          <meta property="og:image" content="https://example.com/image.jpg" />
          <meta property="og:url" content="https://example.com/canonical" />
          <meta property="og:site_name" content="Example Site" />
          <meta property="og:type" content="website" />
          <meta property="og:locale" content="en_US" />
        </head>
        <body>
          <h1>Example Page</h1>
        </body>
      </html>
    `;

    const $ = cheerio.load(html);
    const rule = findMatchingRule(ogpRules, 'https://example.com/page');
    const result = applyScrapingRule(rule!, $, 'https://example.com/page');

    expect(result).toBeDefined();
    expect(result?.title).toBe('Example Page Title');
    expect(result?.description).toBe('Example page description');
    expect(result?.image).toBe('https://example.com/image.jpg');
    expect(result?.url).toBe('https://example.com/canonical');
    expect(result?.siteName).toBe('Example Site');
    expect(result?.type).toBe('website');
    expect(result?.locale).toBe('en_US');
  });

  it('should fallback to Twitter Card metadata', () => {
    const html = `
      <html>
        <head>
          <meta name="twitter:title" content="Twitter Card Title" />
          <meta name="twitter:description" content="Twitter card description" />
          <meta name="twitter:image" content="https://example.com/twitter-image.jpg" />
          <meta name="twitter:site" content="@example" />
        </head>
        <body>
          <h1>Page Title</h1>
        </body>
      </html>
    `;

    const $ = cheerio.load(html);
    const rule = findMatchingRule(ogpRules, 'https://example.com/page');
    const result = applyScrapingRule(rule!, $, 'https://example.com/page');

    expect(result).toBeDefined();
    expect(result?.title).toBe('Twitter Card Title');
    expect(result?.description).toBe('Twitter card description');
    expect(result?.image).toBe('https://example.com/twitter-image.jpg');
    expect(result?.siteName).toBe('example'); // @ symbol removed
  });

  it('should fallback to HTML title and meta description', () => {
    const html = `
      <html>
        <head>
          <title>HTML Title Element</title>
          <meta name="description" content="HTML meta description" />
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body>
          <h1>Page Content</h1>
        </body>
      </html>
    `;

    const $ = cheerio.load(html);
    const rule = findMatchingRule(ogpRules, 'https://example.com/page');
    const result = applyScrapingRule(rule!, $, 'https://example.com/page');

    expect(result).toBeDefined();
    expect(result?.title).toBe('HTML Title Element');
    expect(result?.description).toBe('HTML meta description');
    expect(result?.image).toBe('https://example.com/favicon.ico'); // favicon resolved
    expect(result?.siteName).toBe('example.com'); // domain extracted
  });

  it('should resolve relative image URLs', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="/relative-image.jpg" />
          <link rel="icon" href="../favicon.ico" />
        </head>
        <body>
        </body>
      </html>
    `;

    const $ = cheerio.load(html);
    const rule = findMatchingRule(ogpRules, 'https://example.com/sub/page');
    const result = applyScrapingRule(rule!, $, 'https://example.com/sub/page');

    expect(result).toBeDefined();
    expect(result?.image).toBe('https://example.com/relative-image.jpg');
  });

  it('should handle missing metadata gracefully', () => {
    const html = `
      <html>
        <head>
        </head>
        <body>
          <h1>Minimal Page</h1>
        </body>
      </html>
    `;

    const $ = cheerio.load(html);
    const rule = findMatchingRule(ogpRules, 'https://example.com/page');
    const result = applyScrapingRule(rule!, $, 'https://example.com/page');

    expect(result).toBeDefined();
    expect(result?.title).toBeUndefined(); // No title found
    expect(result?.description).toBeUndefined(); // No description found
    expect(result?.image).toBeUndefined(); // No image/favicon found
    expect(result?.siteName).toBe('example.com'); // Domain extracted as fallback
    expect(result?.url).toBe('https://example.com/page'); // Source URL used
  });
});
