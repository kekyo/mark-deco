// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { createMarkdownProcessor, createCardPlugin } from '../../dist/index.js';

async function testInvalidURL() {
  console.log('🧪 Testing Invalid URL Handling\n' + '='.repeat(50));

  const cardPlugin = createCardPlugin({
    timeout: 5000,
  });

  const processor = createMarkdownProcessor({
    userAgent: 'card-plugin-invalid-url-test/1.0.0',
    plugins: [cardPlugin],
  });

  // Test with invalid URL
  const testMarkdown = `# Error Handling Test

## Valid URL
\`\`\`card
https://example.com
\`\`\`

## Invalid URL (should cause error)
\`\`\`card
invalid-url-test
\`\`\`
`;

  try {
    console.log('Processing markdown with invalid URL...\n');
    const result = await processor.process(testMarkdown, 'id');
    console.log('⚠️ Unexpected success - this should have failed');
    console.log(result.html.substring(0, 200));
  } catch (error) {
    console.log('✅ Expected error caught:', error.message);
    console.log(
      '\nThis demonstrates why invalid URLs were removed from the demo.'
    );
    console.log(
      "The processor stops at the first invalid URL and doesn't process the rest."
    );
  }

  console.log('\n' + '='.repeat(50));
  console.log('Now testing with only valid URLs...\n');

  const validMarkdown = `# Valid URLs Only

## Example.com
\`\`\`card
https://example.com
\`\`\`

## GitHub
\`\`\`card
https://github.com/microsoft/vscode
\`\`\`
`;

  try {
    const result = await processor.process(validMarkdown, 'id');
    console.log('✅ Processing successful with valid URLs');
    console.log(
      `Generated ${(result.html.match(/card-container/g) || []).length} cards`
    );

    if (result.html.includes('card-fallback')) {
      console.log('⚠️  Some cards used fallback (due to CORS or other issues)');
    } else {
      console.log('🎉 All cards processed successfully');
    }
  } catch (error) {
    console.log('❌ Unexpected error with valid URLs:', error.message);
  }
}

testInvalidURL().catch(console.error);
