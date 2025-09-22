import {
  createMarkdownProcessor,
  createOEmbedPlugin,
  defaultProviderList,
} from '../dist/index.js';

// Example 1: Default user agent
console.log('=== Default User Agent Example ===');
const defaultPlugin = createOEmbedPlugin(defaultProviderList);
const defaultProcessor = createMarkdownProcessor({
  userAgent: 'mark-deco/1.0.0',
  plugins: [defaultPlugin],
});

// Example 2: Custom user agent
console.log('=== Custom User Agent Example ===');
const customPlugin = createOEmbedPlugin(defaultProviderList);
const customProcessor = createMarkdownProcessor({
  plugins: [customPlugin],
  userAgent: 'MyBot/2.0 (https://example.com)',
});

// Example 3: Enterprise user agent
console.log('=== Enterprise User Agent Example ===');
const enterprisePlugin = createOEmbedPlugin(defaultProviderList);
const enterpriseProcessor = createMarkdownProcessor({
  plugins: [enterprisePlugin],
  userAgent: 'AcmeCorp-ContentProcessor/1.5.0 (+https://acme.com/bot-info)',
});

// Test Markdown content
const markdown = `
# User Agent Configuration Test

## YouTube Video Embedding

\`\`\`oembed
https://youtu.be/dQw4w9WgXcQ
\`\`\`

## Flickr Photo Embedding

\`\`\`oembed
https://flickr.com/photos/bees/2362225867/
\`\`\`
`;

async function demonstrateUserAgentSettings() {
  try {
    console.log('\n1. Processing with default user agent:');
    console.log('   User-Agent: mark-deco/1.0.0');
    const result1 = await defaultProcessor.process(markdown, 'id');
    console.log('   Processing complete ✓');

    console.log('\n2. Processing with custom user agent:');
    console.log('   User-Agent: MyBot/2.0 (https://example.com)');
    const result2 = await customProcessor.process(markdown, 'id');
    console.log('   Processing complete ✓');

    console.log('\n3. Processing with enterprise user agent:');
    console.log(
      '   User-Agent: AcmeCorp-ContentProcessor/1.5.0 (+https://acme.com/bot-info)'
    );
    const result3 = await enterpriseProcessor.process(markdown, 'id');
    console.log('   Processing complete ✓');

    console.log('\n=== Processing Results Comparison ===');
    console.log('All configurations generate the same HTML output:');
    console.log(
      '- Default configuration result:',
      result1.html.length,
      'characters'
    );
    console.log(
      '- Custom configuration result:',
      result2.html.length,
      'characters'
    );
    console.log(
      '- Enterprise configuration result:',
      result3.html.length,
      'characters'
    );

    // Notes for when actual HTTP requests occur
    console.log('\n=== Important Notes ===');
    console.log(
      'In actual external API requests, user agent is used in the following scenarios:'
    );
    console.log(
      '1. Fetching oEmbed provider information (oembed.com/providers.json)'
    );
    console.log('2. Resolving URL redirects');
    console.log('3. Requests to oEmbed endpoints');
    console.log('4. Fetching HTML pages for oEmbed discovery');
    console.log('\nIn test environment, these requests are mocked, so');
    console.log('actual network requests do not occur.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Execute
demonstrateUserAgentSettings();
