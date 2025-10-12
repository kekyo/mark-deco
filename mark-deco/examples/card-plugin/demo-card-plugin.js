// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { createMarkdownProcessor, createCardPlugin } from '../../dist/index.js';

async function demo() {
  console.log('Card Plugin Demo\n' + '='.repeat(50));

  // Create markdown processor with card plugin
  const cardPlugin = createCardPlugin({
    timeout: 10000,
  });

  const processor = createMarkdownProcessor({
    userAgent: 'card-plugin-basic/1.0.0',
    plugins: [cardPlugin],
  });

  // Test cases
  const testCases = [
    {
      name: 'Example.com (OGP metadata)',
      markdown: '```card\nhttps://example.com\n```',
    },
    {
      name: 'GitHub Repository (Rich OGP)',
      markdown: '```card\nhttps://github.com/microsoft/vscode\n```',
    },
    {
      name: 'Invalid URL (Error handling)',
      markdown: '```card\ninvalid-url\n```',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log('-'.repeat(40));

    try {
      const result = await processor.process(testCase.markdown, 'id');
      console.log('Success! Generated HTML:');
      console.log(result.html.substring(0, 200) + '...');

      // Check for expected patterns
      if (result.html.includes('card-container')) {
        console.log('✓ Card container found');
      }
      if (result.html.includes('card-title')) {
        console.log('✓ Card title found');
      }
      if (result.html.includes('card-provider')) {
        console.log('✓ Card provider found');
      }
    } catch (error) {
      console.log('Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Demo completed successfully!');
}

demo().catch(console.error);
