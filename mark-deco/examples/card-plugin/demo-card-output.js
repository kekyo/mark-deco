// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { createMarkdownProcessor, createCardPlugin } from '../../dist/index.js';

async function demonstrateCardPlugin() {
  console.log('🎯 Card Plugin Demonstration\n' + '='.repeat(60));

  const cardPlugin = createCardPlugin({
    timeout: 10000,
  });

  const processor = createMarkdownProcessor({
    userAgent: 'card-plugin-output/1.0.0',
    plugins: [cardPlugin],
  });

  // Test case with card examples
  const cardMarkdown = `# Card Plugin Examples

## GitHub Repository

\`\`\`card
https://github.com/microsoft/vscode
\`\`\`

## Example.com (Basic HTML)

\`\`\`card
https://example.com
\`\`\`
`;

  try {
    console.log('Processing markdown with card plugin...\n');
    const result = await processor.process(cardMarkdown, 'id');

    console.log('✅ Processing completed successfully!\n');
    console.log('📋 Generated HTML (first 500 characters):\n');
    console.log(result.html.substring(0, 500) + '...\n');

    // Check for card-specific classes
    const cardClasses = [
      'card-container',
      'card-link',
      'card-body',
      'card-title',
      'card-provider',
    ];

    console.log('🔍 Card plugin detection:\n');
    cardClasses.forEach((className) => {
      if (result.html.includes(className)) {
        console.log(`  ✓ ${className} found`);
      } else {
        console.log(`  ✗ ${className} not found`);
      }
    });

    // Count card instances
    const cardCount = (result.html.match(/card-container/g) || []).length;
    console.log(`\n📊 Total cards generated: ${cardCount}`);

    // Check for successful vs fallback cards
    const successCards = (
      result.html.match(/card-container(?!.*card-fallback)/g) || []
    ).length;
    const fallbackCards = (
      result.html.match(/card-container card-fallback/g) || []
    ).length;

    console.log(`  • Successful cards: ${successCards}`);
    console.log(`  • Fallback cards: ${fallbackCards}`);

    if (result.html.includes('card-image')) {
      console.log('  • 🖼️  Images detected in cards');
    }

    if (result.html.includes('card-description')) {
      console.log('  • 📝 Descriptions detected in cards');
    }
  } catch (error) {
    console.error('❌ Error during processing:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Demo completed! The card plugin is working! 🎉');
  console.log('\nTo see the demo in a browser:');
  console.log('1. http://localhost:8080 (if demo server is running)');
  console.log('2. Open demo-pages/dist/index.html in a browser');
}

demonstrateCardPlugin().catch(console.error);
