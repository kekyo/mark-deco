import type { ScrapingRule } from './types.js';

/**
 * Amazon scraping rules for different locales
 */
export const amazonRules: ScrapingRule[] = [
  {
    pattern: '^https?://(?:www\\.)?amazon\\.co\\.jp/',
    locale: 'ja-JP',
    siteName: 'Amazon Japan',
    fields: {
      title: {
        required: true,
        rules: [
          {
            selector: '#productTitle',
            method: 'text',
          },
        ],
      },

      price: {
        rules: [
          {
            selector: [
              'span.a-price-whole',
              'span.a-price.a-text-price',
              '.a-offscreen',
              '#priceblock_dealprice',
              '#priceblock_ourprice',
              '#price_inside_buybox',
            ],
            method: 'text',
            processor: {
              type: 'currency',
              params: {
                symbol: '¥',
              },
            },
          },
        ],
      },

      reviewCount: {
        rules: [
          {
            selector: '#acrCustomerReviewText',
            method: 'text',
          },
        ],
      },

      rating: {
        rules: [
          {
            selector: 'span.a-icon-alt',
            method: 'text',
            processor: {
              type: 'filter',
              params: {
                contains: '星',
              },
            },
          },
        ],
      },

      brand: {
        rules: [
          {
            selector: '#bylineInfo',
            method: 'text',
            processor: (values) => {
              if (values.length === 0 || !values[0]) return undefined;
              const text = values[0];
              // Extract brand name from Japanese format
              const match = text.match(/ブランド:\s*([^の]+)/);
              return match?.[1]?.trim();
            },
          },
        ],
      },

      features: {
        rules: [
          {
            selector: '#feature-bullets .a-list-item',
            method: 'text',
            multiple: true,
            processor: {
              type: 'filter',
              params: {
                excludeContains: ['この商品について'],
                minLength: 5,
              },
            },
          },
        ],
      },

      identifier: {
        rules: [
          {
            selector: 'body',
            method: 'text',
            processor: (_values, context) => {
              // Extract ASIN from URL (10+ characters)
              const match = context.url.match(/\/dp\/([A-Z0-9]{10,})/);
              return match ? match[1] : undefined;
            },
          },
        ],
      },
    },
  },

  {
    pattern: '^https?://(?:www\\.)?amazon\\.com/',
    locale: 'en-US',
    siteName: 'Amazon US',
    fields: {
      title: {
        required: true,
        rules: [
          {
            selector: '#productTitle',
            method: 'text',
          },
        ],
      },

      price: {
        rules: [
          {
            selector: [
              'span.a-price-whole',
              'span.a-price.a-text-price',
              '.a-offscreen',
              '#priceblock_dealprice',
              '#priceblock_ourprice',
              '#price_inside_buybox',
            ],
            method: 'text',
            processor: {
              type: 'currency',
              params: {
                symbol: '$',
              },
            },
          },
        ],
      },

      reviewCount: {
        rules: [
          {
            selector: '#acrCustomerReviewText',
            method: 'text',
          },
        ],
      },

      rating: {
        rules: [
          {
            selector: 'span.a-icon-alt',
            method: 'text',
            processor: {
              type: 'filter',
              params: {
                contains: 'star',
              },
            },
          },
        ],
      },

      brand: {
        rules: [
          {
            selector: '#bylineInfo',
            method: 'text',
            processor: (values) => {
              if (values.length === 0 || !values[0]) return undefined;
              const text = values[0];
              // Extract brand name from English format
              const match = text.match(/Brand:\s*([^V]+?)(?:\s*Visit|$)/);
              return match?.[1]?.trim();
            },
          },
        ],
      },

      features: {
        rules: [
          {
            selector: '#feature-bullets .a-list-item',
            method: 'text',
            multiple: true,
            processor: {
              type: 'filter',
              params: {
                excludeContains: ['About this item'],
                minLength: 5,
              },
            },
          },
        ],
      },

      identifier: {
        rules: [
          {
            selector: 'body',
            method: 'text',
            processor: (_values, context) => {
              // Extract ASIN from URL (10+ characters)
              const match = context.url.match(/\/dp\/([A-Z0-9]{10,})/);
              return match ? match[1] : undefined;
            },
          },
        ],
      },
    },
  },
];
