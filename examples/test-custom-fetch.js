import { createMarkdownProcessor, createOEmbedPlugin, createCachedFetcher, createMemoryCacheStorage, defaultProviderList } from './dist/index.js';

// Custom fetch function (logs calls)
const customFetch = async (url, options) => {
  console.log(`[Custom Fetch] Calling: ${url}`);
  console.log(`[Custom Fetch] Headers:`, options?.headers);
  
  // Call actual fetch
  const response = await fetch(url, options);
  console.log(`[Custom Fetch] Response status: ${response.status}`);
  return response;
};

// Create cached fetcher (shorter cache period when using custom fetch)
const cacheStorage = createMemoryCacheStorage();
const cachedFetcher = createCachedFetcher(
  'test-custom-fetch/1.0',
  10000, // 10 second timeout
  cacheStorage, // 3rd parameter: cacheStorage
  { 
    cache: true,
    cacheTTL: 10 * 60 * 1000 // 10 minute cache (set shorter for demo)
  }
);

// Create oEmbed plugin
const plugin = createOEmbedPlugin(defaultProviderList);

const processor = createMarkdownProcessor({
  plugins: [plugin],
  fetcher: cachedFetcher
  // userAgent is now extracted from cachedFetcher
});

// Test Markdown
const markdown = `
# Custom Fetch Test

\`\`\`oembed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
\`\`\`
`;

// Execute processing
console.log('=== OEmbed Plugin Test Using Custom Fetch Function ===');
try {
  const result = await processor.process(markdown, "id");
  console.log('\n=== Processing Complete ===');
  console.log('HTML length:', result.html.length);
  console.log('HTML preview:', result.html.substring(0, 200) + '...');
} catch (error) {
  console.error('Error:', error.message);
} 