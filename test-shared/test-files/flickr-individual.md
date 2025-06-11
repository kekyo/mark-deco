---
title: "Flickr Individual Photo oEmbed Test"
description: "Testing Flickr individual photo oEmbed processing"
author: "Test Suite"
tags: ["oembed", "flickr", "photo", "individual"]
---

# Flickr Individual Photo Test

This test validates Flickr individual photo oEmbed processing.

## Test Photo

```oembed
http://localhost:{{PORT}}/content/photo/individual
```

## Expected Result

Should generate a photo container with:
- `oembed-container oembed-photo` class
- Photo title and author information
- High-resolution image display
- Responsive image wrapper
- Proper photo metadata 