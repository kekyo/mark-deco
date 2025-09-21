import {
  createMarkdownProcessor,
  createOEmbedPlugin,
  createDirectFetcher,
  defaultProviderList,
} from '../dist/index.js';

// Create direct fetcher that bypasses cache
const directFetcher = createDirectFetcher(
  'direct-fetcher-example/1.0',
  5000 // 5 second timeout
);

console.log('[DirectFetcher] User-Agent:', directFetcher.userAgent);
console.log(
  '[DirectFetcher] No caching - every request goes directly to network'
);

// Create oEmbed plugin
const plugin = createOEmbedPlugin(defaultProviderList);

const processor = createMarkdownProcessor({
  plugins: [plugin],
  fetcher: directFetcher,
});

// Test Markdown
const markdown = `
# Direct Fetcher Test

This example demonstrates direct fetching without any caching.

\`\`\`oembed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
\`\`\`

Each request will hit the network directly.
`;

// Execute processing multiple times to demonstrate no caching
console.log('=== OEmbed Plugin Test Using Direct Fetcher (No Cache) ===');

// First execution
console.log('\n--- First execution ---');
try {
  const result1 = await processor.process(markdown, 'direct-test-1');
  console.log('✓ First execution completed');
  console.log('Generated HTML length:', result1.html.length);
} catch (error) {
  console.error('✗ First execution failed:', error.message);
}

// Second execution (would use cache with cachedFetcher, but not with directFetcher)
console.log('\n--- Second execution (no cache hit) ---');
try {
  const result2 = await processor.process(markdown, 'direct-test-2');
  console.log('✓ Second execution completed');
  console.log('Generated HTML length:', result2.html.length);
  console.log('Note: This request also hit the network (no cache)');
} catch (error) {
  console.error('✗ Second execution failed:', error.message);
}

// Third execution
console.log('\n--- Third execution (no cache hit) ---');
try {
  const result3 = await processor.process(markdown, 'direct-test-3');
  console.log('✓ Third execution completed');
  console.log('Generated HTML length:', result3.html.length);
  console.log('Note: Every request with directFetcher hits the network');
} catch (error) {
  console.error('✗ Third execution failed:', error.message);
}

console.log('\n=== Direct Fetcher Test Completed ===');
console.log('All requests were made directly to the network without caching.');
