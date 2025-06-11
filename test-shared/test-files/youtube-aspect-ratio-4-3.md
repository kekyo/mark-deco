---
title: "YouTube 4:3 Aspect Ratio oEmbed Test"
description: "Testing YouTube video with 4:3 aspect ratio oEmbed processing"
author: "Test Suite"
tags: ["oembed", "youtube", "video", "aspect-ratio", "4:3"]
---

# YouTube 4:3 Aspect Ratio Test

This test validates YouTube video with 4:3 aspect ratio oEmbed processing.

## Test Video (4:3 Aspect Ratio)

```oembed
http://localhost:{{PORT}}/content/video/aspect-ratio-4-3
```

## Expected Result

Should generate a video container with 4:3 aspect ratio:
- `oembed-container oembed-video` class
- Video title with proper aspect ratio handling
- Dimensions reflecting 4:3 ratio (e.g., 400x300)
- Responsive wrapper maintaining aspect ratio
- Proper iframe structure with correct dimensions 