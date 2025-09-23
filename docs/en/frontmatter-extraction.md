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

const result = await processor.process(markdown, 'id');

// Access frontmatter data
console.log(result.frontmatter.title); // "Sample Article"
console.log(result.frontmatter.author); // "John Doe"
console.log(result.frontmatter.date); // "2024-01-15"
console.log(result.frontmatter.tags); // ["markdown", "processor"]
console.log(result.frontmatter.published); // true

// Generated HTML doesn't include frontmatter
console.log(result.html); // "<h1 id="id-1">Article Content</h1>..."
```

Frontmatter data can be utilized for:

- Blog article metadata management
- Template engine integration
- Article search and filtering
- SEO information extraction
- Custom rendering logic control

Note: The MarkDeco processor itself doesn't use frontmatter information. Plugins may use this information depending on their implementation. Frontmatter scalars are parsed with the JSON schema, so you receive JSON-compatible types (`null`, `true`/`false`, numbers, strings).

### Updating Frontmatter During Processing

When you need to tweak metadata before rendering, use `processor.processWithFrontmatterTransform`. Pass the transform callback as the third argument; it receives the parsed frontmatter (by reference) and the Markdown body without the frontmatter block. Return the same frontmatter object to mark the metadata as unchanged, a new object with any modifications to continue rendering, or `undefined` to cancel processing altogether.

```typescript
const result = await processor.processWithFrontmatterTransform(
  markdown,
  'id',
  ({ originalFrontmatter }) => {
    if (!originalFrontmatter || originalFrontmatter.status !== 'draft') {
      // Cancel processing (skip Markdown -> HTML) when not a draft.
      return undefined;
    }

    return {
      ...originalFrontmatter,
      status: 'published',
      updatedAt: new Date().toISOString(),
    };
  }
);

if (!result) {
  // The transform returned undefined, so no HTML was generated.
  return;
}

if (result.changed) {
  const updatedMarkdown = result.composeMarkdown();
  // Persist the updated markdown string when metadata changed.
}
```

Need to tweak rendering flags as well? Pass regular `ProcessOptions` as the optional fourth argument.

`ProcessResult.changed` reports whether the transform altered the metadata. When changes occurred, `composeMarkdown()` returns a Markdown string whose frontmatter reflects the final state; otherwise it returns the original input untouched, allowing you to skip unnecessary writes.
