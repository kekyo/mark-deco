import { createMarkdownProcessor, createOEmbedPlugin, createCachedFetcher, defaultProviderList } from '../dist/index.js';

// Create fetcher with user agent
const fetchData = createCachedFetcher({
  userAgent: 'oembed-basic-demo/1.0.0'
});

// Create oEmbed plugin
const oembedPlugin = createOEmbedPlugin(defaultProviderList);
const processor = createMarkdownProcessor({
  fetcher: fetchData,
  plugins: [oembedPlugin]
});

// Test Markdown content
const markdown = `# oEmbed Plugin Test

## YouTube Video Embed

\`\`\`oembed
https://youtu.be/1La4QzGeaaQ
\`\`\`

## Flickr Photo Embed

\`\`\`oembed
https://flickr.com/photos/bees/2362225867/
\`\`\`

## Regular Markdown

This is regular Markdown text.

- List item 1
- List item 2

\`\`\`javascript
// Regular code block
console.log('Hello World');
\`\`\`
`;

async function main() {
  try {
    console.log('Starting oEmbed plugin test...\n');
    
    const result = await processor.process(markdown, "demo");
    
    console.log('=== Generated HTML ===');
    console.log(result.html);
    
    console.log('\n=== Frontmatter ===');
    console.log(result.frontmatter);
    
    console.log('\n=== Heading Tree ===');
    console.log(JSON.stringify(result.headingTree, null, 2));
    
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main(); 