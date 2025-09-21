import { createMarkdownProcessor, createOEmbedPlugin, createCachedFetcher, defaultProviderList } from '../dist/index.js';

// Create fetcher with user agent
const fetchData = createCachedFetcher({
  userAgent: 'markdown-basic-demo/1.0.0'
});

// Create oEmbed plugin
const oembedPlugin = createOEmbedPlugin(defaultProviderList);

// Create processor with plugins
const processor = createMarkdownProcessor({
  fetcher: fetchData,
  plugins: [oembedPlugin]
});

// Sample Markdown
const markdown = `---
title: Sample Article
author: John Doe
tags: [test, markdown, oembed]
published: true
---

# MarkDeco Test

This is a test for **MarkDeco**.

## Basic Markdown

- List item 1
- List item 2
- List item 3

\`\`\`javascript
console.log('Regular code block');
\`\`\`

## Custom Plugin Tests

### oEmbed Plugin

\`\`\`oembed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
\`\`\`

## End

This completes the test.`;

// Execute processing
async function main() {
  try {
    console.log('🚀 Starting MarkDeco test...\n');
    
    const result = await processor.process(markdown, "demo", {
      // No longer has timeout option directly, can use AbortSignal if needed
    });

    console.log('📝 Frontmatter:');
    console.log(JSON.stringify(result.frontmatter, null, 2));
    console.log('\n');

    console.log('🎨 Generated HTML:');
    console.log('='.repeat(50));
    console.log(result.html);
    console.log('='.repeat(50));

    console.log('\n📖 Heading Tree:');
    console.log(JSON.stringify(result.headingTree, null, 2));

    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ An error occurred:', error.message);
  }
}

main(); 