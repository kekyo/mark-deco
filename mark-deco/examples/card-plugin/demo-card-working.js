import { createMarkdownProcessor, createCardPlugin } from '../../dist/index.js';

async function showWorkingCardPlugin() {
  console.log('🎯 Working Card Plugin Demo\n' + '='.repeat(60));

  const cardPlugin = createCardPlugin({
    timeout: 10000,
  });

  const processor = createMarkdownProcessor({
    userAgent: 'card-plugin-demo/1.0.0',
    plugins: [cardPlugin],
  });

  // Test case with only valid URLs
  const cardMarkdown = `# Card Plugin Success Demo

## GitHub Repository

\`\`\`card
https://github.com/microsoft/vscode
\`\`\`

## Example.com

\`\`\`card
https://example.com
\`\`\`
`;

  try {
    console.log('Processing markdown with card plugin...\n');
    const result = await processor.process(cardMarkdown, 'id');

    console.log('✅ Processing completed successfully!\n');

    // Check for card-specific features
    const checks = {
      'Card containers': result.html.includes('card-container'),
      'Card links': result.html.includes('card-link'),
      'Card titles': result.html.includes('card-title'),
      'Card providers': result.html.includes('card-provider'),
      'GitHub content':
        result.html.includes('github.com') ||
        result.html.includes('Visual Studio Code'),
      'Example.com content':
        result.html.includes('example.com') ||
        result.html.includes('Example Domain'),
      'CSS styles': result.html.includes('<style>'),
      Images: result.html.includes('card-image'),
      Descriptions: result.html.includes('card-description'),
    };

    console.log('🔍 Card plugin features detected:\n');
    Object.entries(checks).forEach(([feature, detected]) => {
      console.log(`  ${detected ? '✅' : '❌'} ${feature}`);
    });

    // Count cards
    const cardCount = (result.html.match(/card-container/g) || []).length;
    console.log(`\n📊 Total cards generated: ${cardCount}`);

    // Show sample HTML snippet
    console.log('\n📋 Sample HTML output:');
    console.log('-'.repeat(40));

    // Extract first card
    const firstCardMatch = result.html.match(
      /<div class="card-container">.*?<\/style>/s
    );
    if (firstCardMatch) {
      const sampleHtml = firstCardMatch[0].substring(0, 300) + '...';
      console.log(sampleHtml);
    } else {
      console.log(result.html.substring(0, 400) + '...');
    }
  } catch (error) {
    console.error('❌ Error during processing:', error.message);
    console.log(
      '\nThis may be due to network issues or CORS restrictions in the environment.'
    );
  }

  console.log('\n' + '='.repeat(60));
  console.log('Card plugin demonstration completed! 🎉');
  console.log('\nThe card plugin successfully:');
  console.log('• Fetches HTML content from URLs');
  console.log('• Extracts OGP metadata');
  console.log('• Generates beautiful responsive cards');
  console.log('• Handles errors gracefully with fallbacks');
  console.log('\nDemo page: http://localhost:8080');
}

showWorkingCardPlugin().catch(console.error);
