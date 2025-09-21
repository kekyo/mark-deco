/**
 * Card Plugin Logging Example
 *
 * This sample code is for verifying the added logging functionality
 * in the card plugin metadata extraction processing.
 */

import { createCardPlugin } from '../src/plugins/card/index.js';
import { createMarkdownProcessor } from '../src/processor.js';
import type { Logger } from '../src/types.js';

// Create custom logger to output detailed logs to console
const createDetailedLogger = (): Logger => ({
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    console.log(`[DEBUG] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
});

// Example of custom scraping rules
const customScrapingRules = [
  {
    pattern: '^https://github\\.com/[^/]+/[^/]+/?$',
    siteName: 'GitHub',
    fields: {
      title: {
        rules: [
          { selector: 'h1.entry-title strong a', method: 'text' as const },
          { selector: 'h1[itemprop="name"] strong a', method: 'text' as const },
          {
            selector: '.js-repo-nav-item[data-selected-links="repo_source"]',
            method: 'text' as const,
          },
        ],
      },
      description: {
        rules: [
          {
            selector: 'meta[property="og:description"]',
            method: 'attr' as const,
            attr: 'content',
          },
          {
            selector: 'meta[name="description"]',
            method: 'attr' as const,
            attr: 'content',
          },
        ],
      },
      language: {
        rules: [
          {
            selector: '.BorderGrid-cell .ml-3 span[class*="color-fg-default"]',
            method: 'text' as const,
            processor: {
              type: 'first' as const,
            },
          },
        ],
      },
    },
  },
];

// Create processor
const processor = createMarkdownProcessor({
  plugins: [
    createCardPlugin({
      scrapingRules: customScrapingRules,
    }),
  ],
  fetcher: {
    fetcher: async (url: string) => {
      // Mock HTML response (simplified version of actual GitHub page)
      if (url.includes('github.com')) {
        return new Response(`
          <html>
            <head>
              <title>user/repo: Repository description</title>
              <meta property="og:title" content="GitHub Repository Title" />
              <meta property="og:description" content="A sample GitHub repository for demonstration" />
              <meta property="og:image" content="https://repository-images.githubusercontent.com/123456789/sample.png" />
              <meta property="og:url" content="${url}" />
              <meta property="og:site_name" content="GitHub" />
              <meta property="og:type" content="object" />
            </head>
            <body>
              <h1 class="entry-title">
                <strong><a href="/user/repo">sample-repository</a></strong>
              </h1>
              <div class="BorderGrid-cell">
                <div class="ml-3">
                  <span class="color-fg-default">TypeScript</span>
                </div>
              </div>
            </body>
          </html>
        `);
      }

      return new Response('Not found', { status: 404 });
    },
    userAgent: 'card-logging-example/1.0',
  },
  logger: createDetailedLogger(),
});

async function demonstrateCardLogging() {
  console.log('='.repeat(80));
  console.log('Card Plugin Logging Demonstration');
  console.log('='.repeat(80));

  const markdown = '```card\nhttps://github.com/user/sample-repo\n```';

  console.log('\nMarkdown to process:');
  console.log(markdown);

  console.log('\n--- Log output start ---\n');

  try {
    const result = await processor.process(markdown, 'example-id');

    console.log('\n--- Log output end ---\n');
    console.log('Processing result HTML:');
    console.log(result.html);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📊 Card Plugin Logging Feature Demonstration\n');

  console.log('\n' + '='.repeat(80));
  console.log('Actual execution example (using mock data):');
  console.log('='.repeat(80));

  await demonstrateCardLogging();
}

export { demonstrateCardLogging };
