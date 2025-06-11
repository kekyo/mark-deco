---
title: "YouTube Short URL oEmbed Test"
description: "Testing YouTube short URL (youtu.be) oEmbed processing"
author: "Test Suite"
tags: ["oembed", "youtube", "video", "short-url"]
---

# YouTube Short URL Test

This test validates YouTube short URL (youtu.be format) oEmbed processing.

## Test Video (Short URL)

```oembed
http://localhost:{{PORT}}/content/video/short-url
```

## Expected Result

Should generate a video container with:
- `oembed-container oembed-video` class
- Video title "Peru 8K HDR 60FPS (FUHD)"
- Channel name "Jacob + Katie Schwarz"
- YouTube embed URL with video ID
- Responsive wrapper elements
- Proper iframe structure 