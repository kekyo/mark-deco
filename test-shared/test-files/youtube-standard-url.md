---
title: "YouTube Standard URL oEmbed Test"
description: "Testing YouTube standard URL oEmbed processing"
author: "Test Suite"
tags: ["oembed", "youtube", "video", "standard-url"]
---

# YouTube Standard URL Test

This test validates YouTube standard URL oEmbed processing.

## Test Video (Standard URL)

```oembed
http://localhost:{{PORT}}/content/video/standard-url
```

## Expected Result

Should generate a video container with:
- `oembed-container oembed-video` class
- Video title "Peru 8K HDR 60FPS (FUHD)"
- Channel name "Jacob + Katie Schwarz"
- YouTube embed URL with video ID
- Responsive wrapper elements
- Proper iframe structure 