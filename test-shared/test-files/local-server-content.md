---
title: "Local Test Server Content Test"
description: "Testing local test server content oEmbed processing"
author: "Test Suite"
tags: ["oembed", "local", "test-server", "integration"]
---

# Local Test Server Test

This markdown tests local server content processing.

## Local Video Content

```oembed
http://localhost:12345/content/video-1
```

## Local Photo Content

```oembed
http://localhost:12345/content/photo-1
```

## End

All local content should be processed correctly.

## Expected Results

Should process local test server content:
- One video container with "Test Video" title
- One photo container with "Test Photo" title  
- Test authors: "Test Author" and "Test Photographer"
- Proper local server URLs
- JSON-based test data responses 