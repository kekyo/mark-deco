// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { ScrapingRule } from './types';

/**
 * OGP (Open Graph Protocol) scraping rules for general fallback
 * These rules are applied to any site as a last resort fallback
 *
 * IMPORTANT: Twitter Card metadata is included in this fallback strategy because:
 *
 * 1. WIDESPREAD ADOPTION: Twitter Card meta tags are used by 53.7% of websites (W3Techs)
 *    including major sites like Google, Microsoft, Apple, YouTube, LinkedIn, Amazon, GitHub
 *
 * 2. OFFICIAL RECOMMENDATION: Twitter/X officially recommends using Twitter Card metadata
 *    alongside OGP, with Twitter's parser falling back to OGP when Twitter-specific
 *    properties are not present
 *
 * 3. CROSS-PLATFORM USAGE: Twitter Card metadata is not Twitter-exclusive - it's
 *    referenced by LinkedIn, Facebook, Pinterest, SEO tools, and CMS platforms
 *
 * 4. DE FACTO STANDARD: Twitter Card has become a web standard for rich social sharing,
 *    making it appropriate for general OGP fallback rules rather than site-specific rules
 *
 * 5. OPTIMAL FALLBACK CHAIN: OGP → Twitter Card → HTML elements provides comprehensive
 *    coverage for social media sharing across all platforms
 */
export const ogpRules: ScrapingRule[] = [
  {
    // Match any URL as fallback
    pattern: '^https?://',
    locale: 'auto',
    siteName: 'Generic Site',
    fields: {
      title: {
        required: true,
        rules: [
          // Try OGP title first
          {
            selector: 'meta[property="og:title"]',
            method: 'attr',
            attr: 'content',
          },
          // Then Twitter Card title
          {
            selector: 'meta[name="twitter:title"]',
            method: 'attr',
            attr: 'content',
          },
          // Finally HTML title element
          {
            selector: 'title',
            method: 'text',
          },
        ],
      },

      description: {
        rules: [
          // Try OGP description first
          {
            selector: 'meta[property="og:description"]',
            method: 'attr',
            attr: 'content',
          },
          // Then Twitter Card description
          {
            selector: 'meta[name="twitter:description"]',
            method: 'attr',
            attr: 'content',
          },
          // Finally standard meta description
          {
            selector: 'meta[name="description"]',
            method: 'attr',
            attr: 'content',
          },
        ],
      },

      image: {
        rules: [
          // Try OGP image first
          {
            selector: 'meta[property="og:image"]',
            method: 'attr',
            attr: 'content',
            processor: (values, context) => {
              return values.length > 0 && values[0]
                ? resolveUrl(values[0], context.url)
                : undefined;
            },
          },
          // Then Twitter Card image
          {
            selector: 'meta[name="twitter:image"]',
            method: 'attr',
            attr: 'content',
            processor: (values, context) => {
              return values.length > 0 && values[0]
                ? resolveUrl(values[0], context.url)
                : undefined;
            },
          },
          // Then various favicon links
          {
            selector: 'link[rel="icon"]',
            method: 'attr',
            attr: 'href',
            processor: (values, context) => {
              return values.length > 0 && values[0]
                ? resolveUrl(values[0], context.url)
                : undefined;
            },
          },
          {
            selector: 'link[rel="apple-touch-icon"]',
            method: 'attr',
            attr: 'href',
            processor: (values, context) => {
              return values.length > 0 && values[0]
                ? resolveUrl(values[0], context.url)
                : undefined;
            },
          },
          {
            selector: 'link[rel="shortcut icon"]',
            method: 'attr',
            attr: 'href',
            processor: (values, context) => {
              return values.length > 0 && values[0]
                ? resolveUrl(values[0], context.url)
                : undefined;
            },
          },
        ],
      },

      siteName: {
        rules: [
          // Try OGP site name first
          {
            selector: 'meta[property="og:site_name"]',
            method: 'attr',
            attr: 'content',
          },
          // Then Twitter site
          {
            selector: 'meta[name="twitter:site"]',
            method: 'attr',
            attr: 'content',
            processor: (values) => {
              // Remove @ symbol from Twitter handle if present
              return values.length > 0 && values[0]
                ? values[0].replace(/^@/, '')
                : undefined;
            },
          },
          // Finally extract domain from URL
          {
            selector: 'html',
            method: 'text',
            processor: (_values, context) => {
              try {
                const url = new URL(context.url);
                return url.hostname.replace(/^www\./, '');
              } catch {
                return 'Unknown Site';
              }
            },
          },
        ],
      },

      url: {
        rules: [
          // Try OGP URL first
          {
            selector: 'meta[property="og:url"]',
            method: 'attr',
            attr: 'content',
          },
          // Fallback to current URL
          {
            selector: 'html',
            method: 'text',
            processor: (_values, context) => {
              return context.url;
            },
          },
        ],
      },

      type: {
        rules: [
          {
            selector: 'meta[property="og:type"]',
            method: 'attr',
            attr: 'content',
          },
        ],
      },

      locale: {
        rules: [
          {
            selector: 'meta[property="og:locale"]',
            method: 'attr',
            attr: 'content',
          },
        ],
      },

      favicon: {
        rules: [
          // Try standard favicon first
          {
            selector: 'link[rel="icon"]',
            method: 'attr',
            attr: 'href',
            processor: (values, context) => {
              return values.length > 0 && values[0]
                ? resolveUrl(values[0], context.url)
                : undefined;
            },
          },
          // Then Apple touch icon
          {
            selector: 'link[rel="apple-touch-icon"]',
            method: 'attr',
            attr: 'href',
            processor: (values, context) => {
              return values.length > 0 && values[0]
                ? resolveUrl(values[0], context.url)
                : undefined;
            },
          },
          // Finally shortcut icon
          {
            selector: 'link[rel="shortcut icon"]',
            method: 'attr',
            attr: 'href',
            processor: (values, context) => {
              return values.length > 0 && values[0]
                ? resolveUrl(values[0], context.url)
                : undefined;
            },
          },
        ],
      },
    },
  },
];

/**
 * Resolve relative URLs to absolute URLs
 */
function resolveUrl(url: string, baseUrl: string): string {
  try {
    // If it's already an absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If it starts with //, add protocol
    if (url.startsWith('//')) {
      const baseUrlObj = new URL(baseUrl);
      return `${baseUrlObj.protocol}${url}`;
    }

    // Resolve relative URL
    return new URL(url, baseUrl).toString();
  } catch {
    return url; // Return original if resolution fails
  }
}
