---
title: "Multiple oEmbed Blocks Test"
description: "Testing multiple oEmbed blocks in single document"
author: "Test Suite"
tags: ["oembed", "multiple", "video", "photo", "mixed"]
---

# Multiple oEmbed Blocks Test

This test validates multiple oEmbed blocks processing within a single document.

## Video Content

```oembed
http://localhost:{{PORT}}/content/video/multiple-1
```

## Photo Content

```oembed
http://localhost:{{PORT}}/content/photo/multiple-2
```

## Another Video

```oembed
http://localhost:{{PORT}}/content/video/multiple-3
```

## Expected Result

Should generate multiple containers:
- Three distinct `oembed-container` elements
- Mixed content types (video and photo)
- All content properly processed
- No interference between blocks
- Proper sequential rendering 