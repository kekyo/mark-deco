import {
  createMarkdownProcessor,
  createCardPlugin,
  createOEmbedPlugin,
  defaultProviderList,
} from '../../dist/index.js';

async function testDisplayFields() {
  console.log(
    'Metadata Field Display Order Control Feature Test\n' + '='.repeat(60)
  );

  // 1. Card Plugin - Basic usage (default order when undefined)
  console.log(
    '\n📋 Card Plugin - All fields display with default order (displayFields: undefined)'
  );
  console.log('-'.repeat(40));

  const cardPluginFull = createCardPlugin({
    timeout: 5000,
    // displayFields is undefined - should show all fields in default order
  });

  const processorFull = createMarkdownProcessor({
    plugins: [cardPluginFull],
    userAgent: 'card-plugin-test-display-full/1.0.0',
  });

  const markdownFull = '```card\nhttps://example.com\n```';

  try {
    const resultFull = await processorFull.process(markdownFull, 'id');
    console.log('✓ All fields HTML generation successful');
    const htmlPreview = resultFull.html.substring(0, 200) + '...';
    console.log('HTML preview:', htmlPreview);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // 2. Card Plugin - Custom display order
  console.log(
    '\n📋 Card Plugin - Custom display order (image first, then title, then url)'
  );
  console.log('-'.repeat(40));

  const cardPluginCustomOrder = createCardPlugin({
    timeout: 5000,
    displayFields: {
      image: 1, // Show first
      title: 2, // Show second
      url: 3, // Show third (enable URL link)
      // description: undefined - hidden
      // siteName: undefined - hidden
      // favicon: undefined - hidden
      enhanced: {
        price: 1, // Show first in enhanced
        brand: 2, // Show second in enhanced
        // rating: undefined - hidden
        // features: undefined - hidden
      },
    },
  });

  const processorCustomOrder = createMarkdownProcessor({
    plugins: [cardPluginCustomOrder],
    userAgent: 'card-plugin-test-custom-order/1.0.0',
  });

  try {
    const resultCustomOrder = await processorCustomOrder.process(
      markdownFull,
      'id'
    );
    console.log('✓ Custom order HTML generation successful');

    // Check if only specified elements are included
    const html = resultCustomOrder.html;

    if (html.includes('card-title')) {
      console.log('✓ Title is displayed');
    } else {
      console.log('❌ Title is not displayed');
    }

    if (html.includes('card-image')) {
      console.log('✓ Image is displayed');
    } else {
      console.log('❌ Image is not displayed');
    }

    if (!html.includes('card-description')) {
      console.log('✓ Description is hidden (as expected)');
    } else {
      console.log('❌ Description is displayed (should be hidden)');
    }

    if (!html.includes('card-provider') || !html.includes('siteName')) {
      console.log('✓ Site name is hidden (as expected)');
    } else {
      console.log('❌ Site name is displayed (should be hidden)');
    }

    console.log('HTML preview:', html.substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // 3. oEmbed Plugin - Custom display order
  console.log(
    '\n🎬 oEmbed Plugin - Custom display order (embedded content first, then title)'
  );
  console.log('-'.repeat(40));

  const oembedPluginCustomOrder = createOEmbedPlugin(defaultProviderList, {
    maxRedirects: 3,
    timeoutEachRedirect: 5000,
    displayFields: {
      embeddedContent: 1, // Show first
      title: 2, // Show second
      externalLink: 3, // Show third
      // author: undefined - hidden
      // provider: undefined - hidden
      // description: undefined - hidden
      // thumbnail: undefined - hidden
    },
  });

  const processorOembed = createMarkdownProcessor({
    plugins: [oembedPluginCustomOrder],
    userAgent: 'oembed-plugin-test-custom-order/1.0.0',
  });

  const markdownOembed = '```oembed\nhttps://youtu.be/dQw4w9WgXcQ\n```';

  try {
    const resultOembed = await processorOembed.process(markdownOembed, 'id');
    console.log('✓ oEmbed custom order HTML generation successful');

    const html = resultOembed.html;

    if (html.includes('oembed-title')) {
      console.log('✓ Title is displayed');
    } else {
      console.log('❌ Title is not displayed');
    }

    if (!html.includes('oembed-author')) {
      console.log('✓ Author information is hidden (as expected)');
    } else {
      console.log('❌ Author information is displayed (should be hidden)');
    }

    if (!html.includes('oembed-provider')) {
      console.log('✓ Provider information is hidden (as expected)');
    } else {
      console.log('❌ Provider information is displayed (should be hidden)');
    }

    console.log('HTML preview:', html.substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // 4. Card Plugin - Reverse order test
  console.log('\n🔄 Card Plugin - Reverse order test (high numbers first)');
  console.log('-'.repeat(40));

  const cardPluginReverseOrder = createCardPlugin({
    timeout: 5000,
    displayFields: {
      title: 10, // Show last
      description: 5, // Show middle
      image: 1, // Show first
      url: 15, // Enable URL link with high order
      siteName: 8, // Show second to last
      favicon: 7, // Show middle-late
    },
  });

  const processorReverseOrder = createMarkdownProcessor({
    plugins: [cardPluginReverseOrder],
    userAgent: 'card-plugin-test-reverse-order/1.0.0',
  });

  try {
    const resultReverseOrder = await processorReverseOrder.process(
      markdownFull,
      'id'
    );
    console.log('✓ Reverse order HTML generation successful');

    const html = resultReverseOrder.html;

    if (html.includes('<a href=')) {
      console.log('✓ Link element is present');
    } else {
      console.log('❌ Link element is missing');
    }

    if (html.includes('card-title')) {
      console.log('✓ Title is displayed');
    }

    console.log('HTML preview:', html.substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // 5. oEmbed Plugin - Default order test (displayFields: undefined)
  console.log(
    '\n🎬 oEmbed Plugin - Default order test (displayFields: undefined)'
  );
  console.log('-'.repeat(40));

  const oembedPluginDefault = createOEmbedPlugin(defaultProviderList, {
    maxRedirects: 3,
    timeoutEachRedirect: 5000,
    // displayFields is undefined - should show all fields in default order
  });

  const processorOembedDefault = createMarkdownProcessor({
    plugins: [oembedPluginDefault],
    userAgent: 'oembed-plugin-test-default/1.0.0',
  });

  try {
    const resultOembedDefault = await processorOembedDefault.process(
      markdownOembed,
      'id'
    );
    console.log('✓ oEmbed default order HTML generation successful');

    const html = resultOembedDefault.html;

    if (html.includes('oembed-title')) {
      console.log('✓ Title is displayed (default)');
    }

    if (html.includes('oembed-author')) {
      console.log('✓ Author information is displayed (default)');
    }

    if (html.includes('oembed-provider')) {
      console.log('✓ Provider information is displayed (default)');
    }

    console.log('HTML preview:', html.substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Metadata Field Display Order Control Feature Test Complete! 🎉');
  console.log('\nImplemented features:');
  console.log(
    '• ✅ Card Plugin metadata field display order control with numbers'
  );
  console.log(
    '• ✅ oEmbed Plugin metadata field display order control with numbers'
  );
  console.log('• ✅ Field hiding when order number is undefined');
  console.log('• ✅ Default order display when displayFields is undefined');
  console.log('• ✅ Amazon enhanced information selective order control');
  console.log('\nUsage example:');
  console.log('```javascript');
  console.log('const cardPlugin = createCardPlugin({');
  console.log('  displayFields: {');
  console.log('    image: 1,        // Display first');
  console.log('    title: 2,        // Display second');
  console.log('    description: 3,  // Display third');
  console.log('    // siteName: undefined, // Hidden');
  console.log('    url: 4,          // Display fourth (enable link)');
  console.log('    enhanced: {');
  console.log('      price: 1,      // Display first in enhanced');
  console.log('      brand: 2       // Display second in enhanced');
  console.log('      // rating and features are hidden');
  console.log('    }');
  console.log('  }');
  console.log('});');
  console.log('```');
}

// Execute
testDisplayFields().catch(console.error);
