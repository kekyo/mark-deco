/**
 * Common test helpers shared between Node.js and E2E tests
 */

/**
 * Create custom oEmbed providers for testing
 * This ensures all oEmbed requests go to local test server instead of external APIs
 */
export function createTestCustomProviders(testServerPort: number) {
  return [
    {
      provider_name: 'Test Server',
      provider_url: `http://localhost:${testServerPort}/`,
      endpoints: [
        {
          schemes: [
            `https://youtu.be/*`,
            `https://www.youtube.com/watch*`,
            `https://youtube.com/watch*`,
            `https://m.youtube.com/watch*`,
            `https://www.youtube.com/*`,
            `https://youtube.com/*`,
            `https://flickr.com/photos/*/*`,
            `https://www.flickr.com/photos/*/*`,
            `http://localhost:${testServerPort}/content/video-1`,
            `http://localhost:${testServerPort}/content/photo-1`,
            `http://localhost:${testServerPort}/content/*`,
          ],
          url: `http://localhost:${testServerPort}/oembed`,
          discovery: true,
        },
      ],
    },
  ];
}

/**
 * Normalize HTML for comparison by removing extra whitespace and formatting differences
 */
export function normalizeHtml(html: string): string {
  return html
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .trim();
}
