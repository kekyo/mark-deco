---
title: "Card Plugin Test"
author: "Test Suite"
date: 2024-01-03
tags: ["card", "plugin", "test"]
category: "plugin-testing"
published: true
---

# Card Plugin Test

This file tests the Card plugin functionality using a local test server.

## Overview

The Card plugin extracts Open Graph Protocol (OGP) metadata from web pages and displays them as cards. This test uses a local HTTP server to provide consistent, predictable content for testing.

## Test Cases

### Photo/Image Content

```card
http://localhost:12345/photo
```

This should display a card with:
- Title: "Beautiful Nature Photo" 
- Description: "A stunning landscape photograph showcasing the beauty of nature"
- Image: placeholder image reference
- Type: website

### Article Content

```card
http://localhost:12345/article
```

This should display a card with:
- Title: "JavaScript Best Practices"
- Description: "Learn the essential JavaScript best practices for writing clean, maintainable code"
- Additional metadata: author, published date, tags
- Type: article

### Product Content

```card
http://localhost:12345/product
```

This should display a card with:
- Title: "Awesome Product - Only $99"
- Description: "The best product you'll ever buy! High quality, affordable price."
- Price information: $99 USD
- Availability: In Stock
- Type: product

### Video Content

```card
http://localhost:12345/video
```

This should display a card with:
- Title: "Tutorial: Learn Node.js"
- Description: "Complete Node.js tutorial for beginners - 2 hours of content"
- Video metadata: duration, release date
- Type: video

### Fallback Content (No OGP)

```card
http://localhost:12345/no-ogp
```

This should display a fallback card with:
- Title extracted from `<title>` tag: "Simple Page Without OGP"
- Description from meta description
- No image
- Generic link display

### Error Handling

```card
http://localhost:12345/non-existent
```

This should display an error fallback card for 404 responses.

## Expected Behavior

1. **Rich OGP Content**: Pages with complete OGP metadata should display rich cards with titles, descriptions, images, and type-specific information.

2. **Graceful Degradation**: Pages without OGP metadata should fall back to extracting basic information from standard HTML tags.

3. **Error Handling**: Invalid URLs or server errors should display user-friendly fallback content.

4. **Consistent Styling**: All cards should use consistent CSS classes and styling.

## Technical Details

- Test server runs on `http://localhost:12345`
- Server provides various content types with different OGP metadata
- All responses include CORS headers for cross-origin testing
- Content is static and predictable for snapshot testing

This test ensures the Card plugin correctly handles various OGP scenarios and edge cases in a controlled environment. 