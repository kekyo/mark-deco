// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { FieldRule, ProcessorContext, ScrapingRule } from './types';

/**
 * Amazon scraping rules for different locales
 */
const resolveUrl = (url: string, baseUrl: string): string => {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('//')) {
      const baseUrlObj = new URL(baseUrl);
      return `${baseUrlObj.protocol}${url}`;
    }
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

const extractDynamicImageUrl = (value: string): string | undefined => {
  if (!value.trim().startsWith('{')) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const entries = Object.entries(parsed);
    if (entries.length === 0) {
      return undefined;
    }
    const firstEntry = entries[0];
    if (!firstEntry) {
      return undefined;
    }
    let bestUrl = firstEntry[0];
    let bestArea = 0;
    for (const [url, size] of entries) {
      if (Array.isArray(size) && size.length >= 2) {
        const width = Number(size[0]);
        const height = Number(size[1]);
        const area =
          Number.isFinite(width) && Number.isFinite(height)
            ? width * height
            : 0;
        if (area > bestArea) {
          bestArea = area;
          bestUrl = url;
        }
      }
    }
    return bestUrl;
  } catch {
    return undefined;
  }
};

const extractAmazonImageUrl = (
  values: string[],
  context: ProcessorContext
): string | undefined => {
  for (const rawValue of values) {
    const trimmed = decodeHtmlEntities(rawValue).trim();
    if (!trimmed) {
      continue;
    }
    const dynamicUrl = extractDynamicImageUrl(trimmed);
    if (dynamicUrl) {
      return resolveUrl(dynamicUrl, context.url);
    }
    return resolveUrl(trimmed, context.url);
  }
  return undefined;
};

const amazonImageRules: FieldRule[] = [
  {
    selector: '#landingImage',
    method: 'attr',
    attr: 'data-a-dynamic-image',
    processor: extractAmazonImageUrl,
  },
  {
    selector: '#landingImage',
    method: 'attr',
    attr: 'data-old-hires',
    processor: extractAmazonImageUrl,
  },
  {
    selector: '#landingImage',
    method: 'attr',
    attr: 'src',
    processor: extractAmazonImageUrl,
  },
  {
    selector: '#imgTagWrapperId img',
    method: 'attr',
    attr: 'data-a-dynamic-image',
    processor: extractAmazonImageUrl,
  },
  {
    selector: '#imgTagWrapperId img',
    method: 'attr',
    attr: 'data-old-hires',
    processor: extractAmazonImageUrl,
  },
  {
    selector: '#imgTagWrapperId img',
    method: 'attr',
    attr: 'src',
    processor: extractAmazonImageUrl,
  },
  {
    selector: 'img[data-old-hires]',
    method: 'attr',
    attr: 'data-old-hires',
    processor: extractAmazonImageUrl,
  },
  {
    selector: 'meta[property="og:image"]',
    method: 'attr',
    attr: 'content',
    processor: extractAmazonImageUrl,
  },
  {
    selector: 'meta[name="twitter:image"]',
    method: 'attr',
    attr: 'content',
    processor: extractAmazonImageUrl,
  },
];

const amazonPatterns = [
  '^https?://(?:www\\.)?amazon\\.co\\.jp/',
  '^https?://(?:www\\.)?amazon\\.com/',
  '^https?://amzn\\.to/',
];

export const amazonRules: ScrapingRule[] = [
  {
    patterns: amazonPatterns,
    postFilters: ['^https?://(?:www\\.)?amazon\\.co\\.jp/'],
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

      image: {
        rules: amazonImageRules,
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
    patterns: amazonPatterns,
    postFilters: ['^https?://(?:www\\.)?amazon\\.com/'],
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

      image: {
        rules: amazonImageRules,
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
