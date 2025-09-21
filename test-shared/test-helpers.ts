/**
 * Common test helpers shared between Node.js and E2E tests
 */

import { createMarkdownProcessor, createOEmbedPlugin, createCardPlugin, createMermaidPlugin, createCachedFetcher, type Plugin } from 'mark-deco';

/**
 * Create custom oEmbed providers for testing
 * This ensures all oEmbed requests go to local test server instead of external APIs
 */
export function createTestCustomProviders(testServerPort: number) {
  return [
    {
      "provider_name": "Test Server",
      "provider_url": `http://localhost:${testServerPort}/`,
      "endpoints": [
        {
          "schemes": [
            `http://localhost:${testServerPort}/content/video/*`,
            `http://localhost:${testServerPort}/content/photo/*`
          ],
          "url": `http://localhost:${testServerPort}/oembed`,
          "discovery": true
        }
      ]
    }
  ];
}

/**
 * Create a test processor with all plugins enabled and local test server configuration
 */
export function createTestProcessor(testServerPort: number, options: {
  enableOembed?: boolean;
  enableCard?: boolean;
  enableMermaid?: boolean;
  timeout?: number;
} = {}) {
  const {
    enableOembed = true,
    enableCard = true,
    enableMermaid = true,
    timeout = 5000
  } = options;

  const plugins: Plugin[] = [];
  const fetcher = createCachedFetcher('mark-deco-test/1.0.0', timeout);

  if (enableOembed) {
    const customProviders = createTestCustomProviders(testServerPort);
    plugins.push(createOEmbedPlugin(customProviders));
  }

  if (enableCard) {
    plugins.push(createCardPlugin());
  }

  if (enableMermaid) {
    plugins.push(createMermaidPlugin());
  }

  return createMarkdownProcessor({
    plugins,
    fetcher: fetcher
  });
}

/**
 * Normalize HTML for comparison in tests
 */
export function normalizeHtml(html: string): string {
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

/**
 * Extract mermaid diagrams from HTML and return their count and IDs
 */
export function extractMermaidInfo(html: string): {
  count: number;
  ids: string[];
  hasSvg: boolean;
} {
  // Match div elements with exactly "mermaid" class (not "mermaid-wrapper")
  // Use a more precise regex that looks for the exact mermaid class
  const mermaidMatches = html.match(/<div[^>]*class="[^"]*\bmermaid\b[^"]*"[^>]*>/g) || [];

  // Filter out wrapper classes - we only want the actual mermaid diagrams
  const actualMermaidMatches = mermaidMatches.filter(match => {
    // Check if this has the exact "mermaid" class but not "mermaid-wrapper"
    const classMatch = match.match(/class="([^"]*)"/);
    if (classMatch) {
      const classes = classMatch[1].split(/\s+/);
      return classes.includes('mermaid') && !classes.includes('mermaid-wrapper');
    }
    return false;
  });

  // Extract IDs from matches
  const ids: string[] = [];
  actualMermaidMatches.forEach(match => {
    const idMatch = match.match(/id="([^"]+)"/);
    if (idMatch) {
      ids.push(idMatch[1]);
    }
  });

  // Check if any SVG elements are present
  const hasSvg = html.includes('<svg');

  return {
    count: actualMermaidMatches.length,
    ids,
    hasSvg
  };
}

/**
 * Count total headings in heading tree
 */
export function countTotalHeadings(headingTree: any[]): number {
  let count = 0;

  function countHeadings(items: any[]): void {
    for (const item of items) {
      count++;
      if (item.children && item.children.length > 0) {
        countHeadings(item.children);
      }
    }
  }

  countHeadings(headingTree);
  return count;
}

/**
 * Validate that HTML contains expected plugin outputs
 */
export function validatePluginOutputs(html: string, expectedPlugins: {
  oembed?: number;
  card?: number;
  mermaid?: number;
}) {
  const results = {
    oembed: (html.match(/class="oembed-container/g) || []).length,
    card: (html.match(/class="card-container/g) || []).length,
    mermaid: extractMermaidInfo(html).count
  };

  const errors: string[] = [];

  Object.entries(expectedPlugins).forEach(([plugin, expectedCount]) => {
    const actualCount = results[plugin as keyof typeof results];
    if (actualCount !== expectedCount) {
      errors.push(`${plugin}: expected ${expectedCount}, got ${actualCount}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    results
  };
}
