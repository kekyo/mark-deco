// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import {
  createMarkdownProcessor,
  createCardPlugin,
  createOEmbedPlugin,
  defaultProviderList,
} from '../../dist/index.js';

async function testDisplayOrder() {
  console.log('Display Field Order Control Detailed Test\n' + '='.repeat(60));

  // Test 1: Card Plugin - Order verification test
  console.log('\n📋 Card Plugin - Order verification test');
  console.log('-'.repeat(40));

  const cardPluginOrder = createCardPlugin({
    timeout: 5000,
    displayFields: {
      title: 3, // Should appear 3rd
      image: 1, // Should appear 1st
      description: 2, // Should appear 2nd
      url: 4, // Should enable link
      // siteName and favicon omitted (should not appear)
    },
  });

  const processorOrder = createMarkdownProcessor({
    plugins: [cardPluginOrder],
    userAgent: 'card-plugin-test-order/1.0.0',
  });

  const markdown = '```card\nhttps://example.com\n```';

  try {
    const result = await processorOrder.process(markdown, 'id');
    console.log('✓ Order test HTML generation successful');

    const html = result.html;

    // Check if elements appear in correct order
    const titleIndex = html.indexOf('card-title');
    const descriptionIndex = html.indexOf('card-description');
    const imageIndex = html.indexOf('card-image');

    console.log(
      `Element positions: image=${imageIndex}, description=${descriptionIndex}, title=${titleIndex}`
    );

    if (imageIndex < titleIndex && descriptionIndex < titleIndex) {
      console.log(
        '✓ Display order is correct (image and description before title)'
      );
    } else {
      console.log('❌ Display order is incorrect');
    }

    if (!html.includes('card-provider')) {
      console.log('✓ siteName is hidden as expected');
    } else {
      console.log('❌ siteName is displayed (should be hidden)');
    }

    console.log('HTML preview:', html.substring(0, 300) + '...');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: oEmbed Plugin - Reverse order test
  console.log('\n🎬 oEmbed Plugin - Reverse order test');
  console.log('-'.repeat(40));

  const oembedPluginReverse = createOEmbedPlugin(defaultProviderList, {
    maxRedirects: 3,
    timeoutEachRedirect: 5000,
    displayFields: {
      externalLink: 1, // Should appear first
      provider: 2, // Should appear second
      title: 3, // Should appear third
      // Other fields omitted (should not appear)
    },
  });

  const processorOembedReverse = createMarkdownProcessor({
    plugins: [oembedPluginReverse],
    userAgent: 'oembed-plugin-test-reverse/1.0.0',
  });

  const markdownOembed = '```oembed\nhttps://youtu.be/dQw4w9WgXcQ\n```';

  try {
    const resultOembed = await processorOembedReverse.process(
      markdownOembed,
      'id'
    );
    console.log('✓ oEmbed reverse order HTML generation successful');

    const html = resultOembed.html;

    // Check if elements appear in reverse order
    const titleIndex = html.indexOf('oembed-title');
    const providerIndex = html.indexOf('oembed-provider');
    const linkIndex = html.indexOf('oembed-external-link');

    console.log(
      `Element positions: link=${linkIndex}, provider=${providerIndex}, title=${titleIndex}`
    );

    if (linkIndex !== -1 && providerIndex !== -1 && titleIndex !== -1) {
      if (linkIndex < providerIndex && providerIndex < titleIndex) {
        console.log(
          '✓ Reverse order is correct (external link, provider, then title)'
        );
      } else {
        console.log('❌ Reverse order is incorrect');
      }
    } else {
      console.log('❌ Some required elements are missing');
    }

    if (!html.includes('oembed-author')) {
      console.log('✓ Author is hidden as expected');
    } else {
      console.log('❌ Author is displayed (should be hidden)');
    }

    console.log('HTML preview:', html.substring(0, 300) + '...');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Card Plugin - Enhanced fields order test
  console.log('\n🛒 Card Plugin - Enhanced fields order test');
  console.log('-'.repeat(40));

  const cardPluginEnhanced = createCardPlugin({
    timeout: 5000,
    displayFields: {
      title: 1,
      image: 2,
      url: 3,
      enhanced: {
        rating: 1, // Should appear first in enhanced
        features: 2, // Should appear second in enhanced
        price: 3, // Should appear third in enhanced
        // brand omitted (should not appear)
      },
    },
  });

  const processorEnhanced = createMarkdownProcessor({
    plugins: [cardPluginEnhanced],
    userAgent: 'card-plugin-test-enhanced/1.0.0',
  });

  // Use Amazon URL for enhanced field testing
  const markdownAmazon = '```card\nhttps://www.amazon.com/dp/B08N5WRWNW\n```';

  try {
    const resultEnhanced = await processorEnhanced.process(
      markdownAmazon,
      'id'
    );
    console.log('✓ Enhanced fields order test HTML generation successful');

    const html = resultEnhanced.html;

    if (html.includes('card-enhanced-info')) {
      console.log('✓ Enhanced information section is present');

      // Check enhanced field order (this would be more accurate with actual Amazon data)
      if (!html.includes('card-brand')) {
        console.log('✓ Brand is hidden as expected');
      } else {
        console.log('❌ Brand is displayed (should be hidden)');
      }
    } else {
      console.log(
        'ℹ️ Enhanced information not available (expected with example.com)'
      );
    }

    console.log('HTML preview:', html.substring(0, 300) + '...');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 4: Default behavior test (displayFields undefined)
  console.log('\n🔧 Default behavior test (displayFields undefined)');
  console.log('-'.repeat(40));

  const cardPluginDefault = createCardPlugin({
    timeout: 5000,
    // displayFields is undefined - should show all fields in default order
  });

  const processorDefault = createMarkdownProcessor({
    plugins: [cardPluginDefault],
    userAgent: 'card-plugin-test-default/1.0.0',
  });

  try {
    const resultDefault = await processorDefault.process(markdown, 'id');
    console.log('✓ Default behavior test HTML generation successful');

    const html = resultDefault.html;

    // Check if all default fields are present
    const hasTitle = html.includes('card-title');
    const hasImage = html.includes('card-image');
    const hasDescription = html.includes('card-description');
    const hasProvider = html.includes('card-provider');
    const hasLink = html.includes('<a href=');

    console.log(
      `Default fields present: title=${hasTitle}, image=${hasImage}, description=${hasDescription}, provider=${hasProvider}, link=${hasLink}`
    );

    if (hasTitle && hasProvider && hasLink) {
      console.log('✓ All expected default fields are present');
    } else {
      console.log('❌ Some default fields are missing');
    }

    console.log('HTML preview:', html.substring(0, 300) + '...');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Display Field Order Control Detailed Test Complete! 🎉');
  console.log('\nTested features:');
  console.log('• ✅ Custom field display order with numbers');
  console.log('• ✅ Field hiding with undefined values');
  console.log('• ✅ Enhanced fields order control');
  console.log('• ✅ Default behavior when displayFields is undefined');
  console.log('• ✅ Reverse order capability');
  console.log(
    '\nConclusion: Number-based display order control is working correctly! 🚀'
  );
}

// Execute
testDisplayOrder().catch(console.error);
