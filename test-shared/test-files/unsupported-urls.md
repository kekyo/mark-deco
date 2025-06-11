---
title: "Unsupported URLs Fallback Test"
description: "Testing fallback behavior for unsupported oEmbed URLs"
author: "Test Suite"
tags: ["oembed", "fallback", "error-handling", "unsupported"]
---

# Unsupported URL Fallback Test

This test validates proper fallback behavior when oEmbed providers don't support a URL.

## Unsupported URL

```oembed
http://localhost:{{PORT}}/unsupported/content-example
```

## Expected Result

Should gracefully handle unsupported URLs:
- Generate `oembed-container oembed-fallback` class
- Include original URL in output
- Show appropriate fallback message
- Contain "View content on localhost" text
- No errors or crashes during processing 