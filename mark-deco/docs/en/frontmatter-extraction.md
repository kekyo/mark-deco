## Frontmatter Information Extraction

MarkDeco automatically parses "YAML frontmatter" at the beginning of Markdown files and provides it as processing results. Frontmatter is used to describe article metadata (title, author, tags, publication date, etc.).

```typescript
const markdown = `---
title: "Sample Article"
author: "John Doe"
date: "2024-01-15"
tags:
  - markdown
  - processor
published: true
---

# Article Content

This article discusses...`;

const result = await processor.process(markdown, "id");

// Access frontmatter data
console.log(result.frontmatter.title);     // "Sample Article"
console.log(result.frontmatter.author);    // "John Doe"
console.log(result.frontmatter.date);      // Date object: 2024-01-15T00:00:00.000Z
console.log(result.frontmatter.tags);      // ["markdown", "processor"]
console.log(result.frontmatter.published); // true

// Generated HTML doesn't include frontmatter
console.log(result.html); // "<h1 id="id-1">Article Content</h1>..."
```

Frontmatter data can be utilized for:

* Blog article metadata management
* Template engine integration
* Article search and filtering
* SEO information extraction
* Custom rendering logic control

Note: The MarkDeco processor itself doesn't use frontmatter information. Plugins may use this information depending on their implementation.
